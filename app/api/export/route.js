import { readJson, route } from "@/lib/api";
import { exportBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  await readJson(request);
  return Response.json(await exportBackup());
});
