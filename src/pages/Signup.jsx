import { useState } from "react";
import { Link } from "react-router-dom";
import { signup } from "../api/auth_api";
import BrandMark from "../components/common/BrandMark";
import InlineSpinner from "../components/common/InlineSpinner";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await signup(form);
      if (res.data.action === "ADMIN_CREATED") {
        setMsg("Admin created. Redirecting to sign in…");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        setMsg(res.data.reason || "Signup failed");
      }
    } catch (err) {
      setMsg(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark className="brand-mark--auth" alt="Rishihood University" />
          <p className="auth-brand__eyebrow">One-time setup</p>
          <h1 className="auth-brand__title">Create admin</h1>
          <p className="auth-brand__subtitle">
            Only the first administrator can be registered from this screen.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Choose a strong password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={loading}
              required
            />
          </div>
          <button className="auth-form__submit" type="submit" disabled={loading}>
            {loading ? (
              <span className="auth-submit__inner">
                <InlineSpinner size={16} />
                Creating…
              </span>
            ) : (
              "Create administrator"
            )}
          </button>
          {msg && (
            <div
              className={`auth-msg ${/fail|invalid|error/i.test(msg) ? "auth-msg--error" : ""}`}
              role="status"
            >
              {msg}
            </div>
          )}
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
