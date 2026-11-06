"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  Loader2,
  Moon,
  Plus,
  Sun,
  TriangleAlert,
  Upload,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Charts } from "@/components/charts";
import { DatePicker } from "@/components/date-picker";
import { MonthComparison } from "@/components/month-comparison";
import { SummaryCards } from "@/components/summary-cards";
import { TransactionDialog } from "@/components/transaction-dialog";
import { TransactionsTable } from "@/components/transactions-table";
import { Button } from "@/components/ui/button";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { fetchJson, sendJson } from "@/lib/fetch-json";
import { formatDateTime, fromDateKey, getPeriodRange, PERIODS } from "@/lib/format";

const DEFAULT_OPTIONS = {
  expenseCategories: EXPENSE_CATEGORIES,
  incomeCategories: INCOME_CATEGORIES,
  paymentMethods: PAYMENT_METHODS,
  sources: INCOME_SOURCES,
};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

export function Dashboard() {
  const [period, setPeriod] = useState("this-month");
  const [customRange, setCustomRange] = useState(() => getPeriodRange("this-month"));
  const [stats, setStats] = useState(null);
  const [allTimeStats, setAllTimeStats] = useState(null);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [loadError, setLoadError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState({ open: false, transaction: null });
  const [importing, setImporting] = useState(false);
  const [backup, setBackup] = useState({ lastBackup: null, error: null });
  const [backingUp, setBackingUp] = useState(false);
  const fileInput = useRef(null);

  const range = useMemo(
    () => (period === "custom" ? customRange : getPeriodRange(period)),
    [period, customRange],
  );
  const refresh = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const query = new URLSearchParams(range).toString();

    Promise.all([
      fetchJson(`/api/stats?${query}`, { signal }),
      fetchJson("/api/stats", { signal }),
      fetchJson("/api/options", { signal }),
    ])
      .then(([periodStats, allStats, savedOptions]) => {
        setStats(periodStats);
        setAllTimeStats(allStats);
        setOptions(savedOptions);
        setLoadError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoadError(err.message);
      });

    return () => controller.abort();
  }, [range, refreshKey]);

  useEffect(() => {
    fetchJson("/api/backup")
      .then(setBackup)
      .catch((err) => setBackup((current) => ({ ...current, error: err.message })));
  }, []);

  async function handleBackup() {
    setBackingUp(true);
    try {
      const status = await sendJson("/api/backup", "POST", {});
      setBackup(status);
      if (status.error) toast.error("Backup failed", { description: status.error });
      else toast.success("Backup saved", { description: status.lastBackup.file });
    } catch (err) {
      setBackup((current) => ({ ...current, error: err.message }));
      toast.error("Backup failed", { description: err.message });
    } finally {
      setBackingUp(false);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires
    if (!file) return;

    setImporting(true);
    try {
      const { inserted, updated, alreadyExisted, total } = await sendJson(
        "/api/import",
        "POST",
        await file.text(),
      );
      toast.success("Import complete", {
        description: `${inserted} added, ${updated} updated, ${alreadyExisted} already existed. ${total} transactions in total.`,
      });
      refresh();
    } catch (err) {
      toast.error("Import failed", { description: err.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-6" />
          <h1 className="text-xl font-semibold tracking-tight">Fintra</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {backup.lastBackup
              ? `Last backup: ${formatDateTime(backup.lastBackup.at)}`
              : "Last backup: none yet"}
          </span>
          <Button variant="outline" disabled={backingUp} onClick={handleBackup}>
            {backingUp ? <Loader2 className="animate-spin" /> : <DatabaseBackup />}
            Backup now
          </Button>
          <Button onClick={() => setDialog({ open: true, transaction: null })}>
            <Plus />
            Add Transaction
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/export" download>
              <Download />
              Export Backup
            </a>
          </Button>
          <Button variant="outline" disabled={importing} onClick={() => fileInput.current.click()}>
            {importing ? <Loader2 className="animate-spin" /> : <Upload />}
            Import Backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
          <ThemeToggle />
        </div>
      </header>

      {backup.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <span>Backup failed: {backup.error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Period">
          {PERIODS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={period === value ? "default" : "ghost"}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <DatePicker
              className="w-36"
              aria-label="From date"
              value={customRange.from}
              disabledDays={{ after: fromDateKey(customRange.to) }}
              onChange={(from) => setCustomRange((current) => ({ ...current, from }))}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <DatePicker
              className="w-36"
              aria-label="To date"
              value={customRange.to}
              disabledDays={{ before: fromDateKey(customRange.from) }}
              onChange={(to) => setCustomRange((current) => ({ ...current, to }))}
            />
          </div>
        )}
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <span>Could not load your data: {loadError}</span>
          <Button size="sm" variant="outline" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}

      <SummaryCards totals={stats?.totals} />
      <Charts stats={stats} monthly={allTimeStats?.monthly} range={range} />
      <MonthComparison range={range} refreshKey={refreshKey} />
      <TransactionsTable
        range={range}
        refreshKey={refreshKey}
        options={options}
        onEdit={(transaction) => setDialog({ open: true, transaction })}
        onChanged={refresh}
      />

      <TransactionDialog
        open={dialog.open}
        transaction={dialog.transaction}
        options={options}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        onSaved={refresh}
      />
    </div>
  );
}
