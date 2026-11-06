import { readJson, route } from "@/lib/api";
import { ensureStartupBackup, getBackupStatus, runBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await ensureStartupBackup();
  return Response.json(await getBackupStatus());
});

export const POST = route(async (request) => {
  await readJson(request);
  await runBackup();
  return Response.json(await getBackupStatus());
});
