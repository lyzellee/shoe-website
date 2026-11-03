import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // Admin lang ang puwedeng pumasok sa admin dashboard.
      if (data.user.role !== "admin" && data.user.role !== "representative") {
        setError("Access denied. Admin account required.");
        return;
      }

      // I-save ang token para sa protected routes at API requests.
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Dalhin ang admin sa dashboard page.
      if (data.user.role === "admin") {
        navigate("/admin/add", { replace: true });
      } else if (data.user.role === "representative") {
        navigate("/representative/dashboard", { replace: true });
      }
    } catch (error) {
      setError("Cannot connect to server. Check your backend.");
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-heading">
          <div className="admin-login-brand">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M8 29c7 1 13-3 17-9l5-7 4 10c2 5 6 7 10 8v6H9l-1-8Z" />
              <path d="M13 29h26M22 22l3 3m5-2 3 3" />
            </svg>
            <span>SHOE HUB</span>
          </div>
          <div className="admin-login-kicker">
            <h2>ADMIN<br />PORTAL</h2>
            <p>Manage your store, track orders, and more.</p>
          </div>
          <div className="admin-login-console" aria-label="Store management console">
            <span className="admin-login-console-dot" />
            <span>Store management console</span>
          </div>
        </div>

        <div className="admin-login-content">
          <div className="admin-login-dots" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
          </div>
          <div className="admin-login-intro">
            <h1 id="admin-login-title">Welcome back</h1>
            <p>Sign in to manage your store and products.</p>
          </div>

          <form className="admin-login-form" onSubmit={handleLogin}>
            <div className="admin-login-field">
              <label htmlFor="admin-email">Email address</label>
              <div className="admin-login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 5h18v14H3V5Zm1 1 8 7 8-7" />
                </svg>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lyssabeller@gmail.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  className="admin-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="admin-login-options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="admin-forgot-button">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="admin-login-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="admin-login-button">
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
