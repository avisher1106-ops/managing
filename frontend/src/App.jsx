import { useEffect, useLayoutEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import SetupBalance from "./components/SetupBalance";
import Dashboard from "./pages/Dashboard";
import Wishes from "./pages/Wishes";

// Start with the saved preference, or fall back to the system preference.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // localStorage can be blocked by the browser.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState("");
  const isDark = theme === "dark";

  // Apply the theme before paint and remember the user's choice.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  // Check whether the opening balance was already set.
  useEffect(() => {
    api
      .account()
      .then(setAccount)
      .catch((err) => setAccountError(err.message));
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo">💰</span> הכסף שלי
        </div>

        <div className="topbar-actions">
          {account?.configured && (
            <nav>
              <NavLink to="/" end>
                ראשי
              </NavLink>
              <NavLink to="/wishes">רצונות ושאיפות</NavLink>
            </nav>
          )}

          <button
            className="theme-toggle"
            title={isDark ? "מצב בהיר" : "מצב כהה"}
            aria-label={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main>
        {accountError && <p className="error">{accountError}</p>}
        {!account && !accountError && <p className="empty">טוען...</p>}

        {account && !account.configured && <SetupBalance onSaved={setAccount} />}

        {account?.configured && (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wishes" element={<Wishes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </>
  );
}
