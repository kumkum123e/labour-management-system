import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getLabour, updateLabour, uploadDocument } from "../../services/labourService";
import { getDepartments, getDepartmentHods } from "../../services/departmentService";

export default function EditLabour() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const [photo, setPhoto] = useState(null);
  const { register, handleSubmit, reset, watch } = useForm();
  const departmentId = watch("departmentId");
  const typedHodName = watch("hodName");

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
        hodName: l.hodName || "",
        hodMobile: "",
        photoUrl: "",
      });
    }
  }, [data, reset]);

  const onSubmit = async (form) => {
    try {
      const payload = {
        labourName: form.labourName,
        contractorName: form.contractorName,
        phone: form.phone,
        address: form.address,
        departmentId: parseInt(form.departmentId, 10),
        hodMobile: form.hodMobile || undefined,
      };

      if (form.hodName?.trim()) {
        payload.hodName = form.hodName.trim();
      } else {
        payload.hodId = null;
      }

      await updateLabour(id, payload);
      if (photo) {
        await uploadDocument(id, photo, "photo");
      }
      setMessage({ type: "success", text: "Employee profile updated" });
      qc.invalidateQueries({ queryKey: ["all-hods"] });
      qc.invalidateQueries({ queryKey: ["labours"] });
      setTimeout(() => navigate("/admin/labour"), 1200);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Update failed" });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  const labour = data?.data;
  const assignedHod = (hodsRes?.data || []).find(
    (h) => h.hodName?.trim().toLowerCase() === typedHodName?.trim().toLowerCase()
  );

  return (
    <div>
      <PageHeader title="Edit Employee" subtitle={`${labour?.labourName} (${labour?.employeeCode})`} />
      <Alert type={message.type} message={message.text} />
      <form onSubmit={handleSubmit(onSubmit)} className="card-panel max-w-2xl space-y-4">
        <label className="text-sm font-medium">Employee Name
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
        <label className="text-sm font-medium">Assigned HOD Name
          <input className="form-input" placeholder="Type HOD name e.g. Rajesh" {...register("hodName")} />
        </label>
        <label className="text-sm font-medium">
          HOD Mobile (updates HOD phone on save)
          <input className="form-input" placeholder={assignedHod?.mobileNumber || "Enter to update HOD mobile"} {...register("hodMobile")} />
        </label>
        <label className="text-sm font-medium">Employee Mobile
          <input className="form-input" {...register("phone")} />
        </label>
        <label className="text-sm font-medium">Upload Photo
          <input type="file" accept="image/*" className="form-input" onChange={(e) => setPhoto(e.target.files?.[0])} />
        </label>
        <label className="text-sm font-medium">Address
          <textarea className="form-input" rows={2} {...register("address")} />
        </label>
        <button type="submit" className="btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
