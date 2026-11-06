import { route } from "@/lib/api";
import { toDateKey } from "@/lib/format";
import { getTransactions } from "@/lib/mongo";
import { buildBackup } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const backup = await buildBackup(await getTransactions());

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fintra-backup-${toDateKey(new Date())}.json"`,
    },
  });
});
