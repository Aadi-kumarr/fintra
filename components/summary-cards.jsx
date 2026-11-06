import { ArrowDownRight, ArrowUpRight, Percent, PiggyBank, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {title}
          <Icon className="size-4" />
        </div>
        <div className="truncate text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ totals }) {
  const money = (amount) => (totals ? formatINR(amount) : "—");
  const savingsRate = totals?.savingsRate == null ? "—" : `${totals.savingsRate.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <SummaryCard title="Total Income" value={money(totals?.income)} icon={ArrowUpRight} />
      <SummaryCard title="Spending" value={money(totals?.spending)} icon={ArrowDownRight} />
      <SummaryCard title="Invested" value={money(totals?.invested)} icon={TrendingUp} />
      <SummaryCard title="Net Savings" value={money(totals?.net)} icon={PiggyBank} />
      <SummaryCard title="Savings Rate" value={savingsRate} icon={Percent} />
    </div>
  );
}
