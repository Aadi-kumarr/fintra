import { ApiError, readJson, route } from "@/lib/api";
import { getTransactions } from "@/lib/mongo";
import { parseTransactionInput } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export const PUT = route(async (request, { params }) => {
  const { id } = await params;
  const changes = await readJson(request);

  const transactions = await getTransactions();
  const existing = await transactions.findOne({ id }, { projection: { _id: 0 } });
  if (!existing) throw new ApiError("Transaction not found", 404);

  const { value, error } = parseTransactionInput({ ...existing, ...changes });
  if (error) throw new ApiError(error);

  const updated = await transactions.findOneAndUpdate(
    { id },
    { $set: { ...value, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  return Response.json(updated);
});

export const DELETE = route(async (_request, { params }) => {
  const { id } = await params;

  const transactions = await getTransactions();
  const { deletedCount } = await transactions.deleteOne({ id });
  if (!deletedCount) throw new ApiError("Transaction not found", 404);

  return Response.json({ id });
});
