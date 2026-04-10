import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function UserAccountsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("pethub_admin_theme") || "light");

  useEffect(() => {
    if (theme !== "light" && theme !== "dark") {
      setTheme("light");
      return;
    }

    localStorage.setItem("pethub_admin_theme", theme);
    document.body.classList.remove("admin-force-light", "admin-force-dark");
    document.body.classList.add(theme === "dark" ? "admin-force-dark" : "admin-force-light");

    return () => {
      document.body.classList.remove("admin-force-light", "admin-force-dark");
    };
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/auth/users`);
        if (!response.ok) {
          throw new Error("Unable to load user accounts.");
        }
        const data = await response.json();
        if (!active) return;
        setUsers(safeArray(data));
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load user accounts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={`admin-layout fade-in-up theme-${theme}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-dot" />
          <div>
            <p className="brand-title">PetHub Admin</p>
            <p className="brand-sub">Control Panel</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="side-link" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="side-link active">User Accounts</button>
          <button className="side-link" onClick={() => navigate("/pets")}>Pet Accounts</button>
          <button className="side-link" onClick={() => navigate("/vaccination")}>Vaccination Checking</button>
        </nav>

        <div className="sidebar-foot">
          <button
            className="btn-secondary"
            onClick={() => {
              localStorage.removeItem("pethub_admin_logged_in");
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="tag">Admin</p>
            <h1>User Accounts</h1>
            <p className="muted">All registered user accounts in the platform.</p>
          </div>
          <div className="admin-top-actions">
            <button className="btn-secondary theme-toggle" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Refresh Data
            </button>
          </div>
        </header>

        {error ? <p className="error-text">{error}</p> : null}

        <article className="panel table-wrap">
          <div className="panel-head">
            <h2>All Users</h2>
            <span className="mini-badge">{loading ? "..." : users.length}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {!loading && users.length === 0 ? (
                  <tr><td colSpan="3">No users found.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id || user.email}>
                      <td>{user.id ?? "-"}</td>
                      <td>{user.name || "N/A"}</td>
                      <td>{user.email || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
