<?php
/**
 * Agile Business — PHP API v1.0
 * Drop-in replacement for Node.js server.js on REG.RU shared hosting
 */

// Cross-subdomain session cookie (admin.agile-business-pro.com ↔ agile-business-pro.com)
session_set_cookie_params([
    'lifetime' => 86400 * 7,
    'path' => '/',
    'domain' => '.agile-business-pro.com',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None',
]);
session_start();
header('Content-Type: application/json; charset=utf-8');

// Load .env — try current dir first, then parent (if api.php is in /api/ subdir)
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    $envFile = dirname(__DIR__) . '/.env';
}
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($val);
        }
    }
}

$DB_HOST = $_ENV['DB_HOST'] ?? 'localhost';
$DB_PORT = $_ENV['DB_PORT'] ?? '3306';
$DB_USER = $_ENV['DB_USER'] ?? '';
$DB_PASS = $_ENV['DB_PASSWORD'] ?? '';
$DB_NAME = $_ENV['DB_NAME'] ?? '';
$ADMIN_PASSWORD = $_ENV['ADMIN_PASSWORD'] ?? 'admin123';

// --- Database connection ---
$pdo = null;
try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER, $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    // DB not available - will return errors for DB-dependent routes
}

// --- Routing ---
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
// Remove query string
$path = parse_url($uri, PHP_URL_PATH);
// Remove /api.php or /api/index.php prefix if accessed directly
$path = preg_replace('#^/api\.php#', '', $path);
$path = preg_replace('#^/api/index\.php#', '', $path);
// Ensure /api prefix for route matching
if (strpos($path, '/api') !== 0) {
    $path = '/api' . $path;
}
// Normalize
$path = rtrim($path, '/');

// Parse JSON body for POST/PUT
$body = [];
if (in_array($method, ['POST', 'PUT'])) {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true) ?: [];
    } elseif (strpos($contentType, 'multipart/form-data') !== false) {
        $body = $_POST;
    } else {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true) ?: [];
    }
}

// CORS for admin subdomain
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ['https://admin.agile-business-pro.com', 'https://agile-business-pro.com'])) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// Helper
function json_out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAdmin() {
    if (empty($_SESSION['isAdmin'])) {
        json_out(['error' => 'Unauthorized'], 401);
    }
}

function requireDb() {
    global $pdo;
    if (!$pdo) json_out(['error' => 'Database not available'], 503);
}

function query($sql, $params = []) {
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function fetchAll($sql, $params = []) {
    return query($sql, $params)->fetchAll();
}

function fetchOne($sql, $params = []) {
    return query($sql, $params)->fetch() ?: null;
}

function getSetting($key) {
    $row = fetchOne('SELECT setting_value FROM settings WHERE setting_key = ?', [$key]);
    return $row ? $row['setting_value'] : '';
}

function setSetting($key, $value) {
    query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [$key, $value, $value]);
}

// --- Simple in-memory cache (APCu-based, optional) ---
$AB_CACHE_TTL_DEFAULT = 60; // seconds

function ab_cache_enabled() {
    return function_exists('apcu_fetch') && ini_get('apc.enabled');
}

function ab_cache_get($key) {
    if (!ab_cache_enabled()) return null;
    $success = false;
    $value = apcu_fetch($key, $success);
    return $success ? $value : null;
}

function ab_cache_set($key, $value, $ttl = null) {
    if (!ab_cache_enabled()) return;
    global $AB_CACHE_TTL_DEFAULT;
    if ($ttl === null) $ttl = $AB_CACHE_TTL_DEFAULT;
    apcu_store($key, $value, (int)$ttl);
}

function ab_cache_delete($key) {
    if (!ab_cache_enabled()) return;
    apcu_delete($key);
}

// JSON helper with HTTP caching (ETag + Cache-Control)
function json_cacheable($data, $ttl = null, $cacheKey = null, $statusCode = 200) {
    global $AB_CACHE_TTL_DEFAULT;
    if ($ttl === null) $ttl = $AB_CACHE_TTL_DEFAULT;
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    $etagSource = $cacheKey ? ($cacheKey . '|' . $json) : $json;
    $etag = '"' . md5($etagSource) . '"';

    header('Cache-Control: private, max-age=' . (int)$ttl);
    header('ETag: ' . $etag);

    $clientEtag = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
    if ($clientEtag && trim($clientEtag) === $etag) {
        http_response_code(304);
        exit;
    }

    http_response_code($statusCode);
    echo $json;
    exit;
}

// --- Service Keywords (for smart-match) ---
$SERVICE_KEYWORDS = [
    'management' => ['name' => 'Управление и Стратегия', 'keywords' => ['стратегия','управление','менеджмент','проект','kpi','roadmap','scrum','agile','бизнес-процесс','трансформация','оптимизация','планирование','финанс','бюджет','логистика','операции'], 'context' => 'Опишите задачу в области управления', 'tg_emoji' => '🏛'],
    'investment' => ['name' => 'Инвестиции и Оценка', 'keywords' => ['инвестиция','оценка','due diligence','dcf','pitch deck','бизнес-план','финансирование','стоимость','m&a','инвестор','стартап'], 'context' => 'Опишите инвестиционную задачу', 'tg_emoji' => '📈'],
    'creative' => ['name' => 'Креатив', 'keywords' => ['маркетинг','реклама','бренд','seo','smm','продажа','crm','клиент','дизайн','ui','ux','figma','hr','персонал','подбор','креатив','контент','digital'], 'context' => 'Опишите задачу: маркетинг, продажи, дизайн, HR', 'tg_emoji' => '🎨'],
    'analytics' => ['name' => 'Аналитика и Данные', 'keywords' => ['аналитика','данные','data','bi','дашборд','sql','python','excel','прогноз','machine learning'], 'context' => 'Опишите задачу аналитики', 'tg_emoji' => '📊'],
    'it' => ['name' => 'ИТ и Разработка', 'keywords' => ['разработка','программирование','api','сайт','приложение','backend','frontend','devops','облако','crm','erp','кибербезопасность','интеграция'], 'context' => 'Опишите IT-задачу', 'tg_emoji' => '💻'],
];

// --- Telegram helper ---
function sendTelegram($text) {
    $token = getSetting('tg_bot_token');
    $chatId = getSetting('tg_chat_id');
    if (!$token || !$chatId) return;
    $ids = [];
    $raw = trim((string)$chatId);
    if ($raw) {
        // Allow: JSON array, CSV, or whitespace separated
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $ids = $decoded;
        } else {
            $ids = preg_split('/[,;\s]+/', $raw, -1, PREG_SPLIT_NO_EMPTY);
        }
        $ids = array_values(array_filter(array_map(function($x){ return trim((string)$x); }, $ids), function($x){ return $x !== ''; }));
    }
    if (!$ids) return;
    $url = "https://api.telegram.org/bot$token/sendMessage";
    foreach ($ids as $id) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(['chat_id' => $id, 'text' => $text, 'parse_mode' => 'HTML']),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}

