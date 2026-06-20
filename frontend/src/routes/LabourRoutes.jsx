import { Routes, Route, Navigate } from "react-router-dom";
import LabourLayout from "../layouts/LabourLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import LabourDashboard from "../pages/labour/Dashboard";
import CreateRequest from "../pages/labour/CreateRequest";
import RequestStatus from "../pages/labour/RequestStatus";
import LabourHistory from "../pages/labour/History";

export default function LabourRoutes() {
  return (
    <ProtectedRoute role="LABOUR">
      <Routes>
        <Route element={<LabourLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<LabourDashboard />} />
          <Route path="create-request" element={<CreateRequest />} />
          <Route path="request-status" element={<RequestStatus />} />
          <Route path="history" element={<LabourHistory />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}
