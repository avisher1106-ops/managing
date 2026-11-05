# ניהול הכנסות והוצאות

אפליקציה פשוטה למעקב אחרי הכנסות, הוצאות, יתרה כוללת וחיסכון חודשי, עם עמוד "רצונות ושאיפות" ומצב כהה/בהיר. בכניסה הראשונה מגדירים יתרת פתיחה — כמה כסף יש כרגע בחשבון.

- **שרת:** Python + Flask (REST API)
- **לקוח:** React + Vite
- **בסיס נתונים:** MySQL

## מבנה הפרויקט

```
backend/     שרת Flask, סכמת MySQL וקובץ דרישות
frontend/    אפליקציית React
docker-compose.yml   MySQL מוכן להרצה (אופציונלי)
```

## התקנה והרצה

### 1. בסיס נתונים (MySQL)

**אפשרות א׳ – Docker (הכי קל):**

```bash
docker compose up -d
```

הפקודה מרימה MySQL על פורט **3309** (כדי לא להתנגש בהתקנות MySQL אחרות) עם סיסמת root `root`, ויוצרת אוטומטית את הטבלאות. הערכים כבר מוכנים ב-`.env.example`.

**אפשרות ב׳ – MySQL מקומי:**

```bash
mysql -u root -p < backend/schema.sql
```

במקרה הזה עדכן/י את `DB_PORT` ו-`DB_PASSWORD` בקובץ `.env` לפי החיבור שלך (לרוב פורט 3306).

### 2. שרת Flask

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # ואז עדכן סיסמה/פרטי התחברות
python app.py
```

השרת עולה על `http://localhost:5000`.

### 3. צד לקוח

```bash
cd frontend
npm install
npm run dev
```

האתר על `http://localhost:5180` (בקשות `/api` מנותבות אוטומטית לשרת).

> הפורט 5173 לרוב תפוס על ידי פרויקטים אחרים, לכן הוגדר פורט קבוע 5180.

> הפרויקט מוגדר להשתמש ב-Rollup WASM כדי שעבודת ה-build תעבוד גם במחשבים עם מדיניות אבטחה שחוסמת בינאריים מקומיים.

## API

| Method | Route | תיאור |
|--------|-------|-------|
| GET | `/api/account` | בדיקה אם יתרת הפתיחה הוגדרה |
| POST | `/api/account` | שמירת יתרת פתיחה ראשונית |
| GET | `/api/transactions?month=YYYY-MM&type=income` | תנועות לפי חודש/סוג |
| POST | `/api/transactions` | הוספת הכנסה או הוצאה |
| DELETE | `/api/transactions/:id` | מחיקת תנועה |
| GET | `/api/summary?month=YYYY-MM` | הכנסות, הוצאות וחיסכון לחודש + יתרה כוללת |
| POST | `/api/balance` | עדכון ידני של היתרה (`add` או `subtract`) |
| GET | `/api/wishes` | כל הרצונות |
| POST | `/api/wishes` | הוספת רצון |
| PATCH | `/api/wishes/:id` | סימון כהושג / ביטול |
| DELETE | `/api/wishes/:id` | מחיקת רצון |

## דוגמת בקשה

```json
POST /api/transactions
{
  "type": "expense",
  "amount": 120.5,
  "description": "קניות בסופר",
  "date": "2026-11-05"
}
```
