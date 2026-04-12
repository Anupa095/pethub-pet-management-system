import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Invalid username or password.");
      }

      localStorage.setItem("pethub_admin_logged_in", "true");
      navigate("/dashboard");
    } catch (e) {
      setError(e.message || "Invalid username or password.");
    }
  };

  return (
    <main className="page-shell">
      <section className="auth-card fade-in-up">
        <div>
          <p className="tag">PetHub Admin</p>
          <h1>Welcome back</h1>
          <p className="muted">Use your admin account to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="stack-lg">
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn-primary">
            Login
          </button>
        </form>

      </section>
    </main>
  );
}