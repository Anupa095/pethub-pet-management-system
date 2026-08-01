import { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginImage from "../assets/Fla.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pethub-login">
      {/* Scoped styles — every selector below is prefixed with .pethub-login
          so nothing here can ever leak into or clash with other pages,
          even if this file is used alongside your existing styles.css. */}
      <style>{`
        .pethub-login {
          --pl-bg: #f6f1e8;
          --pl-primary: #a75c43;
          --pl-primary-light: #f2e8e3;
          --pl-accent: #3d6b5e;
          --pl-accent-light: #e2ede9;
          --pl-dark: #111827;
          --pl-mid: #6b7280;
          --pl-line: #e8e3de;
          --pl-panel-bg: rgba(255, 255, 255, 0.88);
          --pl-shadow-md: 0 16px 40px rgba(17, 24, 39, 0.08);

          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(125deg, #f6f1e8 0%, #f1ebe1 50%, #e8e1d5 100%);
          background-attachment: fixed;
          box-sizing: border-box;
        }

        .pethub-login *,
        .pethub-login *::before,
        .pethub-login *::after {
          box-sizing: border-box;
        }

        .pethub-login h1,
        .pethub-login h2,
        .pethub-login p {
          margin: 0;
        }

        .pethub-login .pl-card {
          width: min(100%, 920px);
          min-height: 640px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--pl-panel-bg);
          border: 1px solid var(--pl-line);
          border-radius: 28px;
          box-shadow: var(--pl-shadow-md);
          overflow: hidden;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: pl-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes pl-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Left illustration panel ── */
        .pethub-login .pl-illustration {
          position: relative;
          background: linear-gradient(160deg, var(--pl-primary-light) 0%, var(--pl-accent-light) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 16px;
          padding: 36px 28px 28px;
          text-align: center;
          overflow: hidden;
        }

        .pethub-login .pl-glow {
          position: absolute;
          top: -80px;
          right: -80px;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(167, 92, 67, 0.18), transparent 70%);
          pointer-events: none;
        }

        .pethub-login .pl-spacer {
          flex: 1;
          min-height: 8px;
        }

        .pethub-login .pl-svg {
          width: 100%;
          max-width: 480px;
          max-height: 400px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 12px 20px rgba(17, 24, 39, 0.12));
        }

        .pethub-login .pl-illustration-text h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--pl-dark);
          margin-bottom: 8px;
        }

        .pethub-login .pl-illustration-text p {
          font-size: 13.5px;
          color: var(--pl-mid);
          max-width: 280px;
          margin: 0 auto;
          line-height: 1.5;
        }

        /* ── Right form panel ── */
        .pethub-login .pl-form-panel {
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
        }

        .pethub-login .pl-tag {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--pl-primary-light);
          color: var(--pl-primary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .pethub-login .pl-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--pl-dark);
          margin-top: 10px;
        }

        .pethub-login .pl-subtitle {
          color: var(--pl-mid);
          font-size: 13px;
          margin-top: 6px;
          margin-bottom: 20px;
        }

        .pethub-login .pl-form {
          display: grid;
          gap: 18px;
        }

        .pethub-login .pl-field {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--pl-dark);
        }

        .pethub-login .pl-field input {
          font-family: inherit;
          font-size: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--pl-line);
          background: rgba(255, 255, 255, 0.6);
          color: var(--pl-dark);
          outline: none;
          width: 100%;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .pethub-login .pl-field input:focus {
          border-color: var(--pl-primary);
          box-shadow: 0 0 0 3px rgba(167, 92, 67, 0.15);
        }

        .pethub-login .pl-password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .pethub-login .pl-password-wrap input {
          padding-right: 60px;
        }

        .pethub-login .pl-password-toggle {
          position: absolute;
          right: 10px;
          border: none;
          background: none;
          color: var(--pl-primary);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
          font-family: inherit;
        }

        .pethub-login .pl-password-toggle:hover {
          text-decoration: underline;
        }

        .pethub-login .pl-error {
          font-size: 13px;
          font-weight: 600;
          color: #dc2626;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: 10px;
          padding: 8px 12px;
        }

        .pethub-login .pl-submit {
          width: 100%;
          padding: 13px 18px;
          font-size: 14px;
          margin-top: 4px;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          background: var(--pl-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(167, 92, 67, 0.25);
          transition: all 0.2s ease;
        }

        .pethub-login .pl-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .pethub-login .pl-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .pethub-login .pl-footnote {
          margin-top: 22px;
          font-size: 12px;
          text-align: center;
          color: var(--pl-mid);
        }

        /* ── Responsive ── */
        @media (max-width: 760px) {
          .pethub-login .pl-card {
            grid-template-columns: 1fr;
            min-height: unset;
          }
          .pethub-login .pl-illustration {
            padding: 32px 24px;
          }
          .pethub-login .pl-svg {
            max-width: 200px;
            margin-bottom: 12px;
          }
          .pethub-login .pl-form-panel {
            padding: 32px 28px;
          }
        }
      `}</style>

      <div className="pl-card">
        {/* ── LEFT: Illustration Panel ── */}
        <div className="pl-illustration">
          <div className="pl-glow" />
          <div className="pl-spacer" />
          <img src={loginImage} alt="PetHub" className="pl-svg" />

          <div className="pl-illustration-text">
            <h2>PetHub Admin</h2>
            <p>Manage pet health records, breed insights, and owners — all in one place.</p>
          </div>
        </div>

        {/* ── RIGHT: Form Panel ── */}
        <div className="pl-form-panel">
          <span className="pl-tag">PetHub Admin</span>
          <h1 className="pl-title">Login to Dashboard</h1>
          <p className="pl-subtitle">Enter your credentials to access the admin panel.</p>

          <form onSubmit={handleSubmit} className="pl-form">
            <label className="pl-field">
              <span>Username</span>
              <input
                type="text"
                name="username"
                placeholder="Enter username"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </label>

            <label className="pl-field">
              <span>Password</span>
              <div className="pl-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pl-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error ? <p className="pl-error">{error}</p> : null}

            <button type="submit" className="pl-submit" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="pl-footnote">
            Protected admin area · PetHub © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  );
}