import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { toDateKey } from "@/lib/format";
import { getTransactions } from "@/lib/mongo";
import { buildBackup } from "@/lib/transactions";

const KEEP_NEWEST = 30;

// Inside the project, so it must stay listed in .gitignore: these files are personal data.
const EXPORT_FOLDER = "backups";
const EXPORT_DIR = path.join(process.cwd(), EXPORT_FOLDER);

// Only files this pattern matches are ever pruned; anything else in the folder is left alone.
const BACKUP_FILE = /^fintra-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/;

// Cached on globalThis so a dev hot-reload doesn't count as an app start.
const cache = (globalThis._fintraBackup ??= { startup: null, error: null });

function backupFileName(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `fintra-backup-${toDateKey(date)}_${hours}-${minutes}.json`;
}

// Newest first: the timestamp in the name sorts chronologically.
async function listBackups(dir) {
  const names = await readdir(dir).catch((err) => {
    if (err.code === "ENOENT") return [];
    throw err;
  });
  return names.filter((name) => BACKUP_FILE.test(name)).sort().reverse();
}

async function writeBackupFile(dir) {
  const backup = await buildBackup(await getTransactions());
  // An empty backup must never push real ones out of the folder.
  if (backup.length === 0) throw new Error("The database has no transactions to back up");

  await mkdir(dir, { recursive: true });

  // Written under a temporary name first, so a crash can't leave a half-written backup.
  const name = backupFileName(new Date());
  const target = path.join(dir, name);
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(backup, null, 2));
    await rename(temporary, target);
  } catch (err) {
    await rm(temporary, { force: true });
    throw err;
  }
  return name;
}

async function writeBackup() {
  const dir = process.env.BACKUP_DIR;
  if (!dir) throw new Error("BACKUP_DIR is not set (see .env.example)");

  await writeBackupFile(dir);

  const expired = (await listBackups(dir)).slice(KEEP_NEWEST);
  await Promise.all(expired.map((name) => rm(path.join(dir, name))));
}

// Exports are kept until you delete them, unlike the rotating BACKUP_DIR files.
export async function exportBackup() {
  const file = await writeBackupFile(EXPORT_DIR);
  return { file, folder: EXPORT_FOLDER };
}

export async function runBackup() {
  try {
    await writeBackup();
    cache.error = null;
  } catch (err) {
    console.error("Backup failed:", err);
    cache.error = err.message;
  }
}

// The first call after the server starts takes the startup backup.
export async function ensureStartupBackup() {
  cache.startup ??= runBackup();
  await cache.startup;
}

export async function getBackupStatus() {
  const dir = process.env.BACKUP_DIR;
  const [newest] = dir ? await listBackups(dir).catch(() => []) : [];
  const lastBackup = newest
    ? { file: newest, at: (await stat(path.join(dir, newest))).mtime.toISOString() }
    : null;
  return { lastBackup, error: cache.error };
}
