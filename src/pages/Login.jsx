import { useState } from "react";
import { Link } from "react-router-dom";
import { login as loginApi } from "../api/auth_api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import BrandMark from "../components/common/BrandMark";
import InlineSpinner from "../components/common/InlineSpinner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await loginApi({ email, password });

      if (res.data.action === "LOGIN_SUCCESS") {
        login(res.data.token, res.data.role, res.data.name);
        navigate("/");
      } else {
        setMsg(res.data.reason || "Login failed");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        setMsg(
          err?.response?.data?.reason ||
            "Database unavailable. Update backend/.env DATABASE_URL and ensure MySQL is running, then retry."
        );
      } else if (status === 401) {
        setMsg("Invalid credentials");
      } else {
        setMsg("Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark className="brand-mark--auth" alt="Rishihood University" />
          <p className="auth-brand__eyebrow">Staff access</p>
          <h1 className="auth-brand__title">Sign in</h1>
          <p className="auth-brand__subtitle">
            Facility and sport room operations dashboard
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button className="auth-form__submit" type="submit" disabled={loading}>
            {loading ? (
              <span className="auth-submit__inner">
                <InlineSpinner size={16} />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
          {msg && (
            <div className="auth-msg auth-msg--error" role="alert">
              {msg}
            </div>
          )}
        </form>

        <p className="auth-footer">
          No admin account yet? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
