"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchJson } from "@/lib/fetch-json";
import { formatINR, formatMonth, toDateKey } from "@/lib/format";

// The period's month when it covers a single month, otherwise the current month.
function selectedMonth({ from, to }) {
  const month = from?.slice(0, 7);
  return month && month === to?.slice(0, 7) ? month : toDateKey(new Date()).slice(0, 7);
}

function describeHistory(monthsUsed) {
  if (monthsUsed.length === 1) return `Average of ${formatMonth(monthsUsed[0])}`;
  const span = `${formatMonth(monthsUsed[0])} to ${formatMonth(monthsUsed.at(-1))}`;
  return `Average of ${monthsUsed.length} complete months, ${span}`;
}

function signed(value, text) {
  return value > 0 ? `+${text}` : text;
}

function ComparisonRow({ row }) {
  const { category, amount, average, difference, percent, isHigh } = row;
  return (
    <TableRow className={isHigh ? "bg-destructive/10 font-medium" : undefined}>
      <TableCell>
        <span className="flex items-center gap-2">
          {category}
          {isHigh && (
            <TriangleAlert
              className="size-4 text-destructive"
              role="img"
              aria-label="More than 25% above average"
            />
          )}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatINR(amount)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatINR(average)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {signed(difference, formatINR(difference))}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {percent === null ? "New" : signed(percent, `${percent.toFixed(1)}%`)}
      </TableCell>
    </TableRow>
  );
}

export function MonthComparison({ range, refreshKey }) {
  const month = selectedMonth(range);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchJson(`/api/month-compare?month=${month}`, { signal: controller.signal })
      .then((result) => {
        setComparison(result);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => controller.abort();
  }, [month, refreshKey]);

  const hasHistory = comparison?.monthsUsed.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatMonth(month)} vs average</CardTitle>
        <CardDescription>
          {hasHistory ? describeHistory(comparison.monthsUsed) : "Spending by category"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">Could not load the comparison: {error}</p>}
        {!error && comparison && !hasHistory && (
          <p className="text-sm text-muted-foreground">
            No complete earlier months to compare with yet.
          </p>
        )}
        {!error && hasHistory && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">This month</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.rows.map((row) => (
                <ComparisonRow key={row.category} row={row} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
