const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}${MM}${DD}-${hh}${mm}${ss}`;
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function backupDatabase() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_NAME || !DB_USER) {
    throw new Error('DB_NAME и DB_USER должны быть заданы в .env для бэкапа БД');
  }

  const ts = getTimestamp();
  const backupDir = path.join(__dirname, '..', 'backups', 'db');
  await ensureDir(backupDir);

  const dumpPath = path.join(backupDir, `${DB_NAME}-${ts}.sql`);

  const args = ['--no-password', '-F', 'p'];
  if (DB_HOST) args.push('-h', DB_HOST);
  if (DB_PORT) args.push('-p', DB_PORT);
  if (DB_USER) args.push('-U', DB_USER);
  args.push(DB_NAME);

  const env = { ...process.env };
  if (DB_PASSWORD) env.PGPASSWORD = DB_PASSWORD;

  return new Promise((resolve, reject) => {
    const dump = spawn('pg_dump', args, {
      stdio: ['ignore', 'pipe', 'inherit'],
      env,
    });

    const outStream = fs.createWriteStream(dumpPath);
    dump.stdout.pipe(outStream);

    dump.on('error', (err) => {
      if (err && err.code === 'ENOENT') {
        reject(
          new Error(
            'Утилита pg_dump не найдена. Установите PostgreSQL client и добавьте pg_dump в PATH.'
          )
        );
        return;
      }
      reject(err);
    });

    dump.on('close', (code) => {
      outStream.close();
      if (code === 0) {
        resolve(dumpPath);
      } else {
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
  });
}

async function copyIfExists(srcRoot, destRoot, relativePath) {
  const src = path.join(srcRoot, relativePath);
  const dest = path.join(destRoot, relativePath);

  try {
    await fs.promises.access(src, fs.constants.F_OK);
  } catch {
    // nothing to copy
    return;
  }

  await ensureDir(path.dirname(dest));

  // Node 16.7+ has fs.cp
  if (typeof fs.promises.cp === 'function') {
    await fs.promises.cp(src, dest, { recursive: true, force: true });
  } else {
    // Fallback: simple file copy, without deep directory traversal
    const stat = await fs.promises.stat(src);
    if (stat.isDirectory()) {
      throw new Error(
        `fs.promises.cp не поддерживается, а путь ${relativePath} — директория. Обновите Node или настройте ручной бэкап файлов.`
      );
    }
    await fs.promises.copyFile(src, dest);
  }
}

async function backupStaticFiles() {
  const ts = getTimestamp();
  const projectRoot = path.join(__dirname, '..');
  const backupRoot = path.join(projectRoot, 'backups', 'files', ts);

  await ensureDir(backupRoot);

  const itemsToBackup = ['public', 'admin-subdomain', 'migrations', 'scripts', '.env'];

  for (const item of itemsToBackup) {
    // eslint-disable-next-line no-await-in-loop
    await copyIfExists(projectRoot, backupRoot, item);
  }

  return backupRoot;
}

async function main() {
  try {
    console.log('Starting backup...');
    const dbPath = await backupDatabase();
    console.log(`PostgreSQL dump created: ${dbPath}`);

    const filesPath = await backupStaticFiles();
    console.log(`Static files copied to: ${filesPath}`);

    console.log('Backup completed successfully.');
  } catch (err) {
    console.error('Backup failed:', err.message || err);
    process.exit(1);
  }
}

main();

