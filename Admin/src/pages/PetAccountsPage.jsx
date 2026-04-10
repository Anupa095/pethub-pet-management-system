import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function PetAccountsPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
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

    async function loadPets() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/pets`);
        if (!response.ok) {
          throw new Error("Unable to load pet accounts.");
        }
        const data = await response.json();
        if (!active) return;
        setPets(safeArray(data));
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load pet accounts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPets();
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
          <button className="side-link" onClick={() => navigate("/users")}>User Accounts</button>
          <button className="side-link active">Pet Accounts</button>
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
            <h1>Pet Accounts</h1>
            <p className="muted">All pet profiles registered in the platform.</p>
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
            <h2>All Pets</h2>
            <span className="mini-badge">{loading ? "..." : pets.length}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Breed</th>
                  <th>Age</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pets.length === 0 ? (
                  <tr><td colSpan="6">No pets found.</td></tr>
                ) : (
                  pets.map((pet) => (
                    <tr key={pet.id || `${pet.name}-${pet.age}`}>
                      <td>{pet.id ?? "-"}</td>
                      <td>{pet.name || "N/A"}</td>
                      <td>{pet.type || "N/A"}</td>
                      <td>{pet.breed || "N/A"}</td>
                      <td>{pet.age ?? "N/A"}</td>
                      <td>{pet.user?.name || pet.user?.email || "Unassigned"}</td>
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
