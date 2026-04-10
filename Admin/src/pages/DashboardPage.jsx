import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const raw = getter(item);
    const key = raw && String(raw).trim() ? String(raw).trim() : "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildAgeBuckets(pets) {
  const buckets = [
    { label: "0-1 yrs", count: 0 },
    { label: "2-4 yrs", count: 0 },
    { label: "5-8 yrs", count: 0 },
    { label: "9+ yrs", count: 0 },
  ];

  pets.forEach((pet) => {
    const age = Number(pet?.age);
    if (!Number.isFinite(age)) return;
    if (age <= 1) buckets[0].count += 1;
    else if (age <= 4) buckets[1].count += 1;
    else if (age <= 8) buckets[2].count += 1;
    else buckets[3].count += 1;
  });

  return buckets;
}

function HorizontalBars({ data, max }) {
  if (!data.length) {
    return <p className="hint">No data available.</p>;
  }

  return (
    <div className="chart-bars">
      {data.map(([label, count]) => (
        <div className="chart-row" key={label}>
          <span className="chart-label">{label}</span>
          <div className="chart-track">
            <div className="chart-fill" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="chart-value">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("pethub_admin_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    localStorage.setItem("pethub_admin_theme", theme);
    document.body.classList.remove("admin-force-light", "admin-force-dark");
    document.body.classList.add(theme === "dark" ? "admin-force-dark" : "admin-force-light");

    return () => {
      document.body.classList.remove("admin-force-light", "admin-force-dark");
    };
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      try {
        const [usersResponse, petsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/auth/users`),
          fetch(`${API_BASE_URL}/pets`),
        ]);

        if (!usersResponse.ok || !petsResponse.ok) {
          throw new Error("Unable to load dashboard data.");
        }

        const [usersData, petsData] = await Promise.all([
          usersResponse.json(),
          petsResponse.json(),
        ]);

        if (!active) return;
        setUsers(safeArray(usersData));
        setPets(safeArray(petsData));
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      active = false;
    };
  }, []);

  const analysis = useMemo(() => {
    const petTypes = countBy(pets, (pet) => pet?.type);
    const petGenders = countBy(pets, (pet) => pet?.gender);
    const ageBuckets = buildAgeBuckets(pets);

    const topPetTypes = Object.entries(petTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topOwners = Object.values(
      pets.reduce((acc, pet) => {
        const email = pet?.user?.email || "Unknown";
        const name = pet?.user?.name || "Unknown";
        if (!acc[email]) acc[email] = { name, count: 0 };
        acc[email].count += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((owner) => [owner.name, owner.count]);

    return { topPetTypes, topOwners, petGenders, ageBuckets };
  }, [pets]);

  const avgPetsPerUser = users.length ? (pets.length / users.length).toFixed(2) : "0.00";
  const ownedPets = pets.filter((pet) => pet?.user?.email).length;
  const unassignedPets = pets.length - ownedPets;
  const usersWithPets = new Set(pets.map((pet) => pet?.user?.email).filter(Boolean)).size;

  const maxTypeCount = analysis.topPetTypes[0]?.[1] || 1;
  const maxOwnerCount = analysis.topOwners[0]?.[1] || 1;

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
          <button className="side-link active">Dashboard</button>
          <button className="side-link" onClick={() => navigate("/users")}>User Accounts</button>
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
            <p className="tag">Admin Dashboard</p>
            <h1>Platform Intelligence</h1>
            <p className="muted">Real-time visibility of user and pet accounts.</p>
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

        <div className="metrics-grid">
          <article className="panel metric-panel">
            <h2>Total User Accounts</h2>
            <p className="big">{loading ? "..." : users.length}</p>
          </article>
          <article className="panel metric-panel">
            <h2>Total Pet Accounts</h2>
            <p className="big">{loading ? "..." : pets.length}</p>
          </article>
          <article className="panel metric-panel">
            <h2>Avg Pets / User</h2>
            <p className="big">{loading ? "..." : avgPetsPerUser}</p>
          </article>
          <article className="panel metric-panel">
            <h2>Unassigned Pet Profiles</h2>
            <p className="big">{loading ? "..." : unassignedPets}</p>
          </article>
        </div>

        <section className="analysis-grid">
          <article className="panel chart-panel">
            <div className="panel-head">
              <h2>Pet Type Distribution</h2>
              <span className="mini-badge">Top 5</span>
            </div>
            <HorizontalBars data={analysis.topPetTypes} max={maxTypeCount} />
          </article>

          <article className="panel chart-panel">
            <div className="panel-head">
              <h2>Top Owners</h2>
              <span className="mini-badge">Top 5</span>
            </div>
            <HorizontalBars data={analysis.topOwners} max={maxOwnerCount} />
          </article>

          <article className="panel chart-panel">
            <div className="panel-head">
              <h2>Age Segments</h2>
              <span className="mini-badge">4 bands</span>
            </div>
            <div className="age-grid">
              {analysis.ageBuckets.map((bucket) => (
                <div className="age-card" key={bucket.label}>
                  <p>{bucket.label}</p>
                  <strong>{bucket.count}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="analysis-summary">
          <article className="panel">
            <h2>Gender Split</h2>
            <div className="legend-row">
              {Object.entries(analysis.petGenders).map(([gender, count]) => (
                <span key={gender}>{gender}: {count}</span>
              ))}
            </div>
          </article>
          <article className="panel">
            <h2>Account Health</h2>
            <ul className="summary-list">
              <li>Users with at least one pet: {usersWithPets}</li>
              <li>Pets connected to owners: {ownedPets}</li>
              <li>Profiles needing assignment: {unassignedPets}</li>
            </ul>
          </article>
        </section>

        <section className="accounts-grid">
          <article className="panel quick-nav-panel">
            <h2>Manage User Accounts</h2>
            <p className="muted">Open full user list with account details.</p>
            <button className="btn-primary" onClick={() => navigate("/users")}>Go to User Accounts</button>
          </article>

          <article className="panel quick-nav-panel">
            <h2>Manage Pet Accounts</h2>
            <p className="muted">Open full pet list with ownership details.</p>
            <button className="btn-primary" onClick={() => navigate("/pets")}>Go to Pet Accounts</button>
          </article>
        </section>
      </section>
    </main>
  );
}
