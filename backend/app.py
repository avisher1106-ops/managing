import os
from datetime import date

import pymysql
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)


def db(sql, params=()):
    """Open a MySQL connection, run one query and return (rows, last_insert_id)."""
    conn = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "money_manager"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return rows, cur.lastrowid
    finally:
        conn.close()


def validate_transaction(data):
    """Check the incoming transaction and return clean values."""
    kind = data.get("type")
    if kind not in ("income", "expense"):
        raise ValueError("סוג התנועה חייב להיות income או expense")

    amount = round(float(data.get("amount", 0)), 2)
    if amount <= 0:
        raise ValueError("הסכום חייב להיות גדול מאפס")

    description = (data.get("description") or "").strip()
    if not description:
        raise ValueError("חסר תיאור לתנועה")

    tx_date = data.get("date") or date.today().isoformat()
    return kind, amount, description, tx_date


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/transactions")
def list_transactions():
    """Return all transactions, optionally filtered by month (YYYY-MM) and type."""
    month = request.args.get("month")
    kind = request.args.get("type")

    sql = (
        "SELECT id, type, CAST(amount AS DOUBLE) AS amount, description, "
        "DATE_FORMAT(date, '%%Y-%%m-%%d') AS date FROM transactions WHERE 1=1"
    )
    params = []
    if month:
        sql += " AND DATE_FORMAT(date, '%%Y-%%m') = %s"
        params.append(month)
    if kind:
        sql += " AND type = %s"
        params.append(kind)
    sql += " ORDER BY date DESC, id DESC"

    rows, _ = db(sql, params)
    return jsonify(rows)


@app.get("/api/summary")
def monthly_summary():
    """Return monthly income/expense/savings plus the all-time balance."""
    month = request.args.get("month") or date.today().strftime("%Y-%m")
    rows, _ = db(
        """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
        FROM transactions
        WHERE DATE_FORMAT(date, '%%Y-%%m') = %s
        """,
        (month,),
    )
    totals, _ = db(
        """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
        FROM transactions
        """
    )
    adjustments, _ = db("SELECT COALESCE(SUM(amount), 0) AS total FROM balance_adjustments")
    accounts, _ = db(
        "SELECT CAST(opening_balance AS DOUBLE) AS opening_balance FROM account_settings WHERE id = 1"
    )
    row = rows[0]
    total = totals[0]
    income = float(row["income"])
    expense = float(row["expense"])
    total_income = float(total["income"])
    total_expense = float(total["expense"])
    manual = float(adjustments[0]["total"])
    opening = float(accounts[0]["opening_balance"]) if accounts else 0.0
    return jsonify(
        {
            "month": month,
            "income": income,
            "expense": expense,
            "savings": income - expense,
            "totalIncome": total_income,
            "totalExpense": total_expense,
            "adjustments": manual,
            "openingBalance": opening,
            "configured": bool(accounts),
            "balance": opening + total_income - total_expense + manual,
        }
    )


@app.get("/api/account")
def get_account():
    """Tell the client if the first-time balance setup was already done."""
    rows, _ = db(
        "SELECT CAST(opening_balance AS DOUBLE) AS opening_balance FROM account_settings WHERE id = 1"
    )
    if not rows:
        return jsonify({"configured": False, "openingBalance": 0})
    return jsonify({"configured": True, "openingBalance": rows[0]["opening_balance"]})


@app.post("/api/account")
def save_account():
    """Save the opening balance entered on the first visit."""
    data = request.get_json() or {}
    try:
        amount = round(float(data.get("openingBalance", 0)), 2)
    except (ValueError, TypeError):
        return jsonify({"error": "סכום לא תקין"}), 400
    if amount < 0:
        return jsonify({"error": "הסכום לא יכול להיות שלילי"}), 400

    db(
        "INSERT INTO account_settings (id, opening_balance) VALUES (1, %s) "
        "ON DUPLICATE KEY UPDATE opening_balance = %s",
        (amount, amount),
    )
    return jsonify({"configured": True, "openingBalance": amount})


@app.post("/api/balance")
def adjust_balance():
    """Manually add to or subtract from the total balance."""
    data = request.get_json() or {}
    action = data.get("action")
    if action not in ("add", "subtract"):
        return jsonify({"error": "action must be add or subtract"}), 400

    try:
        amount = round(float(data.get("amount", 0)), 2)
    except (ValueError, TypeError):
        return jsonify({"error": "סכום לא תקין"}), 400
    if amount <= 0:
        return jsonify({"error": "הסכום חייב להיות גדול מאפס"}), 400

    signed_amount = amount if action == "add" else -amount
    _, new_id = db("INSERT INTO balance_adjustments (amount) VALUES (%s)", (signed_amount,))
    return jsonify({"id": new_id}), 201


@app.post("/api/transactions")
def create_transaction():
    try:
        kind, amount, description, tx_date = validate_transaction(request.get_json() or {})
    except (ValueError, TypeError) as err:
        return jsonify({"error": str(err)}), 400

    _, new_id = db(
        "INSERT INTO transactions (type, amount, description, date) VALUES (%s, %s, %s, %s)",
        (kind, amount, description, tx_date),
    )
    return jsonify({"id": new_id}), 201


@app.delete("/api/transactions/<int:tx_id>")
def delete_transaction(tx_id):
    db("DELETE FROM transactions WHERE id = %s", (tx_id,))
    return jsonify({"ok": True})


@app.get("/api/wishes")
def list_wishes():
    rows, _ = db(
        "SELECT id, title, CAST(price AS DOUBLE) AS price, achieved FROM wishes "
        "ORDER BY achieved, id DESC"
    )
    return jsonify(rows)


@app.post("/api/wishes")
def create_wish():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "חסר שם לרצון"}), 400

    try:
        price = round(float(data["price"]), 2) if data.get("price") else None
    except (ValueError, TypeError):
        return jsonify({"error": "מחיר לא תקין"}), 400

    _, new_id = db("INSERT INTO wishes (title, price) VALUES (%s, %s)", (title, price))
    return jsonify({"id": new_id}), 201


@app.patch("/api/wishes/<int:wish_id>")
def update_wish(wish_id):
    """Mark a wish as achieved or not achieved."""
    achieved = 1 if (request.get_json() or {}).get("achieved") else 0
    db("UPDATE wishes SET achieved = %s WHERE id = %s", (achieved, wish_id))
    return jsonify({"ok": True})


@app.delete("/api/wishes/<int:wish_id>")
def delete_wish(wish_id):
    db("DELETE FROM wishes WHERE id = %s", (wish_id,))
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
