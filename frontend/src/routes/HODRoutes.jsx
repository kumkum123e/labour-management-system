import { Routes, Route, Navigate } from "react-router-dom";
import HODLayout from "../layouts/HODLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import HodDashboard from "../pages/hod/Dashboard";
import PendingRequests from "../pages/hod/PendingRequests";
import ApprovedRequests from "../pages/hod/ApprovedRequests";
import RejectedRequests from "../pages/hod/RejectedRequests";
import HodHistory from "../pages/hod/History";

export default function HODRoutes() {
  return (
    <ProtectedRoute role="HOD">
      <Routes>
        <Route element={<HODLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HodDashboard />} />
          <Route path="pending" element={<PendingRequests />} />
          <Route path="approved" element={<ApprovedRequests />} />
          <Route path="rejected" element={<RejectedRequests />} />
          <Route path="history" element={<HodHistory />} />
          <Route path="notifications" element={<Navigate to="/hod/dashboard" replace />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}
