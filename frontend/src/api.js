const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "שגיאה בתקשורת עם השרת");
  }
  return res.json();
}

export const api = {
  account: () => request("/account"),
  saveAccount: (openingBalance) =>
    request("/account", { method: "POST", body: JSON.stringify({ openingBalance }) }),
  summary: (month) => request(`/summary?month=${month}`),
  transactions: (month) => request(`/transactions?month=${month}`),
  addTransaction: (tx) => request("/transactions", { method: "POST", body: JSON.stringify(tx) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),
  adjustBalance: (amount, action) =>
    request("/balance", { method: "POST", body: JSON.stringify({ amount, action }) }),

  wishes: () => request("/wishes"),
  addWish: (wish) => request("/wishes", { method: "POST", body: JSON.stringify(wish) }),
  updateWish: (id, achieved) =>
    request(`/wishes/${id}`, { method: "PATCH", body: JSON.stringify({ achieved }) }),
  deleteWish: (id) => request(`/wishes/${id}`, { method: "DELETE" }),
};
