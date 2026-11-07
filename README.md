# Fintra

A personal finance tracker that runs only on this machine at http://localhost:3000.
All data lives in the local MongoDB (database `fintra`, collection `transactions`).

## Start

First time only:

```powershell
yarn install
yarn run import
```

Every day:

```powershell
yarn dev
```

Then open http://localhost:3000. The MongoDB Windows service starts by itself with the PC.

> Use `yarn run import`, not `yarn import`. `yarn import` is a built-in Yarn 1 command
> that has nothing to do with this script; it stops with "Lockfile already exists".

The app listens on 127.0.0.1 only, so it can't be reached from other devices on your network.

## Back up

**Automatic backups.** Set `BACKUP_DIR` in `.env.local` to a folder of your choice. The first time
the dashboard loads after the server starts, Fintra writes
`fintra-backup-YYYY-MM-DD_HH-mm.json` there, in the same format as the Export button. Click
**Backup now** in the header to take one at any time. The newest 30 are kept. Older files with that
exact name pattern are removed, and nothing else in the folder is touched. If a backup fails, a
warning appears at the top of the dashboard.

**Export button.** Click **Export Backup** in the header. This saves
`fintra-backup-YYYY-MM-DD_HH-mm.json` to the `backups/` folder in the project, in the same format as
`data/fintra-backup.json`. Exports are never removed automatically. The folder is listed in
`.gitignore`, so your transactions stay out of git.

**mongodump.** This needs the separate
[MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools) install:

```powershell
mongodump --uri="mongodb://127.0.0.1:27017" --db=fintra --out=C:\Backups\fintra
```

## Restore

**From a JSON backup**, either click **Import Backup** in the header, or run:

```powershell
yarn run import path\to\fintra-backup-YYYY-MM-DD.json
```

Both match transactions by `id`, so importing the same file twice never creates duplicates:

- Transactions missing from the database are added.
- A transaction that already exists is replaced only if the file's copy has a newer `updatedAt`,
  so an old backup can't undo later edits.
- Transactions that are in the database but not in the file are left alone.

**From mongodump:**

```powershell
mongorestore --uri="mongodb://127.0.0.1:27017" C:\Backups\fintra
```

`mongorestore` never removes existing data unless you pass `--drop`.
