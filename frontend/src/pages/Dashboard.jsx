import { useEffect, useState } from "react";
import { api } from "../api";
import { money, monthName, shortDate, today } from "../format";

export default function Dashboard() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    savings: 0,
    totalIncome: 0,
    totalExpense: 0,
    adjustments: 0,
    openingBalance: 0,
    balance: 0,
  });
  const [items, setItems] = useState([]);
  const [manualAmount, setManualAmount] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    date: today(),
  });
  const [error, setError] = useState("");

  // Load the summary and the transactions of the selected month.
  async function load() {
    try {
      const [s, t] = await Promise.all([api.summary(month), api.transactions(month)]);
      setSummary(s);
      setItems(t);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [month]);

  async function add(event) {
    event.preventDefault();
    try {
      await api.addTransaction({ ...form, amount: Number(form.amount) });
      setForm({ ...form, amount: "", description: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("למחוק את התנועה?")) return;
    try {
      await api.deleteTransaction(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Manually add or subtract an amount from the total balance.
  async function adjustBalance(action) {
    const amount = Number(manualAmount);
    if (!amount || amount <= 0) return;
    setSavingManual(true);
    try {
      await api.adjustBalance(amount, action);
      setManualAmount("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingManual(false);
    }
  }

  const expenses = items.filter((item) => item.type === "expense");
  const incomes = items.filter((item) => item.type === "income");

  return (
    <>
      <section className="hero">
        <div>
          <h1>סיכום חודשי</h1>
          <p>{monthName(month)}</p>
        </div>
        <input
          className="month-input"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </section>

      {error && <p className="error">{error}</p>}

      <section className={`balance-card ${summary.balance < 0 ? "negative" : ""}`}>
        <div className="balance-main">
          <span className="balance-label">יתרה כוללת בחשבון</span>
          <strong className="balance-value">{money.format(summary.balance)}</strong>
          <small>כולל יתרת פתיחה ועדכונים ידניים</small>

          <div className="balance-actions">
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="סכום"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
            />
            <button
              type="button"
              className="btn add"
              title="הוסף ליתרה"
              aria-label="הוסף סכום ליתרה"
              disabled={savingManual || Number(manualAmount) <= 0}
              onClick={() => adjustBalance("add")}
            >
              + הוסף
            </button>
            <button
              type="button"
              className="btn withdraw"
              title="הורד מהיתרה"
              aria-label="הורד סכום מהיתרה"
              disabled={savingManual || Number(manualAmount) <= 0}
              onClick={() => adjustBalance("subtract")}
            >
              − הורד
            </button>
          </div>
        </div>
        <div className="balance-meta">
          <div>
            <span>סה״כ הכנסות</span>
            <b>{money.format(summary.totalIncome)}</b>
          </div>
          <div>
            <span>סה״כ הוצאות</span>
            <b>{money.format(summary.totalExpense)}</b>
          </div>
          {summary.openingBalance !== 0 && (
            <div>
              <span>יתרת פתיחה</span>
              <b>{money.format(summary.openingBalance)}</b>
            </div>
          )}
          {summary.adjustments !== 0 && (
            <div>
              <span>עדכון ידני</span>
              <b>{money.format(summary.adjustments)}</b>
            </div>
          )}
        </div>
      </section>

      <section className="cards">
        <Stat label="הכנסות" value={summary.income} tone="green" />
        <Stat label="הוצאות" value={summary.expense} tone="red" />
        <Stat
          label="נחסך החודש"
          value={summary.savings}
          tone={summary.savings >= 0 ? "blue" : "red"}
        />
      </section>

      <form className="card add-form" onSubmit={add}>
        <h2>הוספת תנועה</h2>

        <div className="segmented">
          <button
            type="button"
            className={form.type === "income" ? "active income" : ""}
            onClick={() => setForm({ ...form, type: "income" })}
          >
            הכנסה
          </button>
          <button
            type="button"
            className={form.type === "expense" ? "active expense" : ""}
            onClick={() => setForm({ ...form, type: "expense" })}
          >
            הוצאה
          </button>
        </div>

        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="סכום"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder={form.type === "income" ? "מאיפה ההכנסה?" : "על מה יצא?"}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <button className="btn primary" type="submit">
          הוסף
        </button>
      </form>

      <section className="lists">
        <List title="הכנסות" tone="green" items={incomes} onRemove={remove} />
        <List title="הוצאות" tone="red" items={expenses} onRemove={remove} />
      </section>
    </>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`card stat ${tone}`}>
      <span>{label}</span>
      <strong>{money.format(value)}</strong>
    </div>
  );
}

function List({ title, tone, items, onRemove }) {
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="card list">
      <header>
        <h2 className={`dot ${tone}`}>{title}</h2>
        <span className="badge">{money.format(total)}</span>
      </header>

      {items.length === 0 && <p className="empty">אין תנועות בחודש הזה</p>}

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <b>{item.description}</b>
              <small>{shortDate(item.date)}</small>
            </div>
            <div className="row-end">
              <span className={`amount ${tone}`}>{money.format(Number(item.amount))}</span>
              <button className="icon" title="מחיקה" onClick={() => onRemove(item.id)}>
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
