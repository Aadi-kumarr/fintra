"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchJson } from "@/lib/fetch-json";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const ALL = "all";

function FilterSelect({ label, value, onChange, items }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.value ?? item} value={item.value ?? item}>
            {item.label ?? item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortableHead({ label, field, sort, onSort, className }) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = !active ? "none" : sort.direction === "asc" ? "ascending" : "descending";

  return (
    <TableHead aria-sort={ariaSort} className={className}>
      <Button variant="ghost" size="sm" className="-mx-2.5" onClick={() => onSort(field)}>
        {label}
        <Icon className={cn(!active && "opacity-40")} />
      </Button>
    </TableHead>
  );
}

export function TransactionsTable({ range, refreshKey, options, onEdit, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [paymentMethod, setPaymentMethod] = useState(ALL);
  const [sort, setSort] = useState({ field: "date", direction: "desc" });
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = useMemo(() => {
    const params = new URLSearchParams(range);
    if (search.trim()) params.set("search", search.trim());
    if (type !== ALL) params.set("type", type);
    if (category !== ALL) params.set("category", category);
    if (paymentMethod !== ALL) params.set("paymentMethod", paymentMethod);
    return params.toString();
  }, [range, search, type, category, paymentMethod]);

  useEffect(() => setPage(1), [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchJson(`/api/transactions?${query}`, { signal: controller.signal })
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setLoading(false);
        toast.error("Could not load transactions", { description: err.message });
      });
    return () => controller.abort();
  }, [query, refreshKey]);

  const sorted = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return rows.toSorted((a, b) => {
      if (sort.field === "amount") return (a.amount - b.amount) * direction;
      return a.date.localeCompare(b.date) * direction;
    });
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount); // a delete can empty the last page
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(firstIndex, firstIndex + PAGE_SIZE);

  const categories = useMemo(() => {
    if (type === "expense") return options.expenseCategories;
    if (type === "income") return options.incomeCategories;
    return [...new Set([...options.expenseCategories, ...options.incomeCategories])];
  }, [type, options]);

  function handleTypeChange(next) {
    setType(next);
    setCategory(ALL);
  }

  function handleSort(field) {
    setSort((current) =>
      current.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "desc" },
    );
    setPage(1);
  }

  async function handleDelete() {
    try {
      await fetchJson(`/api/transactions/${deleting.id}`, { method: "DELETE" });
      toast.success("Transaction deleted");
      onChanged();
    } catch (err) {
      toast.error("Could not delete", { description: err.message });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search description, category or source"
              aria-label="Search transactions"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <FilterSelect
            label="Types"
            value={type}
            onChange={handleTypeChange}
            items={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
          <FilterSelect
            label="Categories"
            value={category}
            onChange={setCategory}
            items={categories}
          />
          <FilterSelect
            label="Payment methods"
            value={paymentMethod}
            onChange={setPaymentMethod}
            items={options.paymentMethods}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Date" field="date" sort={sort} onSort={handleSort} />
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment / Source</TableHead>
              <SortableHead
                label="Amount"
                field="amount"
                sort={sort}
                onSort={handleSort}
                className="text-right"
              />
              <TableHead className="w-20">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((transaction) => {
              const isIncome = transaction.type === "income";
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                  <TableCell className="max-w-72 truncate">{transaction.description || "—"}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>
                    {(isIncome && transaction.source) || transaction.paymentMethod || "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium whitespace-nowrap tabular-nums",
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatINR(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${transaction.description || transaction.category}`}
                      onClick={() => onEdit(transaction)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${transaction.description || transaction.category}`}
                      onClick={() => setDeleting(transaction)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {loading ? "Loading..." : "No transactions match these filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {sorted.length === 0
              ? "0 transactions"
              : `${firstIndex + 1}–${firstIndex + pageRows.length} of ${sorted.length}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `${deleting.description || deleting.category}, ${formatINR(deleting.amount)} on ${formatDate(deleting.date)}. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
