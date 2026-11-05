// Small formatting helpers shared by the pages.
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

export const money = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

export const monthName = (month) =>
  new Date(month + "-01T00:00:00").toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

export const shortDate = (date) =>
  new Date(date + "T00:00:00").toLocaleDateString("he-IL");
