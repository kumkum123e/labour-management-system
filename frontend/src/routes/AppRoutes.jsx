import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getRoleDashboardPath } from "../utils/roleRedirect";
import Login from "../pages/auth/Login";
import AdminLogin from "../pages/auth/AdminLogin";
import HODLogin from "../pages/auth/HODLogin";
import LabourLogin from "../pages/auth/LabourLogin";
import Logout from "../pages/auth/Logout";
import AdminRoutes from "./AdminRoutes";
import HODRoutes from "./HODRoutes";
import LabourRoutes from "./LabourRoutes";
import SecurityRoutes from "./SecurityRoutes";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDashboardPath(user.role)} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/login/admin" element={<Navigate to="/admin-login" replace />} />
      <Route path="/hod-login" element={<HODLogin />} />
      <Route path="/login/hod" element={<Navigate to="/hod-login" replace />} />
      <Route path="/labour-login" element={<LabourLogin />} />
      <Route path="/login/labour" element={<Navigate to="/labour-login" replace />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/hod/*" element={<HODRoutes />} />
      <Route path="/labour/*" element={<LabourRoutes />} />
      <Route path="/security/*" element={<SecurityRoutes />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
