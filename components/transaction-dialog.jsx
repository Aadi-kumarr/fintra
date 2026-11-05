"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Combobox } from "@/components/combobox";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendJson } from "@/lib/fetch-json";
import { toDateKey } from "@/lib/format";

function initialForm(transaction) {
  if (transaction) {
    return {
      ...transaction,
      amount: String(transaction.amount),
      date: transaction.date.slice(0, 10),
    };
  }
  return {
    type: "expense",
    amount: "",
    date: toDateKey(new Date()),
    category: "",
    source: "",
    paymentMethod: "UPI",
    description: "",
  };
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Mounted fresh each time the dialog opens, so its state never goes stale.
function TransactionForm({ transaction, options, onCancel, onSaved }) {
  const [form, setForm] = useState(() => initialForm(transaction));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (changes) => setForm((current) => ({ ...current, ...changes }));
  const isIncome = form.type === "income";
  const categories = isIncome ? options.incomeCategories : options.expenseCategories;

  async function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);
    const found = {};
    if (!(amount > 0)) found.amount = "Enter an amount greater than 0";
    if (!form.category) found.category = "Choose a category";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const body = {
        type: form.type,
        amount,
        date: form.date,
        category: form.category,
        source: form.source,
        paymentMethod: form.paymentMethod,
        description: form.description,
      };
      if (transaction) await sendJson(`/api/transactions/${transaction.id}`, "PUT", body);
      else await sendJson("/api/transactions", "POST", body);

      toast.success(transaction ? "Transaction updated" : "Transaction added");
      onSaved();
    } catch (err) {
      toast.error("Could not save", { description: err.message });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Tabs
        value={form.type}
        onValueChange={(type) => update({ type, category: "" })}
      >
        <TabsList className="w-full">
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (₹)" htmlFor="amount" error={errors.amount}>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            autoFocus
            aria-invalid={Boolean(errors.amount) || undefined}
            value={form.amount}
            onChange={(event) => update({ amount: event.target.value })}
          />
        </Field>
        <Field label="Date" htmlFor="date">
          <DatePicker
            id="date"
            className="w-full"
            value={form.date}
            onChange={(date) => update({ date })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" htmlFor="category" error={errors.category}>
          <Combobox
            id="category"
            placeholder="Select"
            options={categories}
            value={form.category}
            invalid={Boolean(errors.category)}
            onChange={(category) => update({ category })}
          />
        </Field>
        <Field label="Payment method" htmlFor="paymentMethod">
          <Combobox
            id="paymentMethod"
            placeholder="Select"
            options={options.paymentMethods}
            value={form.paymentMethod}
            onChange={(paymentMethod) => update({ paymentMethod })}
          />
        </Field>
      </div>

      {isIncome && (
        <Field label="Source" htmlFor="source">
          <Combobox
            id="source"
            placeholder="Who paid you?"
            options={options.sources}
            value={form.source}
            onChange={(source) => update({ source })}
          />
        </Field>
      )}

      <Field label="Description" htmlFor="description">
        <Input
          id="description"
          placeholder="What was it for?"
          value={form.description}
          onChange={(event) => update({ description: event.target.value })}
        />
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TransactionDialog({ open, transaction, options, onOpenChange, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            {transaction ? "Update the details below." : "Future dates are fine for planned entries."}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          transaction={transaction}
          options={options}
          onCancel={() => onOpenChange(false)}
          onSaved={() => {
            onOpenChange(false);
            onSaved();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
