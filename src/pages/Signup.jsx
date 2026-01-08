import { useState } from "react";
import { Link } from "react-router-dom";
import { signup } from "../api/auth_api";

export default function Signup() {
  const [form, setForm] = useState({
    name: "", email: "", password: ""
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
        setMsg("✅ Admin created! Redirecting to login…");
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
    <form onSubmit={submit}>
      <h2>Create Admin Account</h2>
      <input 
        placeholder="Name" 
        value={form.name}
        onChange={e => setForm({...form, name: e.target.value})}
      />
      <input 
        placeholder="Email" 
        type="email"
        value={form.email}
        onChange={e => setForm({...form, email: e.target.value})}
      />
      <input 
        type="password" 
        placeholder="Password"
        value={form.password}
        onChange={e => setForm({...form, password: e.target.value})}
      />
      <button disabled={loading}>
        {loading ? "Creating…" : "Create Admin"}
      </button>
      {msg && <p>{msg}</p>}
      <p style={{ marginTop: "16px" }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
}
