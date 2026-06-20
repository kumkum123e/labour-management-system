import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Modal from "../../components/modals/Modal";
import Alert from "../../components/common/Alert";
import { getAllHods, updateHod } from "../../services/hodService";
import { getLabours } from "../../services/labourService";

export default function HODs() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ hodName: "", mobileNumber: "" });
  const [message, setMessage] = useState({ type: "", text: "" });

  const { data: hodsRes, isLoading: hodsLoading } = useQuery({
    queryKey: ["all-hods"],
    queryFn: getAllHods,
  });
  const { data: laboursRes, isLoading: laboursLoading } = useQuery({
    queryKey: ["labours"],
    queryFn: getLabours,
  });

  const hods = hodsRes?.data || [];

  const laboursByHod = useMemo(() => {
    const list = laboursRes?.data || [];
    const map = {};
    for (const l of list) {
      if (!l.hodID) continue;
      if (!map[l.hodID]) map[l.hodID] = [];
      map[l.hodID].push(l);
    }
    return map;
  }, [laboursRes?.data]);

  const openEdit = (hod) => {
    setEditTarget(hod);
    setEditForm({ hodName: hod.hodName, mobileNumber: hod.mobileNumber || "" });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateHod(editTarget.hodID, editForm);
      setMessage({ type: "success", text: "HOD details updated" });
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ["all-hods"] });
      qc.invalidateQueries({ queryKey: ["departments-admin"] });
      qc.invalidateQueries({ queryKey: ["labours"] });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Update failed" });
    }
  };

  if (hodsLoading || laboursLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="HODs" subtitle="Edit HOD details — assigned labour updates automatically" />
      <Alert type={message.type} message={message.text} onClose={() => setMessage({ type: "", text: "" })} />

      {hods.length === 0 ? (
        <p className="text-slate-500">No HODs yet. Add labour and assign a new HOD in a department.</p>
      ) : (
        <div className="space-y-4">
          {hods.map((hod) => {
            const assigned = laboursByHod[hod.hodID] || [];
            return (
              <div key={hod.hodID} className="card-panel">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{hod.hodName}</h3>
                    <p className="text-sm text-slate-500">Department: <strong>{hod.departmentName}</strong></p>
                    <p className="mt-1 text-sm text-slate-600">
                      Username: {hod.username || "—"} · Mobile: <strong>{hod.mobileNumber || "—"}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {assigned.length} labour
                    </span>
                    <button type="button" className="btn-outline-sm" onClick={() => openEdit(hod)}>
                      Edit HOD
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Assigned Labour</h4>
                  {assigned.length === 0 ? (
                    <p className="text-sm text-slate-400">No labour assigned yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-slate-500">
                            <th className="py-2">Employee ID</th>
                            <th>Name</th>
                            <th>Labour Mobile</th>
                            <th>Contractor</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assigned.map((l) => (
                            <tr key={l.labourID} className="border-b border-slate-100">
                              <td className="py-2">{l.employeeCode}</td>
                              <td className="font-medium">{l.labourName}</td>
                              <td>{l.phone || "—"}</td>
                              <td>{l.contractorName || "—"}</td>
                              <td>
                                <span className={`rounded px-2 py-0.5 text-xs ${l.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit HOD — ${editTarget?.hodName}`}>
        <form onSubmit={saveEdit} className="space-y-3">
          <label className="text-sm font-medium block">
            HOD Name
            <input
              className="form-input"
              value={editForm.hodName}
              onChange={(e) => setEditForm({ ...editForm, hodName: e.target.value })}
              required
            />
          </label>
          <label className="text-sm font-medium block">
            Mobile Number
            <input
              className="form-input"
              value={editForm.mobileNumber}
              onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
              placeholder="Used for urgent outing phone alerts"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-outline" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
