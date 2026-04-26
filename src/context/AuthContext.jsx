import { createContext, useContext, useState, useEffect, useMemo } from "react";

const AuthContext = createContext(null);

// Role definitions for access control
export const ROLES = {
  MANAGEMENT: "MANAGEMENT",
  OPERATOR: "OPERATOR",
  GUARD: "GUARD",
  AUDITOR: "AUDITOR"
};

// Parse JWT token to get payload
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isExpired(payload) {
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) return false;
  return Date.now() >= exp * 1000;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("token"));
  const [role, setRole] = useState(() => sessionStorage.getItem("role") || "MANAGEMENT");
  const [userName, setUserName] = useState(() => sessionStorage.getItem("userName") || "");
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token;

  // Parse role from token on initial load
  useEffect(() => {
    if (token) {
      const payload = parseJwt(token);
      if (payload && isExpired(payload)) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("userName");
        setToken(null);
        setRole("MANAGEMENT");
        setUserName("");
        return;
      }
      if (payload) {
        setRole(payload.role || "MANAGEMENT");
        setUserName(payload.name || "");
      }
    }
  }, [token]);

  const login = (jwt, userRole, name) => {
    sessionStorage.setItem("token", jwt);
    sessionStorage.setItem("role", userRole || "MANAGEMENT");
    sessionStorage.setItem("userName", name || "");
    setToken(jwt);
    setRole(userRole || "MANAGEMENT");
    setUserName(name || "");
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userName");
    setToken(null);
    setRole("MANAGEMENT");
    setUserName("");
  };

  // Role-based access helpers
  const permissions = useMemo(() => ({
    canViewAnalytics: role === ROLES.MANAGEMENT || role === ROLES.AUDITOR,
    canExport: role === ROLES.MANAGEMENT,
    canViewCharts: role === ROLES.MANAGEMENT,
    canViewAlerts: role !== ROLES.GUARD,
    canViewEvents: role !== ROLES.GUARD,
    canViewEquipment: role === ROLES.MANAGEMENT || role === ROLES.OPERATOR,
    canViewOccupancy: true, // All roles
    isManagement: role === ROLES.MANAGEMENT,
    isOperator: role === ROLES.OPERATOR,
    isGuard: role === ROLES.GUARD,
    isAuditor: role === ROLES.AUDITOR
  }), [role]);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        login,
        logout,
        loading,
        setLoading,
        role,
        userName,
        permissions,
        ROLES
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
