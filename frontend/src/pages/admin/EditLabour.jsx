import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getLabour, updateLabour } from "../../services/labourService";
import { getDepartments, getDepartmentHods } from "../../services/departmentService";

export default function EditLabour() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const { register, handleSubmit, reset, watch } = useForm();
  const departmentId = watch("departmentId");

  const { data, isLoading } = useQuery({ queryKey: ["labour", id], queryFn: () => getLabour(id) });
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartments });
  const { data: hodsRes } = useQuery({
    queryKey: ["dept-hods", departmentId],
    queryFn: () => getDepartmentHods(departmentId),
    enabled: !!departmentId,
  });

  const deptList = Array.isArray(deptRes) ? deptRes : deptRes?.data || [];

  useEffect(() => {
    const l = data?.data;
    if (l) {
      reset({
        labourName: l.labourName,
        contractorName: l.contractorName || "",
        phone: l.phone || "",
        address: l.address || "",
        departmentId: l.departmentID,
        hodId: l.hodID || "",
        hodMobile: "",
      });
    }
  }, [data, reset]);

  const onSubmit = async (form) => {
    try {
      await updateLabour(id, {
        labourName: form.labourName,
        contractorName: form.contractorName,
        phone: form.phone,
        address: form.address,
        departmentId: parseInt(form.departmentId, 10),
        hodId: form.hodId ? parseInt(form.hodId, 10) : undefined,
        hodMobile: form.hodMobile || undefined,
      });
      setMessage({ type: "success", text: "Labour profile updated" });
      qc.invalidateQueries({ queryKey: ["all-hods"] });
      qc.invalidateQueries({ queryKey: ["labours"] });
      setTimeout(() => navigate("/admin/labour"), 1200);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Update failed" });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  const labour = data?.data;
  const assignedHod = (hodsRes?.data || []).find((h) => h.hodID === labour?.hodID);

  return (
    <div>
      <PageHeader title="Edit Labour" subtitle={`${labour?.labourName} (${labour?.employeeCode})`} />
      <Alert type={message.type} message={message.text} />
      <form onSubmit={handleSubmit(onSubmit)} className="card-panel max-w-2xl space-y-4">
        <label className="text-sm font-medium">Labour Name
          <input className="form-input" {...register("labourName", { required: true })} />
        </label>
        <label className="text-sm font-medium">Contractor
          <input className="form-input" {...register("contractorName")} />
        </label>
        <label className="text-sm font-medium">Department
          <select className="form-input" {...register("departmentId")}>
            {deptList.map((d) => (
              <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">Assigned HOD
          <select className="form-input" {...register("hodId")}>
            <option value="">None</option>
            {(hodsRes?.data || []).map((h) => (
              <option key={h.hodID} value={h.hodID}>{h.hodName}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          HOD Mobile (updates HOD phone on save)
          <input className="form-input" placeholder={assignedHod?.mobileNumber || "Enter to update HOD mobile"} {...register("hodMobile")} />
        </label>
        <label className="text-sm font-medium">Labour Mobile
          <input className="form-input" {...register("phone")} />
        </label>
        <label className="text-sm font-medium">Address
          <textarea className="form-input" rows={2} {...register("address")} />
        </label>
        <button type="submit" className="btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
