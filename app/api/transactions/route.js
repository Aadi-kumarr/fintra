import { ApiError, readJson, route } from "@/lib/api";
import { getTransactions } from "@/lib/mongo";
import { parseDateRange, parseTransactionInput } from "@/lib/transactions";

export const dynamic = "force-dynamic";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = route(async (request) => {
  const { searchParams } = new URL(request.url);
  const { error, dateFilter } = parseDateRange(searchParams);
  if (error) throw new ApiError(error);

  const filter = {};
  for (const field of ["type", "category", "paymentMethod"]) {
    const value = searchParams.get(field);
    if (value) filter[field] = value;
  }
  if (Object.keys(dateFilter).length) filter.date = dateFilter;

  const search = searchParams.get("search")?.trim();
  if (search) {
    const match = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ description: match }, { category: match }, { source: match }];
  }

  const transactions = await getTransactions();
  const docs = await transactions
    .find(filter, { projection: { _id: 0 } })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return Response.json(docs);
});

export const POST = route(async (request) => {
  const { value, error } = parseTransactionInput(await readJson(request));
  if (error) throw new ApiError(error);

  const now = new Date().toISOString();
  const doc = { id: crypto.randomUUID(), ...value, createdAt: now, updatedAt: now };

  const transactions = await getTransactions();
  await transactions.insertOne({ ...doc });
  return Response.json(doc, { status: 201 });
});
