import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// 🔥 Brand tokens - mobile app eke COLORS ekatama match wenna widiyata
const BRAND = {
  bg: "#f6f1e8",
  card: "#ffffff",
  primary: "#a75c43",
  primaryLight: "#f2e8e3",
  accent: "#3d6b5e",
  accentLight: "#e2ede9",
  dark: "#111827",
  mid: "#6b7280",
  line: "#e8e3de",
  male: "#3d6b5e",
  female: "#a75c43",
  unknown: "#b8860b",
};

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

function genderColor(gender) {
  const key = (gender || "").toLowerCase();
  if (key === "male") return BRAND.male;
  if (key === "female") return BRAND.female;
  return BRAND.unknown;
}

function genderIcon(gender) {
  const key = (gender || "").toLowerCase();
  if (key === "male") return "♂";
  if (key === "female") return "♀";
  return "•";
}

function HorizontalBars({ data, max }) {
  if (!data.length) {
    return <p className="hint">No data available.</p>;
  }

  return (
    <div className="chart-bars" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map(([label, count]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "96px 1fr 32px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          <div style={{ height: 10, borderRadius: 999, background: BRAND.primaryLight, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(count / max) * 100}%`,
                borderRadius: 999,
                background: `linear-gradient(90deg, #1b4332, #52b788)`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.dark, textAlign: "right" }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// 🔥 Gender Split - signature visual: stacked bar + icon pills
function GenderSplit({ genders }) {
  const entries = Object.entries(genders);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (!total) {
    return <p className="hint">No gender data available.</p>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 14,
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 18,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {entries.map(([gender, count]) => (
          <div
            key={gender}
            title={`${gender}: ${count}`}
            style={{
              width: `${(count / total) * 100}%`,
              background: genderColor(gender),
              transition: "width 0.4s ease",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {entries.map(([gender, count]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div
              key={gender}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 14,
                background: BRAND.bg,
                border: `1px solid ${BRAND.line}`,
                minWidth: 120,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  background: genderColor(gender),
                  flexShrink: 0,
                }}
              >
                {genderIcon(gender)}
              </span>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.dark }}>{gender}</div>
                <div style={{ fontSize: 12, color: BRAND.mid }}>{count} pets · {pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, accent }) {
  return (
    <article
      className="panel metric-panel"
      style={{
        position: "relative",
        overflow: "hidden",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            background: `${accent}1a`,
          }}
        >
          {icon}
        </span>
        <h2 style={{ margin: 0 }}>{label}</h2>
      </div>
      <p className="big" style={{ margin: 0 }}>{value}</p>
    </article>
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
  const maxAgeCount = Math.max(1, ...analysis.ageBuckets.map((b) => b.count));

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
          <MetricCard icon="👥" label="Total User Accounts" value={loading ? "..." : users.length} accent={BRAND.primary} />
          <MetricCard icon="🐾" label="Total Pet Accounts" value={loading ? "..." : pets.length} accent={BRAND.accent} />
          <MetricCard icon="📊" label="Avg Pets / User" value={loading ? "..." : avgPetsPerUser} accent={BRAND.unknown} />
          <MetricCard icon="❓" label="Unassigned Pet Profiles" value={loading ? "..." : unassignedPets} accent={BRAND.mid} />
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {analysis.ageBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  style={{
                    padding: "14px 12px",
                    borderRadius: 14,
                    background: BRAND.bg,
                    border: `1px solid ${BRAND.line}`,
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: BRAND.mid, fontWeight: 600 }}>{bucket.label}</p>
                  <strong style={{ fontSize: 22, color: BRAND.dark }}>{bucket.count}</strong>
                  <div style={{ height: 4, borderRadius: 999, background: BRAND.primaryLight, marginTop: 8, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(bucket.count / maxAgeCount) * 100}%`,
                        background: BRAND.primary,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="analysis-summary">
          <article className="panel">
            <div className="panel-head">
              <h2>Gender Split</h2>
              <span className="mini-badge">{pets.length} pets</span>
            </div>
            <GenderSplit genders={analysis.petGenders} />
          </article>
          <article className="panel">
            <h2>Account Health</h2>
            <ul className="summary-list" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: BRAND.bg, border: `1px solid ${BRAND.line}` }}>
                <span style={{ color: BRAND.mid }}>Users with at least one pet</span>
                <strong style={{ color: BRAND.dark }}>{usersWithPets}</strong>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: BRAND.bg, border: `1px solid ${BRAND.line}` }}>
                <span style={{ color: BRAND.mid }}>Pets connected to owners</span>
                <strong style={{ color: BRAND.dark }}>{ownedPets}</strong>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: BRAND.bg, border: `1px solid ${BRAND.line}` }}>
                <span style={{ color: BRAND.mid }}>Profiles needing assignment</span>
                <strong style={{ color: BRAND.dark }}>{unassignedPets}</strong>
              </li>
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