import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminDashboard from "../pages/admin/Dashboard";
import AddLabour from "../pages/admin/AddLabour";
import Departments from "../pages/admin/Departments";
import HODs from "../pages/admin/HODs";
import EditLabour from "../pages/admin/EditLabour";
import Reports from "../pages/admin/Reports";
import Backup from "../pages/admin/Backup";
import ActivityLogs from "../pages/admin/ActivityLogs";
import SecurityManagement from "../pages/admin/SecurityManagement";

export default function AdminRoutes() {
  return (
    <ProtectedRoute role="ADMIN">
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="labour" element={<AddLabour />} />
          <Route path="labour/add" element={<Navigate to="/admin/labour" replace />} />
          <Route path="departments" element={<Departments />} />
          <Route path="hods" element={<HODs />} />
          <Route path="labour/edit/:id" element={<EditLabour />} />
          <Route path="reports" element={<Reports />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="security-accounts" element={<SecurityManagement />} />
          <Route path="backup" element={<Backup />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}
