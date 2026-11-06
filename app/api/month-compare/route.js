import { ApiError, route } from "@/lib/api";
import { toDateKey } from "@/lib/format";
import { getTransactions } from "@/lib/mongo";
import { isSpending, sumAmounts } from "@/lib/transactions";

export const dynamic = "force-dynamic";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_HISTORY_MONTHS = 6;
const HIGH_RATIO = 1.25;

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;

function categoryTotals(docs = []) {
  const groups = Map.groupBy(docs, (doc) => doc.category);
  return new Map([...groups].map(([category, group]) => [category, sumAmounts(group)]));
}

function compareMonth(docs, month, currentMonth) {
  const byMonth = Map.groupBy(docs, (doc) => doc.date.slice(0, 7));

  // Only months before both the selected month and the current one are complete.
  // Months with no spending are not in byMonth, so they are skipped.
  const monthsUsed = [...byMonth.keys()]
    .filter((key) => key < month && key < currentMonth)
    .sort()
    .slice(-MAX_HISTORY_MONTHS);

  const selected = categoryTotals(byMonth.get(month));
  const history = monthsUsed.map((key) => categoryTotals(byMonth.get(key)));
  const categories = new Set([...selected.keys(), ...history.flatMap((totals) => [...totals.keys()])]);

  const rows = [...categories].map((category) => {
    const amount = selected.get(category) ?? 0;
    // A used month without this category counts as zero, so the average is per month.
    const sum = history.reduce((total, totals) => total + (totals.get(category) ?? 0), 0);
    const average = monthsUsed.length ? round(sum / monthsUsed.length, 2) : 0;
    const difference = round(amount - average, 2);
    return {
      category,
      amount,
      average,
      difference,
      percent: average > 0 ? round((difference / average) * 100, 1) : null,
      isHigh: average > 0 && amount > average * HIGH_RATIO,
    };
  });

  rows.sort((a, b) => b.amount - a.amount || b.average - a.average);
  return { month, monthsUsed, rows };
}

export const GET = route(async (request) => {
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !MONTH.test(month)) throw new ApiError("month must be in YYYY-MM format");

  const transactions = await getTransactions();
  const docs = await transactions.find({ type: "expense" }, { projection: { _id: 0 } }).toArray();

  return Response.json(
    compareMonth(docs.filter(isSpending), month, toDateKey(new Date()).slice(0, 7)),
  );
});
