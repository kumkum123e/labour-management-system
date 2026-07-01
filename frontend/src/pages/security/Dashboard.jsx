import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import api from "../../services/api";
import { FiSearch, FiTrash2, FiFileText } from "react-icons/fi";

const getFormattedCurrentTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  return `${hoursStr}:${minutesStr} ${ampm}`;
};

export default function SecurityDashboard() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [labour, setLabour] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  // Form fields
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [outTime, setOutTime] = useState(getFormattedCurrentTime());
  const [returnTime, setReturnTime] = useState("");
  const [reason, setReason] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  // Signature states
  const [signature, setSignature] = useState(null); // base64 data url
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [departmentHods, setDepartmentHods] = useState([]);
  const [selectedHodId, setSelectedHodId] = useState("");
  const [searchType, setSearchType] = useState("LABOUR"); // "LABOUR" or "SECURITY"

  // Lookup labour or security by Code/ID
  const fetchLabourDetails = async () => {
    if (!employeeCode.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLabour(null);
    setDepartmentHods([]);
    setSelectedHodId("");
    try {
      const endpoint = searchType === "LABOUR"
        ? `/api/labours/code/${employeeCode.trim()}`
        : `/api/auth/security/code/${employeeCode.trim()}`;
      const res = await api.get(endpoint);
      const profileData = res.data.data;
      setLabour(profileData);
      setSelectedHodId(profileData.hodID || "");
      if (profileData.departmentID) {
        const hodsRes = await api.get(`/api/departments/${profileData.departmentID}/hods`);
        setDepartmentHods(hodsRes.data.data || []);
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || `${searchType === "LABOUR" ? "Labour" : "Security"} profile not found for this ID`);
    } finally {
      setLookupLoading(false);
    }
  };

  // Drawing events and helper functions are removed because drawing is disabled

  // Upload signature
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignature(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setEmployeeCode("");
    setLabour(null);
    setDepartmentHods([]);
    setSelectedHodId("");
    setRequestDate(new Date().toISOString().slice(0, 10));
    setOutTime(getFormattedCurrentTime());
    setReturnTime("");
    setReason("");
    setIsUrgent(false);
    setSignature(null);
  };

  // Submit request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!labour) {
      setMessage({ type: "error", text: "Please enter a valid Employee ID and fetch labour details first." });
      return;
    }

    if (!selectedHodId) {
      setMessage({ type: "error", text: "Please select or assign an HOD first." });
      return;
    }

    if (!outTime || !reason) {
      setMessage({ type: "error", text: "Please fill in all required fields (Out Time and Reason)." });
      return;
    }



    setIsSubmitting(true);
    try {
      const payload = {
        employeeCode: employeeCode.trim(),
        requestDate,
        outTime,
        returnTime: returnTime || undefined,
        reason,
        isUrgent,
        securitySignature: signature,
        assignedHodId: parseInt(selectedHodId, 10),
      };

      await api.post("/api/outing-requests", payload);
      const chosenHod = departmentHods.find(h => String(h.hodID) === String(selectedHodId));
      const chosenHodName = chosenHod ? chosenHod.hodName : "HOD";
      setMessage({ type: "success", text: `Outing request successfully submitted to ${chosenHodName}` });
      resetForm();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create outing request" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Create Outing Request" subtitle="Security Portal — create outing requests on behalf of employees" />
      <Alert type={message.type} message={message.text} onClose={() => setMessage({ type: "", text: "" })} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Labour ID lookup */}
        <div className="md:col-span-1 space-y-4">
          <div className="card-panel">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <FiSearch size={16} /> Profile Search
            </h3>
            
            {/* Search Type Selector */}
            <div className="flex gap-4 mb-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="radio"
                  name="searchType"
                  value="LABOUR"
                  checked={searchType === "LABOUR"}
                  onChange={() => {
                    setSearchType("LABOUR");
                    resetForm();
                  }}
                  className="rounded-full border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                Employee ID
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="radio"
                  name="searchType"
                  value="SECURITY"
                  checked={searchType === "SECURITY"}
                  onChange={() => {
                    setSearchType("SECURITY");
                    resetForm();
                  }}
                  className="rounded-full border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                Security (Sec ID)
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {searchType === "LABOUR" ? "Employee ID *" : "Security ID *"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input text-sm"
                    placeholder={searchType === "LABOUR" ? "Enter ID (e.g. ravi)" : "Enter Security ID (e.g. SEC001)"}
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchLabourDetails()}
                  />
                  <button
                    type="button"
                    onClick={fetchLabourDetails}
                    disabled={lookupLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 py-2 flex items-center justify-center transition disabled:opacity-50"
                  >
                    {lookupLoading ? "..." : <FiSearch />}
                  </button>
                </div>
              </div>

              {lookupError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{lookupError}</p>}

              {labour && (
                <div className="mt-4 border-t border-slate-100 pt-3 text-sm space-y-2 text-slate-700">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      {searchType === "LABOUR" ? "Employee Name" : "Security Name"}
                    </span>
                    <strong className="text-slate-900">{labour.labourName}</strong>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      {searchType === "LABOUR" ? "Contractor" : "Role"}
                    </span>
                    <strong className="text-slate-900">{labour.contractorName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Department</span>
                    <strong>{labour.departmentName}</strong>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Assigned HOD *</span>
                    <select
                      className="form-input text-sm py-1 px-2 mt-0.5 bg-white border border-slate-200 rounded"
                      value={selectedHodId}
                      onChange={(e) => setSelectedHodId(e.target.value)}
                      required
                    >
                      <option value="">Select HOD</option>
                      {departmentHods.map((h) => (
                        <option key={h.hodID} value={h.hodID}>
                          {h.hodName}
                        </option>
                      ))}
                    </select>
                    {departmentHods.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No HODs registered for this department.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right columns: Outing details and signature */}
        <form onSubmit={handleSubmit} className="md:col-span-2 card-panel space-y-4">
          <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
            <FiFileText size={16} /> Outing Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium block">
                Outing Date *
                <input
                  type="date"
                  className="form-input mt-1"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                />
              </label>
            </div>
            <div>
              <label className="text-sm font-medium block">
                Out Time *
                <input
                  type="text"
                  className="form-input mt-1"
                  placeholder="e.g. 02:30 PM"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium block">
                Return Time (Expected)
                <input
                  type="text"
                  className="form-input mt-1"
                  placeholder="e.g. 05:30 PM"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                />
              </label>
            </div>
            <div className="flex items-center pt-6">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4.5 w-4.5"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">Mark as URGENT (Calls HOD)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block">
              Reason for Go *
              <textarea
                className="form-input mt-1"
                rows={2}
                placeholder="Type detail reason for leaving the facility..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </label>
          </div>

          {/* Signature Upload */}
          <div>
            <label className="text-sm font-medium block mb-2">Security Signature (Optional)</label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              />
              {signature && (
                <div className="border border-slate-200 rounded-lg p-2 max-w-[200px] bg-slate-50 flex items-center justify-between gap-2">
                  <img src={signature} alt="Uploaded Signature Preview" className="max-h-[60px] object-contain" />
                  <button
                    type="button"
                    onClick={() => setSignature(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 rounded-lg transition"
                    title="Clear Signature"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700 transition"
              disabled={isSubmitting || !labour || !selectedHodId}
            >
              {isSubmitting ? "Submitting..." : "Send to HOD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
