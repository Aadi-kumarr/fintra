import { route } from "@/lib/api";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { getTransactions } from "@/lib/mongo";

export const dynamic = "force-dynamic";

// Defaults first, then any custom values already saved.
const merge = (defaults, saved) => [...new Set([...defaults, ...saved.filter(Boolean).sort()])];

export const GET = route(async () => {
  const transactions = await getTransactions();
  const [expense, income, paymentMethods, sources] = await Promise.all([
    transactions.distinct("category", { type: "expense" }),
    transactions.distinct("category", { type: "income" }),
    transactions.distinct("paymentMethod"),
    transactions.distinct("source"),
  ]);

  return Response.json({
    expenseCategories: merge(EXPENSE_CATEGORIES, expense),
    incomeCategories: merge(INCOME_CATEGORIES, income),
    paymentMethods: merge(PAYMENT_METHODS, paymentMethods),
    sources: merge(INCOME_SOURCES, sources),
  });
});
