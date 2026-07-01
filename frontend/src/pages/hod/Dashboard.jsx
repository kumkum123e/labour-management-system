import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiClock, FiCheck, FiX, FiUsers, FiPhone } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/cards/StatCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Alert from "../../components/common/Alert";
import { getHodDashboard } from "../../services/dashboardService";
import { getNotifications, markNotificationRead } from "../../services/notificationService";
import { getOutingRequests, approveRequest, rejectRequest } from "../../services/requestService";
import { formatTime } from "../../utils/timeFormat";

export default function HodDashboard() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [remarks, setRemarks] = useState({});

  const { data, isLoading } = useQuery({ queryKey: ["hod-dashboard"], queryFn: getHodDashboard });
  const { data: notifs } = useQuery({ queryKey: ["hod-notifs-all"], queryFn: () => getNotifications(false) });
  const { data: requestsData, refetch: refetchRequests } = useQuery({ queryKey: ["hod-requests"], queryFn: getOutingRequests });

  const markRead = async (id) => {
    await markNotificationRead(id);
    qc.invalidateQueries({ queryKey: ["hod-notifs-all"] });
  };

  const approve = async (id) => {
    try {
      await approveRequest(id, remarks[id] || "Approved");
      setMessage("Request approved successfully");
      qc.invalidateQueries({ queryKey: ["hod-requests"] });
      qc.invalidateQueries({ queryKey: ["hod-dashboard"] });
      refetchRequests();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to approve request");
    }
  };

  const reject = async (id) => {
    if (!remarks[id]) {
      setMessage("Remarks are required for rejection");
      return;
    }
    try {
      await rejectRequest(id, remarks[id]);
      setMessage("Request rejected successfully");
      qc.invalidateQueries({ queryKey: ["hod-requests"] });
      qc.invalidateQueries({ queryKey: ["hod-dashboard"] });
      refetchRequests();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reject request");
    }
  };

  if (isLoading) return <LoadingSpinner />;
  const s = data?.data || {};
  const notifications = notifs?.data || [];
  const pending = (requestsData?.data || []).filter((r) => r.status === "Pending");

  return (
    <div>
      <PageHeader title="HOD Dashboard" subtitle={s.departmentName ? `Department: ${s.departmentName}` : ""} />
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Requests" value={s.pendingRequests} icon={FiClock} accent="bg-amber-50 text-amber-700" />
        <StatCard label="Approved" value={s.approvedRequests} icon={FiCheck} accent="bg-emerald-50 text-emerald-700" />
        <StatCard label="Rejected" value={s.rejectedRequests} icon={FiX} accent="bg-red-50 text-red-700" />
        <StatCard label="Department Labour" value={s.departmentLabourCount} icon={FiUsers} />
      </div>

      <Alert type={message.includes("Failed") || message.includes("required") ? "error" : "success"} message={message} onClose={() => setMessage("")} />

      {/* Pending Requests Section */}
      <div className="card-panel mt-6">
        <h3 className="mb-3 font-semibold text-slate-800 flex items-center gap-2">
          <FiClock className="text-amber-500" /> Pending Outing Requests
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">No pending outing requests at the moment.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((r) => (
              <div key={r.requestID} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition duration-150">
                <div className="flex flex-wrap justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">{r.labourName} ({r.employeeCode})</h4>
                  <div className="flex gap-2">
                    {r.isUrgent && <span className="rounded bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-750 animate-pulse">URGENT</span>}
                    <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 font-medium">{r.status}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">{r.departmentName} · {new Date(r.requestDate).toLocaleDateString()} · Out: {formatTime(r.outTime)} · Return: {formatTime(r.returnTime) || "—"}</p>
                <p className="mt-2 text-sm text-slate-700"><strong>Reason:</strong> {r.reason}</p>
                <textarea
                  className="form-input mt-3 text-sm bg-white"
                  placeholder="Enter remarks for approval or rejection..."
                  value={remarks[r.requestID] || ""}
                  onChange={(e) => setRemarks({ ...remarks, [r.requestID]: e.target.value })}
                  rows={2}
                />
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-primary py-1.5 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700" onClick={() => approve(r.requestID)}>Approve</button>
                  <button type="button" className="btn-outline py-1.5 px-4 text-xs font-semibold text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300" onClick={() => reject(r.requestID)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-panel mt-6">
        <h3 className="mb-3 font-semibold text-slate-800">All Notifications</h3>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.notificationID}
                className={`rounded-lg border p-3 text-sm ${
                  n.type === "urgent" ? "border-red-300 bg-red-50" : !n.isRead ? "border-primary/30 bg-blue-50/50" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="flex items-center gap-1">
                      {n.type === "urgent" && <FiPhone className="text-red-600" />}
                      {n.title}
                    </strong>
                    <p className="mt-1 text-slate-600">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => markRead(n.notificationID)}>
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
