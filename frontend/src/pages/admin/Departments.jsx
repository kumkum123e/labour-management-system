import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getDepartmentsAdmin, addDepartment } from "../../services/departmentService";

export default function Departments() {
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const { register, handleSubmit, reset } = useForm({ defaultValues: { description: "" } });

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
        subtitle="Create departments here — assign HODs when adding labour"
      />
      <Alert type={message.type} message={message.text} />

      <form onSubmit={handleSubmit(onAddDept)} className="card-panel mb-6 max-w-xl space-y-3">
        <h3 className="font-semibold">Create Department</h3>
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
              <h3 className="text-lg font-bold text-slate-900">{dept.departmentName}</h3>
              {dept.description && <p className="text-sm text-slate-500">{dept.description}</p>}
              <p className="mt-2 text-sm text-slate-600">
                <strong>{dept.hods?.length || 0}</strong> HOD(s) · <strong>{dept.labourCount || 0}</strong> labour total
              </p>

              {(dept.hods?.length || 0) > 0 && (
                <div className="mt-4 overflow-x-auto">
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
                HODs are added via Add Labour → select this department → New HOD
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