// ===== ROUTE MATCHING =====

// POST /api/admin/login
if ($method === 'POST' && $path === '/api/admin/login') {
    requireDb();
    $password = $body['password'] ?? '';
    $hash = getSetting('admin_password_hash');
    if (!$hash) {
        // Fallback to env password
        if ($password === $ADMIN_PASSWORD) {
            $_SESSION['isAdmin'] = true;
            json_out(['ok' => true]);
        }
        json_out(['error' => 'Invalid password'], 401);
    }
    if (password_verify($password, $hash)) {
        $_SESSION['isAdmin'] = true;
        json_out(['ok' => true]);
    }
    json_out(['error' => 'Invalid password'], 401);
}

// POST /api/admin/logout
if ($method === 'POST' && $path === '/api/admin/logout') {
    session_destroy();
    json_out(['ok' => true]);
}

// GET /api/admin/check
if ($method === 'GET' && $path === '/api/admin/check') {
    if (!empty($_SESSION['isAdmin'])) json_out(['ok' => true]);
    json_out(['error' => 'Not authenticated'], 401);
}

// GET /api/admin/stats
if ($method === 'GET' && $path === '/api/admin/stats') {
    requireAdmin(); requireDb();
    $totalVisitors = fetchOne('SELECT COUNT(*) as c FROM visitors')['c'] ?? 0;
    $todayVisitors = fetchOne("SELECT COUNT(*) as c FROM visitors WHERE DATE(created_at) = CURDATE()")['c'] ?? 0;
    $totalLeads = fetchOne('SELECT COUNT(*) as c FROM leads')['c'] ?? 0;
    $newLeads = fetchOne("SELECT COUNT(*) as c FROM leads WHERE status = 'new'")['c'] ?? 0;
    $calcCompleted = fetchOne("SELECT COUNT(*) as c FROM calculator_sessions WHERE completed = 1")['c'] ?? 0;
    $calcAbandoned = fetchOne("SELECT COUNT(*) as c FROM calculator_sessions WHERE completed = 0")['c'] ?? 0;
    $convRate = $totalVisitors > 0 ? round(($totalLeads / $totalVisitors) * 100, 1) . '%' : '0%';
    $deviceStats = fetchAll('SELECT device, COUNT(*) as count FROM visitors GROUP BY device ORDER BY count DESC');
    $browserStats = fetchAll('SELECT browser, COUNT(*) as count FROM visitors GROUP BY browser ORDER BY count DESC LIMIT 10');
    $osStats = fetchAll('SELECT os, COUNT(*) as count FROM visitors GROUP BY os ORDER BY count DESC LIMIT 10');
    $dailyVisitors = fetchAll("SELECT DATE(created_at) as day, COUNT(*) as count FROM visitors WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY day ORDER BY day");
    $topPages = fetchAll('SELECT page, COUNT(*) as count FROM page_views GROUP BY page ORDER BY count DESC LIMIT 10');
    $leadsByService = fetchAll('SELECT service, COUNT(*) as count FROM leads GROUP BY service ORDER BY count DESC');
    $leadsByStatus = fetchAll('SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC');
    $recentLeads = fetchAll('SELECT * FROM leads ORDER BY created_at DESC LIMIT 10');
    json_out([
        'totalVisitors' => (int)$totalVisitors,
        'todayVisitors' => (int)$todayVisitors,
        'totalLeads' => (int)$totalLeads,
        'newLeads' => (int)$newLeads,
        'calcCompleted' => (int)$calcCompleted,
        'calcAbandoned' => (int)$calcAbandoned,
        'conversionRate' => $convRate,
        'deviceStats' => $deviceStats,
        'browserStats' => $browserStats,
        'osStats' => $osStats,
        'dailyVisitors' => $dailyVisitors,
        'topPages' => $topPages,
        'leadsByService' => $leadsByService,
        'leadsByStatus' => $leadsByStatus,
        'recentLeads' => $recentLeads,
    ]);
}

// GET /api/admin/leads
if ($method === 'GET' && $path === '/api/admin/leads') {
    requireAdmin(); requireDb();
    $where = []; $params = [];
    if (!empty($_GET['status'])) { $where[] = 'status = ?'; $params[] = $_GET['status']; }
    if (!empty($_GET['source'])) { $where[] = 'source = ?'; $params[] = $_GET['source']; }
    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[] = '(name LIKE ? OR email LIKE ? OR company LIKE ?)';
        $params[] = $s; $params[] = $s; $params[] = $s;
    }
    $sql = 'SELECT * FROM leads' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY created_at DESC';
    $leads = fetchAll($sql, $params);
    $total = fetchOne('SELECT COUNT(*) as c FROM leads' . ($where ? ' WHERE ' . implode(' AND ', $where) : ''), $params)['c'];
    json_out(['leads' => $leads, 'total' => (int)$total]);
}

