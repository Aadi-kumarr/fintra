import { route } from "@/lib/api";
import { toDateKey } from "@/lib/format";
import { getTransactions } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const transactions = await getTransactions();
  const docs = await transactions
    .find({}, { projection: { _id: 0 } })
    .sort({ date: -1, createdAt: -1 })
    .toArray();

  // Rebuilt field by field so the file keeps the key order of the original backup.
  const backup = docs.map((doc) => ({
    id: doc.id,
    type: doc.type,
    amount: doc.amount,
    date: doc.date,
    category: doc.category,
    source: doc.source,
    paymentMethod: doc.paymentMethod,
    description: doc.description,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fintra-backup-${toDateKey(new Date())}.json"`,
    },
  });
});
