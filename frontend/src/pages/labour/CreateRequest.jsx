import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import { createOutingRequest } from "../../services/requestService";
import { getLabours } from "../../services/labourService";
import { useAuth } from "../../hooks/useAuth";

const getFormattedCurrentTime24 = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hoursStr}:${minutesStr}`;
};

export default function CreateRequest() {
  const { user } = useAuth();
  const [message, setMessage] = useState({ type: "", text: "" });
  const { data: profileData } = useQuery({ queryKey: ["labour-profile"], queryFn: getLabours });
  const profile = profileData?.data?.[0];

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      requestDate: new Date().toISOString().slice(0, 10),
      outTime: getFormattedCurrentTime24(),
      returnTime: "18:00",
      reason: "",
      isUrgent: false,
    },
  });
  const isUrgent = watch("isUrgent");

  const onSubmit = async (form) => {
    try {
      await createOutingRequest({
        requestDate: form.requestDate,
        outTime: form.outTime,
        returnTime: form.returnTime,
        reason: form.reason,
        isUrgent: form.isUrgent,
      });
      setMessage({
        type: "success",
        text: form.isUrgent
          ? "URGENT request submitted — your HOD will receive a phone call"
          : "Request submitted to your HOD for approval",
      });
      reset({ requestDate: form.requestDate, outTime: getFormattedCurrentTime24(), returnTime: form.returnTime, reason: "", isUrgent: false });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Submit failed" });
    }
  };

  return (
    <div>
      <PageHeader title="Create Outing Request" subtitle="Request will be sent to your assigned HOD" />
      <Alert type={message.type} message={message.text} />
      <div className="card-panel mb-4 max-w-xl text-sm text-slate-600">
        <p><strong>Name:</strong> {profile?.labourName || user?.username}</p>
        <p><strong>Employee ID:</strong> {profile?.employeeCode || "—"}</p>
        <p><strong>Department:</strong> {profile?.departmentName || "—"}</p>
        <p><strong>Assigned HOD:</strong> {profile?.hodName || "—"}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="card-panel max-w-xl space-y-4">
        <label className="text-sm font-medium">Date *
          <input type="date" className="form-input" {...register("requestDate", { required: true })} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Out Time *
            <input type="time" className="form-input" {...register("outTime", { required: true })} />
          </label>
          <label className="text-sm font-medium">Return Time
            <input type="time" className="form-input" {...register("returnTime")} />
          </label>
        </div>
        <label className="text-sm font-medium">Reason *
          <textarea className="form-input" rows={3} {...register("reason", { required: true })} />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <input type="checkbox" className="h-4 w-4" {...register("isUrgent")} />
          <span>
            <strong className="text-red-800">Urgent request</strong>
            <span className="block text-xs text-red-600">HOD will receive an immediate phone call for approval</span>
          </span>
        </label>
        {isUrgent && <p className="text-xs text-red-600">Phone call will be made to your assigned HOD&apos;s mobile number.</p>}
        <button type="submit" className="btn-primary">Submit Request</button>
      </form>
    </div>
  );
}
