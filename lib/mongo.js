import { MongoClient } from "mongodb";

// Cached on globalThis so Next.js dev hot-reloads reuse one connection.
const cache = (globalThis._fintraMongo ??= {
  clientPromise: null,
  transactionsPromise: null,
});

function getClient() {
  if (!cache.clientPromise) {
    const url = process.env.MONGO_URL;
    if (!url) throw new Error("MONGO_URL is not set (see .env.example)");

    cache.clientPromise = new MongoClient(url, {
      serverSelectionTimeoutMS: 5000,
    })
      .connect()
      .catch((err) => {
        cache.clientPromise = null; // let the next request retry
        throw err;
      });
  }
  return cache.clientPromise;
}

async function openTransactions() {
  const dbName = process.env.DB_NAME;
  if (!dbName) throw new Error("DB_NAME is not set (see .env.example)");

  const client = await getClient();
  const transactions = client.db(dbName).collection("transactions");
  await transactions.createIndex({ id: 1 }, { unique: true });
  await transactions.createIndex({ date: -1 });
  return transactions;
}

export async function getTransactions() {
  cache.transactionsPromise ??= openTransactions().catch((err) => {
    cache.transactionsPromise = null;
    throw err;
  });
  return cache.transactionsPromise;
}

export async function closeMongo() {
  const clientPromise = cache.clientPromise;
  cache.clientPromise = null;
  cache.transactionsPromise = null;
  if (clientPromise) await (await clientPromise).close();
}
