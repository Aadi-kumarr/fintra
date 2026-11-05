import { ApiError, readJson, route } from "@/lib/api";
import { getTransactions } from "@/lib/mongo";
import { parseBackup, upsertTransactions } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const { docs, error } = parseBackup(await readJson(request));
  if (error) throw new ApiError(error);

  const transactions = await getTransactions();
  const counts = await upsertTransactions(transactions, docs);
  const total = await transactions.countDocuments();
  return Response.json({ ...counts, total });
});
