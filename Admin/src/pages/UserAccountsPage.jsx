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
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
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

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`);
      if (!response.ok) {
        throw new Error("Unable to load user accounts.");
      }
      const data = await response.json();
      setUsers(safeArray(data));
    } catch (e) {
      setError(e.message || "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadUsersSafely() {
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

    loadUsersSafely();
    return () => {
      active = false;
    };
  }, []);

  function startEditUser(user) {
    setEditingUser(user);
    setEditForm({
      name: user?.name || "",
      email: user?.email || "",
    });
    setActionError("");
  }

  function cancelEditUser() {
    setEditingUser(null);
    setEditForm({ name: "", email: "" });
    setActionError("");
  }

  async function saveUserEdit() {
    if (!editingUser?.id) {
      setActionError("Selected user is invalid.");
      return;
    }

    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
    };

    if (!payload.name || !payload.email) {
      setActionError("Name and email are required.");
      return;
    }

    try {
      setSaving(true);
      setActionError("");
      const response = await fetch(`${API_BASE_URL}/auth/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update user.");
      }

      await loadUsers();
      cancelEditUser();
    } catch (e) {
      setActionError(e.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user) {
    if (!user?.id) {
      setActionError("Selected user is invalid.");
      return;
    }

    const ok = window.confirm(`Delete user ${user.name || user.email || "this account"}?`);
    if (!ok) return;

    try {
      setDeletingId(user.id);
      setActionError("");
      const response = await fetch(`${API_BASE_URL}/auth/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete user.");
      }

      await loadUsers();
      if (editingUser?.id === user.id) {
        cancelEditUser();
      }
    } catch (e) {
      setActionError(e.message || "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

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
            <button className="btn-primary" onClick={loadUsers}>
              Refresh Data
            </button>
          </div>
        </header>

        {error ? <p className="error-text">{error}</p> : null}
        {actionError ? <p className="error-text">{actionError}</p> : null}

        {editingUser ? (
          <article className="panel action-panel">
            <div className="panel-head">
              <h2>Edit User #{editingUser.id}</h2>
              <button className="btn-secondary btn-small" onClick={cancelEditUser} disabled={saving}>
                Cancel
              </button>
            </div>
            <div className="form-grid-2">
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
            </div>
            <div className="admin-top-actions">
              <button className="btn-primary btn-small" onClick={saveUserEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </article>
        ) : null}

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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && users.length === 0 ? (
                  <tr><td colSpan="4">No users found.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id || user.email}>
                      <td>{user.id ?? "-"}</td>
                      <td>{user.name || "N/A"}</td>
                      <td>{user.email || "N/A"}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-secondary btn-small" onClick={() => startEditUser(user)}>
                            Edit
                          </button>
                          <button
                            className="btn-danger btn-small"
                            onClick={() => deleteUser(user)}
                            disabled={deletingId === user.id}
                          >
                            {deletingId === user.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
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
