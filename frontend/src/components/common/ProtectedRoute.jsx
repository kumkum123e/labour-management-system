import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useEffect } from "react";

export default function ProtectedRoute({ role, children }) {
  const { user, logout, isPrivateNetwork } = useAuth();

  const userRole = user && (user.role || user.role_name) ? String(user.role || user.role_name).trim().toUpperCase() : null;
  const targetRole = role ? String(role).trim().toUpperCase() : null;

  useEffect(() => {
    if (userRole && targetRole && userRole !== targetRole && userRole !== "ADMIN") {
      logout();
    }
  }, [userRole, targetRole, logout]);

  if (!user || (!user.role && !user.role_name)) {
    if (targetRole === "ADMIN") return <Navigate to="/admin-login" replace />;
    if (targetRole === "HOD") return <Navigate to="/hod-login" replace />;
    if (targetRole === "LABOUR") return <Navigate to="/labour-login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (targetRole && userRole !== targetRole && userRole !== "ADMIN") {
    if (targetRole === "ADMIN") return <Navigate to="/admin-login" replace />;
    if (targetRole === "HOD") return <Navigate to="/hod-login" replace />;
    if (targetRole === "LABOUR") return <Navigate to="/labour-login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (userRole === "ADMIN" && !isPrivateNetwork) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
