import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getRoleDashboardPath } from "../../utils/roleRedirect";

export default function ProtectedRoute({ role, children }) {
  const { user, isPrivateNetwork } = useAuth();

  const userRole = user && (user.role || user.role_name) ? String(user.role || user.role_name).trim().toUpperCase() : null;
  const targetRole = role ? String(role).trim().toUpperCase() : null;

  if (!user || (!user.role && !user.role_name)) {
    if (targetRole === "ADMIN") return <Navigate to="/admin-login" replace />;
    if (targetRole === "HOD") return <Navigate to="/hod-login" replace />;
    if (targetRole === "LABOUR") return <Navigate to="/labour-login" replace />;
    if (targetRole === "SECURITY") return <Navigate to="/labour-login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (targetRole && userRole !== targetRole && userRole !== "ADMIN") {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />;
  }

  if (userRole === "ADMIN" && !isPrivateNetwork) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
