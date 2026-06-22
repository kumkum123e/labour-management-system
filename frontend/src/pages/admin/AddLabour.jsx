import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LabourListSection from "../../components/forms/LabourListSection";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { getDepartments } from "../../services/departmentService";
import { createLabour, uploadDocument } from "../../services/labourService";

export default function AddLabour() {
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const [photo, setPhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: (() => {
      const saved = localStorage.getItem("addLabourForm");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
      return {
        joiningDate: new Date().toISOString().slice(0, 10),
        password: "123456",
        departmentId: "",
        hodName: "",
        hodMobile: "",
        employeeCode: "",
        labourName: "",
        contractorName: "",
        phone: "",
        address: "",
      };
    })(),
  });

  const formValues = watch();
  const departmentId = formValues.departmentId;

  useEffect(() => {
    localStorage.setItem("addLabourForm", JSON.stringify(formValues));
  }, [formValues]);

  const { data: departments, isError, error } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  const deptList = Array.isArray(departments) ? departments : departments?.data || [];

  const onSubmit = async (form) => {
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        employeeCode: form.employeeCode,
        labourName: form.labourName,
        contractorName: form.contractorName || undefined,
        departmentId: parseInt(form.departmentId, 10),
        phone: form.phone || undefined,
        address: form.address || undefined,
        joiningDate: form.joiningDate,
        password: form.password || "123456",
        hodMobile: form.hodMobile || undefined,
      };

      if (form.hodName?.trim()) {
        payload.hodName = form.hodName.trim();
      }

      const res = await createLabour(payload);
      if (photo && res.data?.labourID) {
        await uploadDocument(res.data.labourID, photo, "photo");
      }
      setMessage({
        type: "success",
        text: `Created ${res.data.labourName} → Dept: ${res.data.departmentName}${res.data.hodName ? `, HOD: ${res.data.hodName}` : ""}`,
      });
      reset({
        employeeCode: "",
        labourName: "",
        contractorName: "",
        departmentId: form.departmentId,
        hodName: "",
        hodMobile: "",
        phone: "",
        address: "",
        joiningDate: new Date().toISOString().slice(0, 10),
        password: "123456",
      });
      setPhoto(null);
      qc.invalidateQueries({ queryKey: ["labours"] });
      qc.invalidateQueries({ queryKey: ["departments-admin"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["all-hods"] });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create labour" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Labour"
        subtitle="Select department and type HOD name — HOD is added to that department and linked to this labour"
      />
      <Alert type={message.type} message={message.text} />
      {isError && (
        <Alert type="error" message={`Failed to load departments: ${error.response?.data?.message || error.message}`} />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card-panel space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Employee ID *
            <input className="form-input" placeholder="EMP001" {...register("employeeCode", { required: true })} />
          </label>
          <label className="text-sm font-medium">
            Labour Name *
            <input className="form-input" {...register("labourName", { required: true })} />
          </label>
        </div>
        <label className="text-sm font-medium">
          Contractor Name
          <input className="form-input" {...register("contractorName")} />
        </label>

        <label className="text-sm font-medium">
          Department *
          <select className="form-input" {...register("departmentId", { required: true })}>
            <option value="">Select department</option>
            {deptList.map((d) => (
              <option key={d.departmentID} value={d.departmentID}>
                {d.departmentName}
              </option>
            ))}
          </select>
          {!deptList.length && (
            <span className="mt-1 block text-xs text-amber-600">No departments — create one on the Departments page first</span>
          )}
        </label>

        {departmentId && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              HOD Name
              <input className="form-input" placeholder="Type HOD name e.g. Rajesh" {...register("hodName")} />
            </label>
            <label className="text-sm font-medium">
              HOD Mobile
              <input className="form-input" placeholder="For urgent outing calls" {...register("hodMobile")} />
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Labour Mobile
            <input className="form-input" {...register("phone")} />
          </label>
          <label className="text-sm font-medium">
            Joining Date
            <input type="date" className="form-input" {...register("joiningDate")} />
          </label>
        </div>
        <label className="text-sm font-medium">
          Photo Upload
          <input type="file" accept="image/*" className="form-input" onChange={(e) => setPhoto(e.target.files?.[0])} />
        </label>
        <label className="text-sm font-medium">
          Address
          <textarea className="form-input" rows={2} {...register("address")} />
        </label>
        <label className="text-sm font-medium block">
          Login Password
          <div className="relative mt-1">
            <input type={showPassword ? "text" : "password"} className="form-input pr-10" {...register("password")} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
            </button>
          </div>
        </label>
        <button type="submit" className="btn-primary" disabled={!departmentId}>
          Create Labour Profile
        </button>
      </form>

      <LabourListSection />
    </div>
  );
}
