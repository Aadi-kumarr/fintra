"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactINR, formatDate, formatDayMonth, formatINR, formatMonth } from "@/lib/format";

// Each category keeps its colour whatever its rank. Eight hues is the limit,
// so Miscellaneous and any custom categories share the neutral.
const CATEGORY_COLORS = {
  Food: "var(--series-1)",
  Travel: "var(--series-2)",
  Bills: "var(--series-3)",
  Rent: "var(--series-4)",
  Shopping: "var(--series-5)",
  Fuel: "var(--series-6)",
  Investments: "var(--series-7)",
  Entertainment: "var(--series-8)",
};
const OTHER_COLOR = "var(--series-other)";
const INCOME_COLOR = "var(--series-1)";
const EXPENSE_COLOR = "var(--series-2)";

const AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "var(--chart-text)", fontSize: 12 },
};

function ChartCard({ title, description, className, children }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function TooltipBox({ title, rows }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{title}</div>
      {rows.map(({ label, value, color }) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {color && <span className="size-2 rounded-full" style={{ background: color }} />}
            {label}
          </span>
          <span className="tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, amount, count, fill } = payload[0].payload;
  return (
    <TooltipBox
      title={name}
      rows={[
        { label: "Spent", value: formatINR(amount), color: fill },
        { label: "Share", value: `${((amount / total) * 100).toFixed(1)}%` },
        { label: "Transactions", value: count },
      ]}
    />
  );
}

function CategoryDonut({ categories, total }) {
  if (categories.length === 0) return <EmptyChart message="No spending in this period" />;

  const slices = categories.map((category) => ({
    ...category,
    fill: CATEGORY_COLORS[category.name] ?? OTHER_COLOR,
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-60 w-full max-w-60 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="name"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Tooltip content={<CategoryTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold">{formatCompactINR(total)}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-1.5 text-sm">
        {slices.map(({ name, amount, fill }) => (
          <li key={name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: fill }} />
            <span className="truncate">{name}</span>
            <span className="ml-auto text-muted-foreground tabular-nums">
              {((amount / total) * 100).toFixed(1)}%
            </span>
            <span className="w-28 text-right tabular-nums">{formatINR(amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthlyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { month, income, expense } = payload[0].payload;
  return (
    <TooltipBox
      title={formatMonth(month)}
      rows={[
        { label: "Income", value: formatINR(income), color: INCOME_COLOR },
        { label: "Expense", value: formatINR(expense), color: EXPENSE_COLOR },
        { label: "Net", value: formatINR(income - expense) },
      ]}
    />
  );
}

function LegendItem({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function MonthlyBars({ monthly, range }) {
  if (monthly.length === 0) return <EmptyChart message="No transactions yet" />;

  const isSelected = ({ month }) =>
    (!range.from || month >= range.from.slice(0, 7)) &&
    (!range.to || month <= range.to.slice(0, 7));
  const barCells = monthly.map((entry) => (
    <Cell key={entry.month} fillOpacity={isSelected(entry) ? 1 : 0.3} />
  ));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <LegendItem color={INCOME_COLOR} label="Income" />
        <LegendItem color={EXPENSE_COLOR} label="Expense" />
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={16} {...AXIS_PROPS} />
            <YAxis tickFormatter={formatCompactINR} width={56} {...AXIS_PROPS} />
            <Tooltip content={<MonthlyTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar
              dataKey="income"
              fill={INCOME_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            >
              {barCells}
            </Bar>
            <Bar
              dataKey="expense"
              fill={EXPENSE_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            >
              {barCells}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, amount } = payload[0].payload;
  return (
    <TooltipBox
      title={formatDate(date)}
      rows={[{ label: "Spent", value: formatINR(amount), color: EXPENSE_COLOR }]}
    />
  );
}

function DailyTrend({ daily }) {
  if (!daily.some((day) => day.amount > 0)) {
    return <EmptyChart message="No spending in this period" />;
  }

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="date" tickFormatter={formatDayMonth} minTickGap={32} {...AXIS_PROPS} />
          <YAxis tickFormatter={formatCompactINR} width={56} {...AXIS_PROPS} />
          <Tooltip content={<DailyTooltip />} cursor={{ stroke: "var(--chart-axis)" }} />
          <Line
            type="linear"
            dataKey="amount"
            stroke={EXPENSE_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Charts({ stats, monthly, range }) {
  if (!stats || !monthly) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Spending by category" description="Selected period">
        <CategoryDonut categories={stats.byCategory} total={stats.totals.spending} />
      </ChartCard>
      <ChartCard
        title="Monthly income vs expense"
        description="All months, with the selected period highlighted"
      >
        <MonthlyBars monthly={monthly} range={range} />
      </ChartCard>
      <ChartCard title="Daily spending" description="Selected period" className="lg:col-span-2">
        <DailyTrend daily={stats.daily} />
      </ChartCard>
    </div>
  );
}