// PUT /api/admin/leads/:id
if ($method === 'PUT' && preg_match('#^/api/admin/leads/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    $sets = []; $params = [];
    if (isset($body['status'])) { $sets[] = 'status = ?'; $params[] = $body['status']; }
    if (isset($body['notes'])) { $sets[] = 'notes = ?'; $params[] = $body['notes']; }
    if ($sets) { $params[] = $id; query('UPDATE leads SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
    json_out(['ok' => true]);
}

// DELETE /api/admin/leads/:id
if ($method === 'DELETE' && preg_match('#^/api/admin/leads/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    query('DELETE FROM leads WHERE id = ?', [(int)$m[1]]);
    json_out(['ok' => true]);
}

// GET /api/admin/calculator-sessions
if ($method === 'GET' && $path === '/api/admin/calculator-sessions') {
    requireAdmin(); requireDb();
    $sql = 'SELECT * FROM calculator_sessions';
    $params = [];
    if (isset($_GET['completed'])) { $sql .= ' WHERE completed = ?'; $params[] = (int)$_GET['completed']; }
    $sql .= ' ORDER BY created_at DESC';
    json_out(['sessions' => fetchAll($sql, $params)]);
}

// GET /api/admin/seo
if ($method === 'GET' && $path === '/api/admin/seo') {
    requireAdmin(); requireDb();
    json_out(['settings' => fetchAll('SELECT * FROM seo_settings')]);
}

// PUT /api/admin/seo/:page
if ($method === 'PUT' && preg_match('#^/api/admin/seo/(.+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $page = urldecode($m[1]);
    $fields = ['title','description','keywords','og_title','og_description','og_image'];
    $sets = []; $params = [];
    foreach ($fields as $f) {
        if (isset($body[$f])) { $sets[] = "$f = ?"; $params[] = $body[$f]; }
    }
    if ($sets) { $params[] = $page; query('UPDATE seo_settings SET ' . implode(', ', $sets) . ' WHERE page = ?', $params); }
    json_out(['ok' => true]);
}

// GET /api/admin/settings
if ($method === 'GET' && $path === '/api/admin/settings') {
    requireAdmin(); requireDb();
    $rows = fetchAll('SELECT setting_key, setting_value FROM settings');
    $out = [];
    foreach ($rows as $r) {
        if ($r['setting_key'] === 'admin_password_hash') continue;
        $out[$r['setting_key']] = $r['setting_value'];
    }
    json_out($out);
}

// PUT /api/admin/settings
if ($method === 'PUT' && $path === '/api/admin/settings') {
    requireAdmin(); requireDb();
    $allowed = ['tg_bot_token','tg_chat_id','email_from','smtp_host','smtp_port','smtp_secure','smtp_user','smtp_pass','email_to'];
    foreach ($allowed as $key) {
        if (isset($body[$key])) setSetting($key, $body[$key]);
    }
    if (!empty($body['new_password']) && strlen($body['new_password']) >= 4) {
        $hash = password_hash($body['new_password'], PASSWORD_BCRYPT);
        setSetting('admin_password_hash', $hash);
    }
    json_out(['ok' => true]);
}

// GET /api/admin/pricing/calculator
if ($method === 'GET' && $path === '/api/admin/pricing/calculator') {
    requireAdmin(); requireDb();
    $json = getSetting('calculator_pricing_json');
    json_out(['ok' => true, 'pricing_json' => $json]);
}

// PUT /api/admin/pricing/calculator
if ($method === 'PUT' && $path === '/api/admin/pricing/calculator') {
    requireAdmin(); requireDb();
    $pj = $body['pricing_json'] ?? '';
    // Validate JSON
    if ($pj && json_decode($pj) === null) json_out(['error' => 'Invalid JSON'], 400);
    setSetting('calculator_pricing_json', $pj);
    ab_cache_delete('pricing:calculator');
    json_out(['ok' => true]);
}

// GET /api/admin/i18n/:lang
if ($method === 'GET' && preg_match('#^/api/admin/i18n/([a-z]{2,5})$#', $path, $m)) {
    requireAdmin(); requireDb();
    $lang = $m[1];
    $rows = fetchAll('SELECT tkey, tvalue FROM i18n_translations WHERE lang = ?', [$lang]);
    $translations = [];
    foreach ($rows as $r) {
        $translations[$r['tkey']] = $r['tvalue'];
    }
    json_out(['lang' => $lang, 'translations' => $translations]);
}

// PUT /api/admin/i18n/:lang
if ($method === 'PUT' && preg_match('#^/api/admin/i18n/([a-z]{2,5})$#', $path, $m)) {
    requireAdmin(); requireDb();
    $lang = $m[1];
    $translations = $body['translations'] ?? [];
    $count = 0;
    foreach ($translations as $key => $val) {
        query(
            'INSERT INTO i18n_translations (lang, tkey, tvalue) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tvalue = ?',
            [$lang, $key, $val, $val]
        );
        $count++;
    }
    ab_cache_delete("i18n:$lang");
    json_out(['ok' => true, 'count' => $count]);
}

// GET /api/admin/pages/:slug
if ($method === 'GET' && preg_match('#^/api/admin/pages/([a-z0-9_-]+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $slug = $m[1]; $lang = $_GET['lang'] ?? 'ru';
    $page = fetchOne('SELECT id FROM pages WHERE slug = ?', [$slug]);
    if (!$page) json_out(['error' => 'Page not found'], 404);
    $locale = fetchOne('SELECT title, html FROM page_locales WHERE page_id = ? AND lang = ?', [$page['id'], $lang]);
    json_out(['slug' => $slug, 'lang' => $lang, 'title' => $locale['title'] ?? '', 'html' => $locale['html'] ?? '']);
}

// PUT /api/admin/pages/:slug
if ($method === 'PUT' && preg_match('#^/api/admin/pages/([a-z0-9_-]+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $slug = $m[1]; $lang = $body['lang'] ?? 'ru';
    $page = fetchOne('SELECT id FROM pages WHERE slug = ?', [$slug]);
    if (!$page) json_out(['error' => 'Page not found'], 404);
    $title = $body['title'] ?? '';
    $html = $body['html'] ?? '';
    query('INSERT INTO page_locales (page_id, lang, title, html) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = ?, html = ?',
        [$page['id'], $lang, $title, $html, $title, $html]);
    // Invalidate cached public page versions (common langs ru/en)
    ab_cache_delete("page:$slug:$lang");
    ab_cache_delete("page:$slug:ru");
    ab_cache_delete("page:$slug:en");
    json_out(['ok' => true]);
}

// GET /api/admin/projects
if ($method === 'GET' && $path === '/api/admin/projects') {
    requireAdmin(); requireDb();
    $lang = $_GET['lang'] ?? 'ru';
    $projects = fetchAll("SELECT p.*, COALESCE(pl.title, '') as title, COALESCE(pl.excerpt, '') as excerpt FROM projects p LEFT JOIN project_locales pl ON p.id = pl.project_id AND pl.lang = ? ORDER BY p.created_at DESC", [$lang]);
    json_out(['projects' => $projects]);
}

// POST /api/admin/projects
if ($method === 'POST' && $path === '/api/admin/projects') {
    requireAdmin(); requireDb();
    $slug = $body['slug'] ?? '';
    $cover = $body['cover_image'] ?? '';
    if (!$slug) json_out(['error' => 'slug required'], 400);
    $slug = preg_replace('/[^a-z0-9-]/', '', strtolower($slug));
    query('INSERT INTO projects (slug, cover_image) VALUES (?, ?)', [$slug, $cover]);
    // Invalidate public projects caches
    ab_cache_delete('projects:list:ru');
    ab_cache_delete('projects:list:en');
    ab_cache_delete("project:$slug:ru");
    ab_cache_delete("project:$slug:en");
    json_out(['ok' => true]);
}

// PUT /api/admin/projects/:id
if ($method === 'PUT' && preg_match('#^/api/admin/projects/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    $project = fetchOne('SELECT slug FROM projects WHERE id = ?', [$id]);
    $sets = []; $params = [];
    if (isset($body['is_published'])) { $sets[] = 'is_published = ?'; $params[] = $body['is_published'] ? 1 : 0; }
    if (isset($body['cover_image'])) { $sets[] = 'cover_image = ?'; $params[] = $body['cover_image']; }
    if ($sets) { $params[] = $id; query('UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
    if ($project && !empty($project['slug'])) {
        $slug = $project['slug'];
        ab_cache_delete("project:$slug:ru");
        ab_cache_delete("project:$slug:en");
    }
    ab_cache_delete('projects:list:ru');
    ab_cache_delete('projects:list:en');
    json_out(['ok' => true]);
}

// DELETE /api/admin/projects/:id
if ($method === 'DELETE' && preg_match('#^/api/admin/projects/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    query('DELETE FROM project_reviews WHERE project_id = ?', [$id]);
    query('DELETE FROM project_locales WHERE project_id = ?', [$id]);
    query('DELETE FROM projects WHERE id = ?', [$id]);
    json_out(['ok' => true]);
}

// GET /api/admin/projects/:id/locale
if ($method === 'GET' && preg_match('#^/api/admin/projects/(\d+)/locale$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1]; $lang = $_GET['lang'] ?? 'ru';
    $locale = fetchOne('SELECT title, excerpt, html, gallery_json FROM project_locales WHERE project_id = ? AND lang = ?', [$id, $lang]);
    $gallery = [];
    if ($locale && !empty($locale['gallery_json'])) {
        $gallery = json_decode($locale['gallery_json'], true) ?: [];
    }
    json_out(['title' => $locale['title'] ?? '', 'excerpt' => $locale['excerpt'] ?? '', 'html' => $locale['html'] ?? '', 'gallery' => $gallery]);
}

// PUT /api/admin/projects/:id/locale
if ($method === 'PUT' && preg_match('#^/api/admin/projects/(\d+)/locale$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1]; $lang = $body['lang'] ?? 'ru';
    $title = $body['title'] ?? '';
    $excerpt = $body['excerpt'] ?? '';
    $html = $body['html'] ?? '';
    $gallery = isset($body['gallery']) ? json_encode($body['gallery']) : '[]';
    query(
        'INSERT INTO project_locales (project_id, lang, title, excerpt, html, gallery_json) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = ?, excerpt = ?, html = ?, gallery_json = ?',
        [$id, $lang, $title, $excerpt, $html, $gallery, $title, $excerpt, $html, $gallery]
    );
    // Invalidate caches for this project
    $project = fetchOne('SELECT slug FROM projects WHERE id = ?', [$id]);
    if ($project && !empty($project['slug'])) {
        $slug = $project['slug'];
        ab_cache_delete("project:$slug:$lang");
        ab_cache_delete("project:$slug:ru");
        ab_cache_delete("project:$slug:en");
    }
    ab_cache_delete('projects:list:ru');
    ab_cache_delete('projects:list:en');
    json_out(['ok' => true]);
}

// GET /api/admin/articles
if ($method === 'GET' && $path === '/api/admin/articles') {
    requireAdmin(); requireDb();
    $lang = $_GET['lang'] ?? 'ru';
    $articles = fetchAll("SELECT a.*, COALESCE(al.title, '') as title, COALESCE(al.excerpt, '') as excerpt FROM articles a LEFT JOIN article_locales al ON a.id = al.article_id AND al.lang = ? ORDER BY a.created_at DESC", [$lang]);
    json_out(['articles' => $articles]);
}

// POST /api/admin/articles
if ($method === 'POST' && $path === '/api/admin/articles') {
    requireAdmin(); requireDb();
    $slug = $body['slug'] ?? '';
    $cover = $body['cover_image'] ?? '';
    if (!$slug) json_out(['error' => 'slug required'], 400);
    $slug = preg_replace('/[^a-z0-9-]/', '', strtolower($slug));
    query('INSERT INTO articles (slug, cover_image) VALUES (?, ?)', [$slug, $cover]);
    // Invalidate public articles caches
    ab_cache_delete('articles:list:ru');
    ab_cache_delete('articles:list:en');
    ab_cache_delete("article:$slug:ru");
    ab_cache_delete("article:$slug:en");
    json_out(['ok' => true]);
}

// PUT /api/admin/articles/:id
if ($method === 'PUT' && preg_match('#^/api/admin/articles/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    $article = fetchOne('SELECT slug FROM articles WHERE id = ?', [$id]);
    $sets = []; $params = [];
    if (isset($body['is_published'])) { $sets[] = 'is_published = ?'; $params[] = $body['is_published'] ? 1 : 0; }
    if (isset($body['cover_image'])) { $sets[] = 'cover_image = ?'; $params[] = $body['cover_image']; }
    if ($sets) { $params[] = $id; query('UPDATE articles SET ' . implode(', ', $sets) . ' WHERE id = ?', $params); }
    if ($article && !empty($article['slug'])) {
        $slug = $article['slug'];
        ab_cache_delete("article:$slug:ru");
        ab_cache_delete("article:$slug:en");
    }
    ab_cache_delete('articles:list:ru');
    ab_cache_delete('articles:list:en');
    json_out(['ok' => true]);
}

// GET /api/admin/articles/:id/locale
if ($method === 'GET' && preg_match('#^/api/admin/articles/(\d+)/locale$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1]; $lang = $_GET['lang'] ?? 'ru';
    $locale = fetchOne('SELECT title, excerpt, html FROM article_locales WHERE article_id = ? AND lang = ?', [$id, $lang]);
    json_out(['title' => $locale['title'] ?? '', 'excerpt' => $locale['excerpt'] ?? '', 'html' => $locale['html'] ?? '']);
}

// PUT /api/admin/articles/:id/locale
if ($method === 'PUT' && preg_match('#^/api/admin/articles/(\d+)/locale$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1]; $lang = $body['lang'] ?? 'ru';
    $title = $body['title'] ?? '';
    $excerpt = $body['excerpt'] ?? '';
    $html = $body['html'] ?? '';
    query('INSERT INTO article_locales (article_id, lang, title, excerpt, html) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = ?, excerpt = ?, html = ?',
        [$id, $lang, $title, $excerpt, $html, $title, $excerpt, $html]);
    // Invalidate caches for this article
    $article = fetchOne('SELECT slug FROM articles WHERE id = ?', [$id]);
    if ($article && !empty($article['slug'])) {
        $slug = $article['slug'];
        ab_cache_delete("article:$slug:$lang");
        ab_cache_delete("article:$slug:ru");
        ab_cache_delete("article:$slug:en");
    }
    ab_cache_delete('articles:list:ru');
    ab_cache_delete('articles:list:en');
    json_out(['ok' => true]);
}

// GET /api/admin/clients
if ($method === 'GET' && $path === '/api/admin/clients') {
    requireAdmin(); requireDb();
    $clients = fetchAll("SELECT c.id, c.slug, c.email, c.is_active, c.created_at, COALESCE(cp.company_name, '') as company_name, COALESCE(cp.logo_url, '') as logo_url FROM clients c LEFT JOIN client_profiles cp ON c.id = cp.client_id ORDER BY c.created_at DESC");
    json_out(['clients' => $clients]);
}

// POST /api/admin/clients
if ($method === 'POST' && $path === '/api/admin/clients') {
    requireAdmin(); requireDb();
    $email = $body['email'] ?? '';
    $slug = $body['slug'] ?? '';
    $password = $body['password'] ?? '';
    $companyName = $body['company_name'] ?? '';
    if (!$email || !$slug || !$password || strlen($password) < 6) json_out(['error' => 'email, slug, password (min 6) required'], 400);
    $hash = password_hash($password, PASSWORD_BCRYPT);
    query('INSERT INTO clients (slug, email, password_hash) VALUES (?, ?, ?)', [$slug, $email, $hash]);
    $clientId = $pdo->lastInsertId();
    query('INSERT INTO client_profiles (client_id, company_name) VALUES (?, ?)', [$clientId, $companyName]);
    json_out(['ok' => true, 'id' => (int)$clientId]);
}

// GET /api/admin/clients/:id
if ($method === 'GET' && preg_match('#^/api/admin/clients/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    $client = fetchOne("SELECT c.*, COALESCE(cp.company_name, '') as company_name, COALESCE(cp.logo_url, '') as logo_url, COALESCE(cp.website, '') as website, COALESCE(cp.description, '') as description, COALESCE(cp.address, '') as address, COALESCE(cp.city, '') as city, COALESCE(cp.country, '') as country, cp.lat, cp.lng FROM clients c LEFT JOIN client_profiles cp ON c.id = cp.client_id WHERE c.id = ?", [$id]);
    if (!$client) json_out(['error' => 'Client not found'], 404);
    unset($client['password_hash']);
    json_out($client);
}

// PUT /api/admin/clients/:id
if ($method === 'PUT' && preg_match('#^/api/admin/clients/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    $client = fetchOne('SELECT slug FROM clients WHERE id = ?', [$id]);
    if (isset($body['is_active'])) query('UPDATE clients SET is_active = ? WHERE id = ?', [$body['is_active'] ? 1 : 0, $id]);
    $profileFields = ['company_name','logo_url','website','description','address','city','country','lat','lng'];
    $sets = []; $params = [];
    foreach ($profileFields as $f) {
        if (isset($body[$f])) { $sets[] = "$f = ?"; $params[] = $body[$f]; }
    }
    if ($sets) { $params[] = $id; query('UPDATE client_profiles SET ' . implode(', ', $sets) . ' WHERE client_id = ?', $params); }
    if ($client && !empty($client['slug'])) {
        $slug = $client['slug'];
        ab_cache_delete("client:$slug");
    }
    json_out(['ok' => true]);
}

// POST /api/admin/upload
if ($method === 'POST' && $path === '/api/admin/upload') {
    requireAdmin();
    if (empty($_FILES['file'])) json_out(['error' => 'No file uploaded'], 400);
    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['png','jpg','jpeg','webp','gif','svg'];
    if (!in_array($ext, $allowed)) json_out(['error' => 'Invalid file type'], 400);
    if ($file['size'] > 8 * 1024 * 1024) json_out(['error' => 'File too large (max 8MB)'], 400);
    $uploadsDir = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
    $uploadsDir .= '/uploads';
    if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
    $filename = time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = $uploadsDir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) json_out(['error' => 'Upload failed'], 500);
    json_out(['ok' => true, 'url' => '/uploads/' . $filename]);
}

// POST /api/admin/translate
if ($method === 'POST' && $path === '/api/admin/translate') {
    requireAdmin();
    $sourceLang = $body['sourceLang'] ?? 'ru';
    $targetLang = $body['targetLang'] ?? '';
    $text = $body['text'] ?? '';
    if (!$targetLang || !$text) json_out(['error' => 'targetLang and text required'], 400);
    $text = mb_substr($text, 0, 500);
    $url = 'https://api.mymemory.translated.net/get?' . http_build_query(['q' => $text, 'langpair' => "$sourceLang|$targetLang"]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    $translated = $data['responseData']['translatedText'] ?? $text;
    json_out(['ok' => true, 'translated' => $translated]);
}

// POST /api/admin/translate-batch
if ($method === 'POST' && $path === '/api/admin/translate-batch') {
    requireAdmin();
    $sourceLang = $body['sourceLang'] ?? 'ru';
    $targetLang = $body['targetLang'] ?? '';
    $texts = $body['texts'] ?? [];
    if (!$targetLang || empty($texts)) json_out(['error' => 'targetLang and texts required'], 400);
    $texts = array_slice($texts, 0, 50);
    $translations = [];
    foreach ($texts as $text) {
        $text = mb_substr($text, 0, 500);
        $url = 'https://api.mymemory.translated.net/get?' . http_build_query(['q' => $text, 'langpair' => "$sourceLang|$targetLang"]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
        $response = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($response, true);
        $translations[] = $data['responseData']['translatedText'] ?? $text;
    }
    json_out(['ok' => true, 'translations' => $translations]);
}

// GET /api/admin/reviews
if ($method === 'GET' && $path === '/api/admin/reviews') {
    requireAdmin(); requireDb();
    $projectId = $_GET['project_id'] ?? 0;
    $lang = $_GET['lang'] ?? 'ru';
    if (!$projectId) json_out(['error' => 'project_id required'], 400);
    $reviews = fetchAll("SELECT pr.*, c.slug as client_slug, COALESCE(cp.company_name, '') as company_name, COALESCE(cp.logo_url, '') as logo_url FROM project_reviews pr LEFT JOIN clients c ON pr.client_id = c.id LEFT JOIN client_profiles cp ON c.id = cp.client_id WHERE pr.project_id = ? AND pr.lang = ?", [$projectId, $lang]);
    json_out(['reviews' => $reviews]);
}

// PUT /api/admin/reviews
if ($method === 'PUT' && $path === '/api/admin/reviews') {
    requireAdmin(); requireDb();
    $projectId = $body['project_id'] ?? 0;
    $clientId = $body['client_id'] ?? 0;
    $lang = $body['lang'] ?? 'ru';
    $rating = max(1, min(5, (int)($body['rating'] ?? 5)));
    $text = $body['review_text'] ?? '';
    $published = !empty($body['is_published']) ? 1 : 0;
    query('INSERT INTO project_reviews (project_id, client_id, lang, rating, review_text, is_published) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = ?, review_text = ?, is_published = ?',
        [$projectId, $clientId, $lang, $rating, $text, $published, $rating, $text, $published]);
    json_out(['ok' => true]);
}

// ===== PUBLIC API ROUTES =====

// POST /api/track
if ($method === 'POST' && $path === '/api/track') {
    requireDb();
    $sessionId = $body['session_id'] ?? bin2hex(random_bytes(16));
    $device = $body['device'] ?? 'desktop';
    $browser = $body['browser'] ?? '';
    $os = $body['os'] ?? '';
    $referrer = $body['referrer'] ?? '';
    $page = $body['page'] ?? '/';
    $lang = $body['lang'] ?? 'ru';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    // Upsert visitor
    $existing = fetchOne('SELECT id FROM visitors WHERE session_id = ?', [$sessionId]);
    if (!$existing) {
        query('INSERT INTO visitors (session_id, ip, device, browser, os, referrer, lang) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$sessionId, $ip, $device, $browser, $os, $referrer, $lang]);
    }
    // Track page view (aggregated by day)
    query('INSERT INTO page_views (page, view_date, views) VALUES (?, CURDATE(), 1) ON DUPLICATE KEY UPDATE views = views + 1', [$page]);
    json_out(['ok' => true]);
}

// POST /api/smart-match
if ($method === 'POST' && $path === '/api/smart-match') {
    $service = $body['service'] ?? '';
    $text = $body['text'] ?? '';
    $info = $SERVICE_KEYWORDS[$service] ?? null;
    if (!$info) { json_out(['score' => 0, 'relevant' => true]); }
    $text = mb_strtolower($text);
    $text = preg_replace('/[^\w\p{Cyrillic}\- ]/u', '', $text);
    $words = array_filter(preg_split('/\s+/', $text), function($w) { return mb_strlen($w) > 2; });
    if (empty($words)) { json_out(['score' => 0, 'relevant' => true]); }
    $matches = 0;
    foreach ($words as $word) {
        foreach ($info['keywords'] as $kw) {
            if (mb_strpos($kw, $word) !== false || mb_strpos($word, $kw) !== false) {
                $matches++;
                break;
            }
        }
    }
    $score = round(($matches / count($words)) * 100);
    $relevant = $score >= 10 || count($words) < 3;
    json_out([
        'score' => $score,
        'relevant' => $relevant,
        'service_name' => $info['name'],
        'hint' => !$relevant ? "Похоже, ваше описание не связано с направлением \"{$info['name']}\". Уточните задачу или выберите другое направление." : ''
    ]);
}

// GET /api/service-context/:service
if ($method === 'GET' && preg_match('#^/api/service-context/([a-z]+)$#', $path, $m)) {
    $info = $SERVICE_KEYWORDS[$m[1]] ?? null;
    if (!$info) json_out(['error' => 'service not found'], 404);
    json_out(['name' => $info['name'], 'context' => $info['context'], 'keywords' => $info['keywords']]);
}

// POST /api/contact
if ($method === 'POST' && $path === '/api/contact') {
    requireDb();
    $name = $body['name'] ?? '';
    $email = $body['email'] ?? '';
    if (!$name || !$email) json_out(['error' => 'name and email required'], 400);
    $phone = $body['phone'] ?? '';
    $company = $body['company'] ?? '';
    $message = $body['message'] ?? $body['description'] ?? '';
    $source = $body['source'] ?? 'contact';
    $service = $body['service'] ?? '';
    $companySize = $body['company_size'] ?? '';
    $complexity = $body['complexity'] ?? '';
    $duration = $body['duration'] ?? '';
    $estimatedPrice = (float)($body['estimated_price'] ?? 0);
    query('INSERT INTO leads (name, email, phone, company, message, source, service, company_size, complexity, duration, estimated_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$name, $email, $phone, $company, $message, $source, $service, $companySize, $complexity, $duration, $estimatedPrice]);
    $leadId = $pdo->lastInsertId();
    // Telegram notification
    $emoji = $SERVICE_KEYWORDS[$service]['tg_emoji'] ?? '📩';
    $tgText = "$emoji <b>Новая заявка</b>\n\nИмя: $name\nEmail: $email";
    if ($phone) $tgText .= "\nТелефон: $phone";
    if ($company) $tgText .= "\nКомпания: $company";
    if ($service) $tgText .= "\nУслуга: $service";
    if ($message) $tgText .= "\n\n" . mb_substr($message, 0, 500);
    if ($estimatedPrice > 0) $tgText .= "\n\nОценка: " . number_format($estimatedPrice, 0, '', ' ') . ' ₽';
    sendTelegram($tgText);
    json_out(['ok' => true, 'id' => (int)$leadId]);
}

// POST /api/calculator/start
if ($method === 'POST' && $path === '/api/calculator/start') {
    requireDb();
    $service = $body['service'] ?? '';
    $sessionId = bin2hex(random_bytes(16));
    query('INSERT INTO calculator_sessions (session_id, service) VALUES (?, ?)', [$sessionId, $service]);
    sendTelegram("🧮 Новый расчёт начат\nУслуга: $service");
    json_out(['ok' => true, 'sessionId' => $sessionId]);
}

// POST /api/calculator/update
if ($method === 'POST' && $path === '/api/calculator/update') {
    requireDb();
    $sessionId = $body['sessionId'] ?? '';
    if (!$sessionId) json_out(['error' => 'sessionId required'], 400);
    $sets = []; $params = [];
    foreach (['step' => 'current_step','service' => 'service','company_size' => 'company_size','complexity' => 'complexity','duration' => 'duration','description' => 'description','it_criteria_json' => 'it_criteria_json'] as $bodyKey => $dbCol) {
        if (isset($body[$bodyKey])) { $sets[] = "$dbCol = ?"; $params[] = $body[$bodyKey]; }
    }
    if ($sets) { $params[] = $sessionId; query('UPDATE calculator_sessions SET ' . implode(', ', $sets) . ' WHERE session_id = ?', $params); }
    json_out(['ok' => true]);
}

// POST /api/calculator/complete
if ($method === 'POST' && $path === '/api/calculator/complete') {
    requireDb();
    $sessionId = $body['sessionId'] ?? '';
    $price = (float)($body['estimated_price'] ?? 0);
    if (!$sessionId) json_out(['error' => 'sessionId required'], 400);
    query('UPDATE calculator_sessions SET completed = 1, estimated_price = ? WHERE session_id = ?', [$price, $sessionId]);
    $session = fetchOne('SELECT * FROM calculator_sessions WHERE session_id = ?', [$sessionId]);
    $tgText = "✅ Расчёт завершён\nУслуга: " . ($session['service'] ?? '') . "\nОценка: " . number_format($price, 0, '', ' ') . ' ₽';
    sendTelegram($tgText);
    json_out(['ok' => true]);
}

// GET /api/pricing/calculator (public)
if ($method === 'GET' && $path === '/api/pricing/calculator') {
    requireDb();
    $cacheKey = 'pricing:calculator';
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 300, $cacheKey);
    }
    $json = getSetting('calculator_pricing_json');
    $pricing = $json ? json_decode($json, true) : null;
    if (!$pricing) {
        $pricing = [
            'base_prices' => ['management' => 250000, 'investment' => 300000, 'creative' => 180000, 'analytics' => 200000, 'it' => 350000],
            'size_mult' => ['small' => 1, 'medium' => 1.5, 'large' => 2.5],
            'complexity_mult' => ['basic' => 1, 'standard' => 1.8, 'premium' => 3],
            'duration_mult' => ['short' => 1, 'medium' => 0.9, 'long' => 0.8],
            'it_criteria' => []
        ];
    }
    $response = ['ok' => true, 'pricing' => $pricing];
    ab_cache_set($cacheKey, $response, 300);
    json_cacheable($response, 300, $cacheKey);
}

// GET /api/i18n/:lang (public)
if ($method === 'GET' && preg_match('#^/api/i18n/([a-z]{2,5})$#', $path, $m)) {
    requireDb();
    $lang = $m[1];
    $cacheKey = "i18n:$lang";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 300, $cacheKey);
    }
    $rows = fetchAll('SELECT tkey, tvalue FROM i18n_translations WHERE lang = ?', [$lang]);
    $translations = [];
    foreach ($rows as $r) {
        $translations[$r['tkey']] = $r['tvalue'];
    }
    $response = ['lang' => $lang, 'translations' => $translations];
    ab_cache_set($cacheKey, $response, 300);
    json_cacheable($response, 300, $cacheKey);
}

// GET /api/pages/:slug (public)
if ($method === 'GET' && preg_match('#^/api/pages/([a-z0-9_-]+)$#', $path, $m)) {
    requireDb();
    $slug = $m[1]; $lang = $_GET['lang'] ?? 'ru';
    $cacheKey = "page:$slug:$lang";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 120, $cacheKey);
    }
    $page = fetchOne('SELECT id FROM pages WHERE slug = ?', [$slug]);
    if (!$page) json_out(['error' => 'not found'], 404);
    $locale = fetchOne('SELECT title, html FROM page_locales WHERE page_id = ? AND lang = ?', [$page['id'], $lang]);
    if (!$locale) $locale = fetchOne('SELECT title, html FROM page_locales WHERE page_id = ? AND lang = ?', [$page['id'], 'ru']);
    $response = ['slug' => $slug, 'title' => $locale['title'] ?? '', 'html' => $locale['html'] ?? ''];
    ab_cache_set($cacheKey, $response, 120);
    json_cacheable($response, 120, $cacheKey);
}

// GET /api/projects (public)
if ($method === 'GET' && $path === '/api/projects') {
    requireDb();
    $lang = $_GET['lang'] ?? 'ru';
    $cacheKey = "projects:list:$lang";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 120, $cacheKey);
    }
    $projects = fetchAll("SELECT p.id, p.slug, p.cover_image, p.created_at, COALESCE(pl.title, '') as title, COALESCE(pl.excerpt, '') as excerpt FROM projects p LEFT JOIN project_locales pl ON p.id = pl.project_id AND pl.lang = ? WHERE p.is_published = 1 ORDER BY p.created_at DESC", [$lang]);
    $response = ['projects' => $projects];
    ab_cache_set($cacheKey, $response, 120);
    json_cacheable($response, 120, $cacheKey);
}

// GET /api/projects/:slug (public)
if ($method === 'GET' && preg_match('#^/api/projects/([a-z0-9-]+)$#', $path, $m)) {
    requireDb();
    $slug = $m[1]; $lang = $_GET['lang'] ?? 'ru';
    $cacheKey = "project:$slug:$lang";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 120, $cacheKey);
    }
    $project = fetchOne('SELECT * FROM projects WHERE slug = ? AND is_published = 1', [$slug]);
    if (!$project) json_out(['error' => 'not found'], 404);
    $locale = fetchOne('SELECT title, excerpt, html, gallery_json FROM project_locales WHERE project_id = ? AND lang = ?', [$project['id'], $lang]);
    if (!$locale) {
        $locale = fetchOne('SELECT title, excerpt, html, gallery_json FROM project_locales WHERE project_id = ? AND lang = ?', [$project['id'], 'ru']);
    }
    $gallery = [];
    if ($locale && !empty($locale['gallery_json'])) {
        $gallery = json_decode($locale['gallery_json'], true) ?: [];
    }
    $response = ['slug' => $slug, 'project' => [
        'id' => (int)$project['id'], 'slug' => $project['slug'], 'cover_image' => $project['cover_image'],
        'created_at' => $project['created_at'], 'title' => $locale['title'] ?? '', 'excerpt' => $locale['excerpt'] ?? '',
        'html' => $locale['html'] ?? '', 'gallery' => $gallery
    ]];
    ab_cache_set($cacheKey, $response, 120);
    json_cacheable($response, 120, $cacheKey);
}

// GET /api/projects/:slug/review (public)
if ($method === 'GET' && preg_match('#^/api/projects/([a-z0-9-]+)/review$#', $path, $m)) {
    requireDb();
    $slug = $m[1]; $langPref = $_GET['lang'] ?? 'ru';
    $langTry = [$langPref, 'ru'];
    $project = fetchOne('SELECT id FROM projects WHERE slug = ?', [$slug]);
    if (!$project) json_out(['error' => 'not found'], 404);
    $review = null;
    foreach ($langTry as $L) {
        $review = fetchOne("SELECT pr.rating, pr.review_text as text, c.slug as client_slug,
                COALESCE(cp.company_name, '') as company_name,
                COALESCE(cp.logo_url, '') as logo_url,
                COALESCE(cp.website, '') as website
            FROM project_reviews pr
            LEFT JOIN clients c ON pr.client_id = c.id
            LEFT JOIN client_profiles cp ON c.id = cp.client_id
            WHERE pr.project_id = ? AND pr.lang = ? AND pr.is_published = 1
            ORDER BY pr.updated_at DESC, pr.id DESC
            LIMIT 1", [$project['id'], $L]);
        if ($review) break;
    }
    if (!$review) json_out(['review' => null]);
    json_out(['review' => ['rating' => (int)$review['rating'], 'text' => $review['text'], 'client' => ['slug' => $review['client_slug'], 'company_name' => $review['company_name'], 'logo_url' => $review['logo_url'], 'website' => $review['website']]]]);
}

// GET /api/articles (public)
if ($method === 'GET' && $path === '/api/articles') {
    requireDb();
    $lang = $_GET['lang'] ?? 'ru';
    $cacheKey = "articles:list:$lang";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 120, $cacheKey);
    }
    $articles = fetchAll("SELECT a.id, a.slug, a.cover_image, a.created_at, COALESCE(al.title, '') as title, COALESCE(al.excerpt, '') as excerpt FROM articles a LEFT JOIN article_locales al ON a.id = al.article_id AND al.lang = ? WHERE a.is_published = 1 ORDER BY a.created_at DESC", [$lang]);
    $response = ['articles' => $articles];
    ab_cache_set($cacheKey, $response, 120);
    json_cacheable($response, 120, $cacheKey);
}

// GET /api/articles/:slug (public)
if ($method === 'GET' && preg_match('#^/api/articles/([a-z0-9-]+)$#', $path, $m)) {
    requireDb();
    $slug = $m[1]; $lang = $_GET['lang'] ?? 'ru';
    $cacheKey = "article:$slug:$lang";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 120, $cacheKey);
    }
    $article = fetchOne('SELECT * FROM articles WHERE slug = ? AND is_published = 1', [$slug]);
    if (!$article) json_out(['error' => 'not found'], 404);
    $locale = fetchOne('SELECT title, excerpt, html FROM article_locales WHERE article_id = ? AND lang = ?', [$article['id'], $lang]);
    if (!$locale) $locale = fetchOne('SELECT title, excerpt, html FROM article_locales WHERE article_id = ? AND lang = ?', [$article['id'], 'ru']);
    $response = ['article' => [
        'id' => (int)$article['id'], 'slug' => $article['slug'], 'cover_image' => $article['cover_image'],
        'created_at' => $article['created_at'], 'title' => $locale['title'] ?? '', 'excerpt' => $locale['excerpt'] ?? '',
        'html' => $locale['html'] ?? ''
    ]];
    ab_cache_set($cacheKey, $response, 120);
    json_cacheable($response, 120, $cacheKey);
}

// Client auth routes
// POST /api/client/register
if ($method === 'POST' && $path === '/api/client/register') {
    requireDb();
    $email = $body['email'] ?? '';
    $password = $body['password'] ?? '';
    $slug = $body['slug'] ?? '';
    if (!$email || !$password || !$slug || strlen($password) < 6) json_out(['error' => 'email, password (min 6), slug required'], 400);
    $exists = fetchOne('SELECT id FROM clients WHERE email = ? OR slug = ?', [$email, $slug]);
    if ($exists) json_out(['error' => 'Email or slug already taken'], 409);
    $hash = password_hash($password, PASSWORD_BCRYPT);
    query('INSERT INTO clients (slug, email, password_hash) VALUES (?, ?, ?)', [$slug, $email, $hash]);
    $clientId = $pdo->lastInsertId();
    query('INSERT INTO client_profiles (client_id) VALUES (?)', [$clientId]);
    $_SESSION['clientId'] = (int)$clientId;
    json_out(['ok' => true, 'slug' => $slug]);
}

// POST /api/client/login
if ($method === 'POST' && $path === '/api/client/login') {
    requireDb();
    $email = $body['email'] ?? '';
    $password = $body['password'] ?? '';
    $client = fetchOne('SELECT id, slug, password_hash FROM clients WHERE email = ? AND is_active = 1', [$email]);
    if (!$client || !password_verify($password, $client['password_hash'])) json_out(['error' => 'Invalid credentials'], 401);
    $_SESSION['clientId'] = (int)$client['id'];
    json_out(['ok' => true, 'slug' => $client['slug']]);
}

// POST /api/client/logout
if ($method === 'POST' && $path === '/api/client/logout') {
    unset($_SESSION['clientId']);
    json_out(['ok' => true]);
}

// GET /api/client/me
if ($method === 'GET' && $path === '/api/client/me') {
    if (empty($_SESSION['clientId'])) json_out(['error' => 'Not authenticated'], 401);
    requireDb();
    $client = fetchOne('SELECT slug, email FROM clients WHERE id = ?', [$_SESSION['clientId']]);
    if (!$client) json_out(['error' => 'Not found'], 404);
    json_out(['ok' => true, 'client' => $client]);
}

// GET /api/clients/:slug (public)
if ($method === 'GET' && preg_match('#^/api/clients/([a-z0-9-]+)$#', $path, $m)) {
    requireDb();
    $slug = $m[1];
    $cacheKey = "client:$slug";
    $cached = ab_cache_get($cacheKey);
    if ($cached !== null) {
        json_cacheable($cached, 300, $cacheKey);
    }
    $client = fetchOne("SELECT c.slug, COALESCE(cp.company_name, '') as company_name, COALESCE(cp.logo_url, '') as logo_url, COALESCE(cp.website, '') as website, COALESCE(cp.description, '') as description, COALESCE(cp.address, '') as address, COALESCE(cp.city, '') as city, COALESCE(cp.country, '') as country, cp.lat, cp.lng FROM clients c LEFT JOIN client_profiles cp ON c.id = cp.client_id WHERE c.slug = ? AND c.is_active = 1", [$slug]);
    if (!$client) json_out(['error' => 'not found'], 404);
    $response = ['client' => $client];
    ab_cache_set($cacheKey, $response, 300);
    json_cacheable($response, 300, $cacheKey);
}

// DELETE /api/admin/articles/:id
if ($method === 'DELETE' && preg_match('#^/api/admin/articles/(\d+)$#', $path, $m)) {
    requireAdmin(); requireDb();
    $id = (int)$m[1];
    query('DELETE FROM article_locales WHERE article_id = ?', [$id]);
    query('DELETE FROM articles WHERE id = ?', [$id]);
    json_out(['ok' => true]);
}

// 404 for unknown API routes
json_out(['error' => 'Not found', 'path' => $path], 404);
