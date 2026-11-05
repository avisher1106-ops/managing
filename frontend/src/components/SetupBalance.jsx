import { useState } from "react";
import { api } from "../api";

export default function SetupBalance({ onSaved }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (amount.trim() === "" || Number(amount) < 0) {
      setError("הזן סכום תקין");
      return;
    }

    setSaving(true);
    try {
      const account = await api.saveAccount(Number(amount));
      onSaved(account);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="setup">
      <form className="card setup-card" onSubmit={submit}>
        <span className="setup-icon">👋</span>
        <h1>ברוך הבא!</h1>
        <p>
          כמה כסף יש לך כרגע בחשבון?
          <br />
          מכאן נתחיל לעקוב אחרי היתרה שלך.
        </p>

        <input
          type="number"
          min="0"
          step="0.01"
          required
          autoFocus
          placeholder="לדוגמה: 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "שומר..." : "שמור והמשך"}
        </button>

        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
