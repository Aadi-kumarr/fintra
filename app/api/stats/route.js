import { ApiError, route } from "@/lib/api";
import { getTransactions } from "@/lib/mongo";
import { isInvestment, isSpending, parseDateRange, sumAmounts } from "@/lib/transactions";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function groupTotals(items, field) {
  const groups = Map.groupBy(items, (item) => item[field] || "Unspecified");
  return [...groups]
    .map(([name, group]) => ({ name, amount: sumAmounts(group), count: group.length }))
    .sort((a, b) => b.amount - a.amount);
}

function monthlyTotals(docs) {
  if (docs.length === 0) return [];

  const byMonth = Map.groupBy(docs, (doc) => doc.date.slice(0, 7));
  const months = [...byMonth.keys()].sort();
  const [firstYear, firstMonth] = months[0].split("-").map(Number);
  const last = months.at(-1);

  // Months with no transactions still appear, as zero.
  const result = [];
  for (let i = 0; ; i++) {
    const date = new Date(Date.UTC(firstYear, firstMonth - 1 + i, 1));
    const month = date.toISOString().slice(0, 7);
    const group = byMonth.get(month) ?? [];
    result.push({
      month,
      income: sumAmounts(group.filter((doc) => doc.type === "income")),
      expense: sumAmounts(group.filter((doc) => doc.type === "expense")),
    });
    if (month === last) return result;
  }
}

function dailySpending(spendingDocs, range) {
  const days = spendingDocs.map((doc) => doc.date.slice(0, 10)).sort();
  const start = range.from ?? days[0];
  const end = range.to ?? days.at(-1);
  if (!start || !end) return [];

  const byDay = Map.groupBy(spendingDocs, (doc) => doc.date.slice(0, 10));
  const result = [];
  for (let time = Date.parse(start); time <= Date.parse(end); time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);
    result.push({ date, amount: sumAmounts(byDay.get(date) ?? []) });
  }
  return result;
}

export const GET = route(async (request) => {
  const { searchParams } = new URL(request.url);
  const { error, range, dateFilter } = parseDateRange(searchParams);
  if (error) throw new ApiError(error);

  const transactions = await getTransactions();
  const docs = await transactions
    .find(Object.keys(dateFilter).length ? { date: dateFilter } : {}, { projection: { _id: 0 } })
    .toArray();

  const expenses = docs.filter((doc) => doc.type === "expense");
  const incomes = docs.filter((doc) => doc.type === "income");
  const spendingDocs = docs.filter(isSpending);

  const income = sumAmounts(incomes);
  const expense = sumAmounts(expenses);
  const spending = sumAmounts(spendingDocs);
  const invested = sumAmounts(docs.filter(isInvestment));
  // Invested money is still saved, so only spending reduces net savings.
  const net = Math.round((income - spending) * 100) / 100;

  return Response.json({
    totals: {
      income,
      expense,
      spending,
      invested,
      net,
      savingsRate: income > 0 ? Math.round((net / income) * 10000) / 100 : null,
      count: docs.length,
    },
    byCategory: groupTotals(spendingDocs, "category"),
    byPaymentMethod: groupTotals(expenses, "paymentMethod"),
    bySource: groupTotals(incomes, "source"),
    monthly: monthlyTotals(docs),
    daily: dailySpending(spendingDocs, range),
  });
});
