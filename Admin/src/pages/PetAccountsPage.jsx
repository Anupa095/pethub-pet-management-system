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
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    breed: "",
    gender: "",
    age: "",
  });
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

  async function loadPets() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/pets`);
      if (!response.ok) {
        throw new Error("Unable to load pet accounts.");
      }
      const data = await response.json();
      setPets(safeArray(data));
    } catch (e) {
      setError(e.message || "Failed to load pet accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadPetsSafely() {
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

    loadPetsSafely();
    return () => {
      active = false;
    };
  }, []);

  function startEditPet(pet) {
    setEditingPet(pet);
    setEditForm({
      name: pet?.name || "",
      type: pet?.type || "",
      breed: pet?.breed || "",
      gender: pet?.gender || "",
      age: pet?.age ?? "",
    });
    setActionError("");
  }

  function cancelEditPet() {
    setEditingPet(null);
    setEditForm({ name: "", type: "", breed: "", gender: "", age: "" });
    setActionError("");
  }

  async function savePetEdit() {
    if (!editingPet?.id) {
      setActionError("Selected pet is invalid.");
      return;
    }

    const ageNumber = Number(editForm.age);
    const payload = {
      name: editForm.name.trim(),
      type: editForm.type.trim(),
      breed: editForm.breed.trim(),
      gender: editForm.gender.trim(),
      age: Number.isNaN(ageNumber) ? null : ageNumber,
    };

    if (!payload.name || !payload.type || !payload.breed || !payload.gender || payload.age === null) {
      setActionError("Name, type, breed, gender and age are required.");
      return;
    }

    try {
      setSaving(true);
      setActionError("");
      const response = await fetch(`${API_BASE_URL}/pets/${editingPet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update pet.");
      }

      await loadPets();
      cancelEditPet();
    } catch (e) {
      setActionError(e.message || "Failed to update pet.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePet(pet) {
    if (!pet?.id) {
      setActionError("Selected pet is invalid.");
      return;
    }

    const ok = window.confirm(`Delete pet ${pet.name || "this pet"}?`);
    if (!ok) return;

    try {
      setDeletingId(pet.id);
      setActionError("");
      const response = await fetch(`${API_BASE_URL}/pets/${pet.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete pet.");
      }

      await loadPets();
      if (editingPet?.id === pet.id) {
        cancelEditPet();
      }
    } catch (e) {
      setActionError(e.message || "Failed to delete pet.");
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
            <button className="btn-primary" onClick={loadPets}>
              Refresh Data
            </button>
          </div>
        </header>

        {error ? <p className="error-text">{error}</p> : null}
        {actionError ? <p className="error-text">{actionError}</p> : null}

        {editingPet ? (
          <article className="panel action-panel">
            <div className="panel-head">
              <h2>Edit Pet #{editingPet.id}</h2>
              <button className="btn-secondary btn-small" onClick={cancelEditPet} disabled={saving}>
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
                <span>Type</span>
                <input
                  type="text"
                  value={editForm.type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Breed</span>
                <input
                  type="text"
                  value={editForm.breed}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, breed: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Gender</span>
                <input
                  type="text"
                  value={editForm.gender}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Age</span>
                <input
                  type="number"
                  min="0"
                  value={editForm.age}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, age: e.target.value }))}
                />
              </label>
            </div>
            <div className="admin-top-actions">
              <button className="btn-primary btn-small" onClick={savePetEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </article>
        ) : null}

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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pets.length === 0 ? (
                  <tr><td colSpan="7">No pets found.</td></tr>
                ) : (
                  pets.map((pet) => (
                    <tr key={pet.id || `${pet.name}-${pet.age}`}>
                      <td>{pet.id ?? "-"}</td>
                      <td>{pet.name || "N/A"}</td>
                      <td>{pet.type || "N/A"}</td>
                      <td>{pet.breed || "N/A"}</td>
                      <td>{pet.age ?? "N/A"}</td>
                      <td>{pet.user?.name || pet.user?.email || "Unassigned"}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-secondary btn-small" onClick={() => startEditPet(pet)}>
                            Edit
                          </button>
                          <button
                            className="btn-danger btn-small"
                            onClick={() => deletePet(pet)}
                            disabled={deletingId === pet.id}
                          >
                            {deletingId === pet.id ? "Deleting..." : "Delete"}
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
