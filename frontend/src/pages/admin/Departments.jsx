import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  getDepartmentsAdmin,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../services/departmentService";

export default function Departments() {
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const { register, handleSubmit, reset } = useForm({ defaultValues: { description: "" } });

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["departments-admin"],
    queryFn: getDepartmentsAdmin,
  });

  const departments = data?.data || [];

  const onAddDept = async (form) => {
    setMessage({ type: "", text: "" });
    try {
      await addDepartment({ departmentName: form.departmentName, description: form.description });
      setMessage({ type: "success", text: `Department "${form.departmentName}" created — select it in Add Labour` });
      reset({ departmentName: "", description: "" });
      qc.invalidateQueries({ queryKey: ["departments-admin"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to add department" });
    }
  };

  const startEditing = (dept) => {
    setEditingId(dept.departmentID);
    setEditName(dept.departmentName);
    setEditDesc(dept.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) {
      setMessage({ type: "error", text: "Department name is required" });
      return;
    }
    setEditLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await updateDepartment(id, { departmentName: editName, description: editDesc });
      setMessage({ type: "success", text: "Department updated successfully" });
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["departments-admin"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update department" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the department "${name}"?`)) {
      setMessage({ type: "", text: "" });
      try {
        await deleteDepartment(id);
        setMessage({ type: "success", text: `Department "${name}" deleted successfully` });
        qc.invalidateQueries({ queryKey: ["departments-admin"] });
        qc.invalidateQueries({ queryKey: ["departments"] });
      } catch (err) {
        setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete department" });
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return (
      <div className="p-4">
        <PageHeader title="Departments" subtitle="Error loading departments" />
        <Alert type="error" message={error.response?.data?.message || error.message} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Create, edit, or delete departments here — assign HODs when adding labour"
      />
      <Alert type={message.type} message={message.text} />

      <form onSubmit={handleSubmit(onAddDept)} className="card-panel mb-6 max-w-xl space-y-3">
        <h3 className="font-semibold text-slate-800">Create Department</h3>
        <label className="text-sm font-medium block">
          Department Name *
          <input className="form-input" placeholder="e.g. Production" {...register("departmentName", { required: true })} />
        </label>
        <label className="text-sm font-medium block">
          Description
          <input className="form-input" {...register("description")} />
        </label>
        <button type="submit" className="btn-primary">Create Department</button>
      </form>

      {departments.length === 0 ? (
        <p className="text-slate-500">No departments yet. Create one above.</p>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => (
            <div key={dept.departmentID} className="card-panel">
              {editingId === dept.departmentID ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">Edit Department</h4>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Department Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdate(dept.departmentID)}
                      disabled={editLoading}
                      className="btn-primary py-1 px-3 text-sm font-semibold"
                    >
                      {editLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="border border-slate-300 hover:bg-slate-50 rounded-lg py-1 px-3 text-sm font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{dept.departmentName}</h3>
                      {dept.description && <p className="text-sm text-slate-500 mt-1">{dept.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(dept)}
                        className="text-xs font-semibold bg-slate-100 hover:bg-slate-250 text-slate-700 py-1 px-2.5 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dept.departmentID, dept.departmentName)}
                        className="text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 py-1 px-2.5 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 border-t border-slate-100 pt-2">
                    <strong>{dept.hods?.length || 0}</strong> HOD(s) · <strong>{dept.labourCount || 0}</strong> labour total
                  </p>

                  {(dept.hods?.length || 0) > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-slate-500">
                            <th className="py-2">HOD Name</th>
                            <th>Mobile</th>
                            <th>Labour Assigned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dept.hods.map((h) => (
                            <tr key={h.hodID} className="border-b border-slate-100">
                              <td className="py-2 font-medium">{h.hodName}</td>
                              <td>{h.mobileNumber || "—"}</td>
                              <td>{h.labourCount || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-400">
                    HODs are assigned via Add Labour → select this department → select or create HOD.
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
