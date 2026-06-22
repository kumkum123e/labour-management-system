import { Routes, Route, Navigate } from "react-router-dom";
import SecurityLayout from "../layouts/SecurityLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import SecurityDashboard from "../pages/security/Dashboard";
import SecurityReports from "../pages/security/Reports";

export default function SecurityRoutes() {
  return (
    <ProtectedRoute role="SECURITY">
      <Routes>
        <Route element={<SecurityLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SecurityDashboard />} />
          <Route path="reports" element={<SecurityReports />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}
