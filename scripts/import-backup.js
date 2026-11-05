import { readFile } from "node:fs/promises";
import { closeMongo, getTransactions } from "../lib/mongo.js";
import { parseBackup, sumAmounts, upsertTransactions } from "../lib/transactions.js";

const DEFAULT_PATH = "data/fintra-backup.json";

const inr = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

async function main() {
  process.loadEnvFile(".env.local");

  const path = process.argv[2] ?? DEFAULT_PATH;
  const { docs, error } = parseBackup(JSON.parse(await readFile(path, "utf8")));
  if (error) throw new Error(error);

  const transactions = await getTransactions();
  const { inserted, updated, alreadyExisted } = await upsertTransactions(transactions, docs);

  const all = await transactions.find({}, { projection: { type: 1, amount: 1 } }).toArray();

  console.log(`File:             ${path} (${docs.length} transactions)`);
  console.log(`Inserted:         ${inserted}`);
  console.log(`Updated (newer):  ${updated}`);
  console.log(`Already existed:  ${alreadyExisted}`);
  console.log(`Total in DB:      ${all.length}`);
  console.log(`Total expenses:   ${inr(sumAmounts(all.filter((t) => t.type === "expense")))}`);
  console.log(`Total income:     ${inr(sumAmounts(all.filter((t) => t.type === "income")))}`);
}

main()
  .catch((err) => {
    console.error(`Import failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(closeMongo);
