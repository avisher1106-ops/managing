const STORAGE_KEY = "my-finance-data-v1";

function emptyStore() {
  return {
    account: null,
    transactions: [],
    adjustments: [],
    wishes: [],
    counters: { transaction: 0, adjustment: 0, wish: 0 },
  };
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function localToday() {
  return new Date().toLocaleDateString("en-CA");
}

let memoryStore = null;

function readStore() {
  if (memoryStore) return memoryStore;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw);
    const data = { ...emptyStore(), ...(parsed || {}) };
    data.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    data.adjustments = Array.isArray(data.adjustments) ? data.adjustments : [];
    data.wishes = Array.isArray(data.wishes) ? data.wishes : [];
    data.account =
      data.account && Number.isFinite(Number(data.account.openingBalance))
        ? { openingBalance: round2(data.account.openingBalance) }
        : null;
    data.counters = { ...emptyStore().counters, ...(parsed?.counters || {}) };
    data.counters.transaction = Math.max(
      Number(data.counters.transaction) || 0,
      data.transactions.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    );
    data.counters.adjustment = Math.max(
      Number(data.counters.adjustment) || 0,
      data.adjustments.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    );
    data.counters.wish = Math.max(
      Number(data.counters.wish) || 0,
      data.wishes.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    );

    return data;
  } catch {
    memoryStore = emptyStore();
    return memoryStore;
  }
}

function writeStore(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    memoryStore = null;
  } catch {
    memoryStore = data;
  }
}

function nextId(data, key) {
  data.counters[key] = (Number(data.counters[key]) || 0) + 1;
  return data.counters[key];
}

async function account() {
  const data = readStore();
  if (!data.account) {
    return { configured: false, openingBalance: 0 };
  }
  return { configured: true, openingBalance: data.account.openingBalance };
}

async function saveAccount(openingBalance) {
  const amount = round2(openingBalance);
  if (!Number.isFinite(amount)) throw new Error("סכום לא תקין");
  if (amount < 0) throw new Error("הסכום לא יכול להיות שלילי");

  const data = readStore();
  data.account = { openingBalance: amount };
  writeStore(data);
  return { configured: true, openingBalance: amount };
}

async function summary(month) {
  const monthKey = month || localToday().slice(0, 7);
  const data = readStore();

  const monthly = data.transactions.filter(
    (item) => String(item.date || "").slice(0, 7) === monthKey
  );
  const income = round2(
    monthly
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0)
  );
  const expense = round2(
    monthly
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0)
  );
  const totalIncome = round2(
    data.transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0)
  );
  const totalExpense = round2(
    data.transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0)
  );
  const adjustments = round2(
    data.adjustments.reduce((sum, item) => sum + Number(item.amount), 0)
  );
  const openingBalance = data.account ? data.account.openingBalance : 0;

  return {
    month: monthKey,
    income,
    expense,
    savings: round2(income - expense),
    totalIncome,
    totalExpense,
    adjustments,
    openingBalance,
    configured: Boolean(data.account),
    balance: round2(openingBalance + totalIncome - totalExpense + adjustments),
  };
}

async function transactions(month, type) {
  const data = readStore();
  let items = data.transactions.filter(
    (item) => !month || String(item.date || "").slice(0, 7) === month
  );
  if (type) {
    items = items.filter((item) => item.type === type);
  }

  return items
    .slice()
    .sort(
      (a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")) ||
        Number(b.id) - Number(a.id)
    )
    .map((item) => ({
      id: item.id,
      type: item.type,
      amount: round2(item.amount),
      description: item.description,
      date: item.date,
    }));
}

async function addTransaction(tx) {
  const type = tx?.type;
  if (type !== "income" && type !== "expense") {
    throw new Error("סוג התנועה חייב להיות income או expense");
  }

  const amount = round2(tx?.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("הסכום חייב להיות גדול מאפס");
  }

  const description = String(tx?.description ?? "").trim();
  if (!description) throw new Error("חסר תיאור לתנועה");

  const date = tx?.date || localToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("תאריך לא תקין");

  const data = readStore();
  const id = nextId(data, "transaction");
  data.transactions.push({ id, type, amount, description, date });
  writeStore(data);
  return { id };
}

async function deleteTransaction(id) {
  const data = readStore();
  data.transactions = data.transactions.filter(
    (item) => Number(item.id) !== Number(id)
  );
  writeStore(data);
  return { ok: true };
}

async function adjustBalance(amount, action) {
  if (action !== "add" && action !== "subtract") {
    throw new Error("action must be add or subtract");
  }

  const value = round2(amount ?? 0);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("הסכום חייב להיות גדול מאפס");
  }

  const data = readStore();
  const id = nextId(data, "adjustment");
  data.adjustments.push({
    id,
    amount: action === "add" ? value : -value,
  });
  writeStore(data);
  return { id };
}

async function wishes() {
  const data = readStore();
  return data.wishes
    .slice()
    .sort(
      (a, b) =>
        Number(Boolean(a.achieved)) - Number(Boolean(b.achieved)) ||
        Number(b.id) - Number(a.id)
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price == null ? null : round2(item.price),
      achieved: item.achieved ? 1 : 0,
    }));
}

async function addWish(wish) {
  const title = String(wish?.title ?? "").trim();
  if (!title) throw new Error("חסר שם לרצון");

  let price = null;
  const rawPrice = wish?.price;
  if (
    rawPrice !== undefined &&
    rawPrice !== null &&
    rawPrice !== "" &&
    Number(rawPrice) !== 0
  ) {
    const value = round2(rawPrice);
    if (!Number.isFinite(value)) throw new Error("מחיר לא תקין");
    price = value;
  }

  const data = readStore();
  const id = nextId(data, "wish");
  data.wishes.push({ id, title, price, achieved: 0 });
  writeStore(data);
  return { id };
}

async function updateWish(id, achieved) {
  const data = readStore();
  const wish = data.wishes.find((item) => Number(item.id) === Number(id));
  if (wish) {
    wish.achieved = achieved ? 1 : 0;
  }
  writeStore(data);
  return { ok: true };
}

async function deleteWish(id) {
  const data = readStore();
  data.wishes = data.wishes.filter((item) => Number(item.id) !== Number(id));
  writeStore(data);
  return { ok: true };
}

export const api = {
  account,
  saveAccount,
  summary,
  transactions,
  addTransaction,
  deleteTransaction,
  adjustBalance,
  wishes,
  addWish,
  updateWish,
  deleteWish,
};
