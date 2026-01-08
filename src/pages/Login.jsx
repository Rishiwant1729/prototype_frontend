import { useState } from "react";
import { Link } from "react-router-dom";
import { login as loginApi } from "../api/auth_api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
    } catch {
      setMsg("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Login</h2>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password"
             onChange={e => setPassword(e.target.value)} />
      <button disabled={loading}>
        {loading ? "Logging in…" : "Login"}
      </button>
      {msg && <p>{msg}</p>}
      <p style={{ marginTop: "16px" }}>
        No admin account? <Link to="/signup">Create one</Link>
      </p>
    </form>
  );
}
