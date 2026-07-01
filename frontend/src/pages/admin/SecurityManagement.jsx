import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import api from "../../services/api";
import { getDepartments } from "../../services/departmentService";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function SecurityManagement() {
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      username: "",
      password: "",
      securityCode: "",
      departmentId: "",
      hodName: "",
      hodMobile: "",
    }
  });

  const watchDepartmentId = watch("departmentId");

  const { data: deptData, isLoading: isDeptLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });
  const deptList = Array.isArray(deptData) ? deptData : deptData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["security-users"],
    queryFn: () => api.get("/api/auth/users/role/security").then((r) => r.data),
  });

  const securityUsers = data?.data || [];

  const onRegister = async (form) => {
    setMessage({ type: "", text: "" });
    try {
      await api.post("/api/auth/register", {
        username: form.username,
        password: form.password,
        role: "SECURITY",
        securityCode: form.securityCode,
        departmentId: form.departmentId ? parseInt(form.departmentId, 10) : undefined,
        hodName: form.hodName || undefined,
        hodMobile: form.hodMobile || undefined,
      });
      setMessage({ type: "success", text: `Security account "${form.username}" created successfully.` });
      reset({ username: "", password: "", securityCode: "", departmentId: "", hodName: "", hodMobile: "" });
      qc.invalidateQueries({ queryKey: ["security-users"] });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create security account" });
    }
  };

  if (isLoading || isDeptLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Security Accounts"
        subtitle="Manage security guard accounts. Security guards log in via the Employee Portal."
      />
      <Alert type={message.type} message={message.text} onClose={() => setMessage({ type: "", text: "" })} />

      <form onSubmit={handleSubmit(onRegister)} className="card-panel mb-6 max-w-xl space-y-3">
        <h3 className="font-semibold text-slate-800">Create Security Account</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium block">
            Username *
            <input className="form-input mt-1" placeholder="e.g. security_guard1" {...register("username", { required: true })} />
          </label>
          <label className="text-sm font-medium block">
            Password *
            <div className="relative mt-1">
              <input type={showPassword ? "text" : "password"} className="form-input pr-10" placeholder="••••••••" {...register("password", { required: true })} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
          </label>
          <label className="text-sm font-medium block">
            Security ID (Code) *
            <input className="form-input mt-1" placeholder="e.g. SEC001" {...register("securityCode", { required: true })} />
          </label>
          <label className="text-sm font-medium block">
            Department
            <select className="form-input mt-1" {...register("departmentId")}>
              <option value="">Select department (optional)</option>
              {deptList.map((d) => (
                <option key={d.departmentID} value={d.departmentID}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </label>
          {watchDepartmentId && (
            <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
              <label className="text-sm font-medium block">
                HOD Name
                <input className="form-input mt-1" placeholder="Type HOD name e.g. Rajesh" {...register("hodName")} />
              </label>
              <label className="text-sm font-medium block">
                HOD Mobile
                <input className="form-input mt-1" placeholder="For urgent outing calls" {...register("hodMobile")} />
              </label>
            </div>
          )}
        </div>
        <button type="submit" className="btn-primary">Create Account</button>
      </form>

      {securityUsers.length === 0 ? (
        <p className="text-slate-500">No security guard accounts registered yet. Create one above.</p>
      ) : (
        <div className="card-panel">
          <h3 className="font-semibold text-slate-800 mb-3">Registered Security Accounts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-3">User ID</th>
                  <th className="px-3">Username</th>
                  <th className="px-3">Security ID</th>
                  <th className="px-3">Department</th>
                  <th className="px-3">Assigned HOD</th>
                  <th className="px-3">Status</th>
                  <th className="px-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {securityUsers.map((u) => (
                  <tr key={u.userID} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-500">#{u.userID}</td>
                    <td className="px-3 font-medium text-slate-900">{u.username}</td>
                    <td className="px-3 font-medium text-slate-900">{u.securityCode}</td>
                    <td className="px-3 text-slate-700">{u.departmentName}</td>
                    <td className="px-3 text-slate-700">{u.hodName}</td>
                    <td className="px-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
