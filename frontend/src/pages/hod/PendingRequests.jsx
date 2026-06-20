import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import { getOutingRequests, approveRequest, rejectRequest } from "../../services/requestService";

export default function PendingRequests() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [remarks, setRemarks] = useState({});

  const { data, refetch } = useQuery({ queryKey: ["hod-requests"], queryFn: getOutingRequests });
  const pending = (data?.data || []).filter((r) => r.status === "Pending");

  const approve = async (id) => {
    try {
      await approveRequest(id, remarks[id] || "Approved");
      setMessage("Request approved");
      qc.invalidateQueries({ queryKey: ["hod-requests"] });
      qc.invalidateQueries({ queryKey: ["hod-dashboard"] });
      refetch();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to approve request");
    }
  };

  const reject = async (id) => {
    if (!remarks[id]) return setMessage("Remarks required for rejection");
    try {
      await rejectRequest(id, remarks[id]);
      setMessage("Request rejected");
      qc.invalidateQueries({ queryKey: ["hod-requests"] });
      qc.invalidateQueries({ queryKey: ["hod-dashboard"] });
      refetch();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reject request");
    }
  };

  return (
    <div>
      <PageHeader title="Pending Requests" subtitle="Approve or reject with remarks" />
      <Alert type="success" message={message} onClose={() => setMessage("")} />
      {pending.length === 0 ? (
        <p className="text-slate-500">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <div key={r.requestID} className="card-panel">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">{r.labourName} ({r.employeeCode})</h3>
                <div className="flex gap-2">
                  {r.isUrgent && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">URGENT</span>}
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{r.status}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600">{r.departmentName} · {r.requestDate} · Out: {r.outTime} · Return: {r.returnTime || "—"}</p>
              <p className="mt-2 text-sm"><strong>Reason:</strong> {r.reason}</p>
              <textarea
                className="form-input mt-3"
                placeholder="Remarks"
                value={remarks[r.requestID] || ""}
                onChange={(e) => setRemarks({ ...remarks, [r.requestID]: e.target.value })}
                rows={2}
              />
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-primary" onClick={() => approve(r.requestID)}>Approve</button>
                <button type="button" className="btn-outline" onClick={() => reject(r.requestID)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
