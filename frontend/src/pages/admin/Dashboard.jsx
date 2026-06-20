import { useQuery } from "@tanstack/react-query";
import { FiUsers, FiUserCheck, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/cards/StatCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getAdminDashboard } from "../../services/dashboardService";
import { getActivityLogs } from "../../services/reportService";

export default function AdminDashboard() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
  });
  const { data: logs } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => getActivityLogs(8),
  });

  if (isLoading) return <LoadingSpinner />;
  const stats = dash?.data || {};

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System overview and recent activity" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Labour" value={stats.totalLabour} icon={FiUsers} />
        <StatCard label="Active Labour" value={stats.totalLabour} icon={FiUserCheck} accent="bg-emerald-50 text-emerald-700" />
        <StatCard label="Pending Requests" value={stats.pendingRequests} icon={FiClock} accent="bg-amber-50 text-amber-700" />
        <StatCard label="Approved" value={stats.approvedRequests} icon={FiCheckCircle} accent="bg-emerald-50 text-emerald-700" />
        <StatCard label="Rejected" value={stats.rejectedRequests} icon={FiXCircle} accent="bg-red-50 text-red-700" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <StatCard label="Departments" value={stats.totalDepartments} />
        <StatCard label="HODs" value={stats.totalHODs} />
      </div>
      <div className="card-panel mt-6">
        <h2 className="mb-3 font-semibold text-slate-800">Recent Activities</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          {(logs?.data || []).map((log) => (
            <li key={log.logID} className="border-b border-slate-100 pb-2">
              <strong>{log.username || "System"}</strong> — {log.action}
              <span className="ml-2 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {!(logs?.data?.length) && <li className="text-slate-400">No recent activity</li>}
        </ul>
      </div>
    </div>
  );
}
