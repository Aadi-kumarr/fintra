// Server-side transaction rules, shared by the API routes and scripts/import-backup.js.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_FIELDS = ["source", "paymentMethod", "description"];

// Returns the canonical ISO string, or null if the value is not a real date.
export function normalizeDate(value) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const iso = date.toISOString();
  if (DATE_ONLY.test(value) && !iso.startsWith(value)) return null; // e.g. 2026-02-31
  return iso;
}

function findFieldError(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return "Transaction must be an object";
  }
  if (input.type !== "expense" && input.type !== "income") {
    return "type must be expense or income";
  }
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    return "amount must be a number greater than 0";
  }
  if (!normalizeDate(input.date)) return "date is required and must be a valid date";
  if (typeof input.category !== "string" || !input.category.trim()) {
    return "category is required";
  }
  for (const field of TEXT_FIELDS) {
    if (input[field] !== undefined && typeof input[field] !== "string") {
      return `${field} must be a string`;
    }
  }
  return null;
}

// Validates POST/PUT input and returns only the fields a client may set.
export function parseTransactionInput(input) {
  const error = findFieldError(input);
  if (error) return { error };

  return {
    value: {
      type: input.type,
      amount: input.amount,
      date: normalizeDate(input.date),
      category: input.category.trim(),
      source: input.type === "income" ? (input.source ?? "").trim() : "",
      paymentMethod: (input.paymentMethod ?? "").trim(),
      description: (input.description ?? "").trim(),
    },
  };
}

// Validates a backup array. Values are kept verbatim so a restore is faithful.
export function parseBackup(data) {
  if (!Array.isArray(data)) return { error: "Backup must be a JSON array of transactions" };

  const now = new Date().toISOString();
  const docs = [];
  for (const [index, item] of data.entries()) {
    const error =
      findFieldError(item) ?? (typeof item.id === "string" && item.id ? null : "id is required");
    if (error) return { error: `Item ${index + 1}: ${error}` };

    docs.push({
      id: item.id,
      type: item.type,
      amount: item.amount,
      date: normalizeDate(item.date),
      category: item.category,
      source: item.source ?? "",
      paymentMethod: item.paymentMethod ?? "",
      description: item.description ?? "",
      createdAt: normalizeDate(item.createdAt) ?? now,
      updatedAt: normalizeDate(item.updatedAt) ?? now,
    });
  }
  return { docs };
}

// Upserts by id. An existing record is only replaced by a strictly newer copy,
// so re-importing an old backup can never undo edits made in the app.
export async function upsertTransactions(transactions, docs) {
  if (docs.length === 0) return { inserted: 0, updated: 0, alreadyExisted: 0 };

  const { upsertedCount: inserted } = await transactions.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { id: doc.id },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    })),
  );
  const { modifiedCount: updated } = await transactions.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { id: doc.id, updatedAt: { $lt: doc.updatedAt } },
        update: { $set: doc },
      },
    })),
  );
  return { inserted, updated, alreadyExisted: docs.length - inserted - updated };
}

// Summing in paise avoids floating point drift on rupee amounts.
export function sumAmounts(items) {
  return items.reduce((paise, item) => paise + Math.round(item.amount * 100), 0) / 100;
}

// from/to are calendar days (YYYY-MM-DD or ISO), inclusive. Stored dates are
// uniform ISO strings, so comparing them as strings is chronological.
export function parseDateRange(searchParams) {
  const range = {};
  for (const key of ["from", "to"]) {
    const value = searchParams.get(key);
    if (!value) continue;
    const iso = normalizeDate(value);
    if (!iso) return { error: `${key} must be a valid date` };
    range[key] = iso.slice(0, 10);
  }
  if (range.from && range.to && range.from > range.to) {
    return { error: "from must not be after to" };
  }

  const dateFilter = {};
  if (range.from) dateFilter.$gte = `${range.from}T00:00:00.000Z`;
  if (range.to) dateFilter.$lte = `${range.to}T23:59:59.999Z`;
  return { range, dateFilter };
}
