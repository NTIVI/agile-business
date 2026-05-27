Agile Business — Website & Admin
================================

Русскоязычная инструкция по запуску и эксплуатации проекта Agile Business (Node.js/Express + MySQL, PHP `api.php` для shared‑hosting).

## Быстрый старт (локальная разработка)

1. **Установите зависимости**
   - Установите Node.js LTS (желательно последнюю стабильную версию).
   - В корне проекта выполните:
     ```bash
     npm install
     ```

2. **Настройте `.env`**
   - Скопируйте файл `.env.example` в `.env`:
     ```bash
     cp .env.example .env
     ```
     На Windows PowerShell:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Отредактируйте `.env`:
     - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — параметры доступа к MySQL.
     - `ADMIN_PASSWORD` — **сразу измените** дефолтный пароль `admin123` на сложный.
     - `SESSION_SECRET` — задайте длинную случайную строку.
     - `PORT` — порт Node‑сервера (по умолчанию `3000`).

3. **Разверните базу данных**
   - Вариант 1: через `mysql`/терминал:
     ```bash
     mysql -u root -p < agile_business.sql
     ```
     При необходимости замените `root` и укажите хост/порт.
   - Вариант 2: через phpMyAdmin — импортируйте файл `agile_business.sql` в БД `agile_business`.
   - Для развёртывания с demo‑данными используйте:
     ```bash
     npm run setup-db
     ```

4. **Запуск Node.js‑сервера**
   - В корне проекта:
     ```bash
     npm start
     ```
   - Сервер слушает порт из `PORT` (по умолчанию `http://localhost:3000`).

5. **Доступ к сайту и админ‑панели**
   - Публичный сайт: откройте в браузере `http://localhost:3000`.
   - Админ‑панель: URL вида `/admin` (например, `http://localhost:3000/admin`).
   - Для входа используйте пароль администратора из `.env` (`ADMIN_PASSWORD`).

## Продакшен‑развёртывание (общие рекомендации)

- **Node.js‑вариант**:
  - Используйте системный сервис/процесс‑менеджер (`pm2`, `systemd`, NSSM на Windows) для перезапуска сервера при сбоях.
  - Настройте прокси‑сервер (Nginx/Apache/IIS) перед Node‑приложением и проксируйте запросы к `http://127.0.0.1:PORT`.
- **PHP `api.php`‑вариант** (shared‑hosting):
  - Файл `api.php` может использоваться как drop‑in API вместо `server.js`.
  - Убедитесь, что `.env` доступен для PHP (лежит рядом с `api.php` или в родительской директории, как реализовано в `api.php`).

## Бэкапы: общая стратегия

Рекомендуется **ежедневно** сохранять:

- **Базу данных MySQL** (`agile_business`).
- **Статические файлы и конфигурацию**:
  - `public/`
  - `admin-subdomain/`
  - `migrations/`
  - `scripts/`
  - `.env` (или зашифрованную копию/отдельное безопасное хранилище).

Храните минимум 7–14 последних ежедневных бэкапов и еженедельные/ежемесячные слепки на внешнем диске или в облаке.

## Бэкап MySQL

### Ручной бэкап через `mysqldump`

Пример команды (Linux/macOS/PowerShell с `mysqldump` в `PATH`):

```bash
mysqldump -h DB_HOST -P DB_PORT -u DB_USER -p DB_NAME > backups/agile_business_YYYYMMDD_HHMM.sql
```

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` — берите из `.env`.
- Перед выполнением убедитесь, что каталог `backups/` существует в корне проекта:
  ```bash
  mkdir -p backups
  ```

### Рекомендуемый скрипт для Windows (`backup-db.ps1`)

Создайте файл `backup-db.ps1` в корне проекта со скриптом, который:

- Читает параметры подключения из `.env` (или задаётся вручную в начале файла).
- Формирует имя файла вида `backups\agile_business_YYYYMMDD_HHMM.sql`.
- Вызывает `mysqldump` с этими параметрами.

После создания скрипта:

```powershell
pwsh -File .\backup-db.ps1
```

Скрипт удобно запускать по расписанию через Планировщик заданий Windows (см. раздел ниже).

## Бэкап статических файлов

### Архивирование через PowerShell (Windows)

Пример команды для создания архива с статиками и конфигами:

```powershell
$date = Get-Date -Format "yyyyMMdd_HHmm"
Compress-Archive -Path "public","admin-subdomain","migrations","scripts",".env" -DestinationPath "backups\files_$date.zip"
```

- Перед запуском создайте папку `backups` (один раз):
  ```powershell
  New-Item -ItemType Directory -Path ".\backups" -ErrorAction SilentlyContinue
  ```

### Архивирование через bash (Linux/macOS)

```bash
mkdir -p backups
tar czf backups/files_$(date +%Y%m%d_%H%M).tar.gz public admin-subdomain migrations scripts .env
```

## Автоматизация бэкапов (Windows Task Scheduler)

1. Создайте папку `backups` в корне проекта (если её нет).
2. Убедитесь, что:
   - Установлен MySQL client (доступна команда `mysqldump`).
   - Работают скрипты `backup-db.ps1` (БД) и PowerShell‑команда/скрипт архивирования файлов.
3. Откройте **Планировщик заданий Windows**:
   - Создайте задачу:
     - Триггер: ежедневно в удобное время (например, 03:00).
     - Действие: запуск PowerShell:
       ```text
       Program/script: powershell.exe
       Arguments: -ExecutionPolicy Bypass -File "D:\AgileBusinessVisitca\backup-db.ps1"
       ```
     - По аналогии можно создать вторую задачу для архивирования файлов (или объединить в один `.ps1`).

Регулярно проверяйте, что новые файлы `.sql` и архивы появляются в `backups/` и что из них можно восстановиться.

## Восстановление из бэкапа

1. **Восстановление базы данных**:
   ```bash
   mysql -h DB_HOST -P DB_PORT -u DB_USER -p DB_NAME < backups/agile_business_YYYYMMDD_HHMM.sql
   ```
2. **Восстановление статических файлов**:
   - Распакуйте архив `files_*.zip`/`files_*.tar.gz` в корень проекта, поверх существующих файлов (предварительно сделайте резервную копию текущего состояния).

## Безопасность и эксплуатационные советы

- Никогда не храните реальные `.env` и дампы БД в публичных репозиториях.
- На продакшене:
  - Задайте сложный `ADMIN_PASSWORD` и регулярно его меняйте.
  - Храните дампы и архивы на отдельном диске/в облаке с ограниченным доступом.
  - Следите за свободным местом на диске, чтобы бэкапы не заполнили хранилище.
- Периодически проверяйте логи запросов и ошибок Node.js/PHP и MySQL, чтобы заранее замечать проблемы с производительностью.

