import { useEffect, useState } from "react";
import { api } from "../api";
import { money } from "../format";

export default function Wishes() {
  const [wishes, setWishes] = useState([]);
  const [form, setForm] = useState({ title: "", price: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      setWishes(await api.wishes());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(event) {
    event.preventDefault();
    try {
      await api.addWish({
        title: form.title,
        price: form.price ? Number(form.price) : null,
      });
      setForm({ title: "", price: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(wish) {
    try {
      await api.updateWish(wish.id, !wish.achieved);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("למחוק את הרצון?")) return;
    try {
      await api.deleteWish(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const done = wishes.filter((wish) => wish.achieved).length;

  return (
    <>
      <section className="hero">
        <div>
          <h1>רצונות ושאיפות</h1>
          <p>
            הושגו {done} מתוך {wishes.length}
          </p>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <form className="card add-form wish-form" onSubmit={add}>
        <h2>רצון חדש</h2>
        <input
          type="text"
          required
          placeholder="מה בא לך להשיג?"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="מחיר משוער (אופציונלי)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <button className="btn primary" type="submit">
          הוסף
        </button>
      </form>

      <section className="wishes">
        {wishes.length === 0 && <p className="card empty">עוד לא הוספת רצונות</p>}

        {wishes.map((wish) => (
          <article key={wish.id} className={`card wish ${wish.achieved ? "done" : ""}`}>
            <button
              className="check"
              title="סמן כהושג"
              aria-pressed={Boolean(wish.achieved)}
              onClick={() => toggle(wish)}
            >
              {wish.achieved ? "✓" : ""}
            </button>

            <div className="wish-body">
              <h3>{wish.title}</h3>
              {wish.price != null && <span>{money.format(Number(wish.price))}</span>}
            </div>

            <button className="icon" title="מחיקה" onClick={() => remove(wish.id)}>
              ×
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
