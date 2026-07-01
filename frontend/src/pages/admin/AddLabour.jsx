import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import LabourListSection from "../../components/forms/LabourListSection";
import { FiEye, FiEyeOff, FiUpload, FiAlertCircle, FiFolder } from "react-icons/fi";
import { getDepartments } from "../../services/departmentService";
import { createLabour, uploadDocument, bulkCreateLabours, bulkUploadPhotos } from "../../services/labourService";
import * as XLSX from "xlsx";

export default function AddLabour() {
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const [photo, setPhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Bulk Upload States
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [bulkMessage, setBulkMessage] = useState({ type: "", text: "" });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);

  // Bulk ZIP States
  const [zipFile, setZipFile] = useState(null);
  const [zipMessage, setZipMessage] = useState({ type: "", text: "" });
  const [zipLoading, setZipLoading] = useState(false);
  const [zipErrors, setZipErrors] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkMessage({ type: "", text: "" });
    setBulkData([]);
    setBulkErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          setBulkMessage({ type: "error", text: "Uploaded file is empty" });
          return;
        }

        // Map columns
        const mapped = rawJson.map((row) => {
          const findVal = (keys) => {
            const match = Object.keys(row).find(k => keys.includes(k.trim().toLowerCase().replace(/\s+/g, "")));
            return match ? String(row[match]).trim() : undefined;
          };

          return {
            employeeCode: findVal(["employeeid", "employeecode", "empid", "code", "id"]),
            labourName: findVal(["labourname", "name", "displayname", "fullname"]),
            departmentName: findVal(["department", "departmentname", "dept"]),
            contractorName: findVal(["contractor", "contractorname", "cont"]),
            phone: findVal(["phone", "mobile", "labourmobile", "phone_number", "mobilenumber"]),
            address: findVal(["address", "addr", "residence"]),
            joiningDate: findVal(["joiningdate", "date", "joindate", "joined"]),
            hodName: findVal(["hod", "hodname", "assignedhod", "hod_name"]),
            hodMobile: findVal(["hodmobile", "hodphone", "hod_mobile"]),
            photoUrl: findVal(["photo", "photourl", "image", "imageurl", "photo_url", "picture"]),
            password: findVal(["password", "pass"]) || "123456",
          };
        });

        // Basic validation
        const valid = mapped.filter(item => item.employeeCode && item.labourName && item.departmentName);
        if (valid.length === 0) {
          setBulkMessage({
            type: "error",
            text: "No valid rows found. Each row must have 'Employee ID', 'Employee Name', and 'Department'.",
          });
          return;
        }

        setBulkData(valid);
        setBulkMessage({
          type: "success",
          text: `Parsed ${valid.length} valid employee profiles. Click below to import.`,
        });
      } catch (err) {
        setBulkMessage({ type: "error", text: `Failed to parse file: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleZipChange = (e) => {
    setZipFile(e.target.files?.[0] || null);
    setZipMessage({ type: "", text: "" });
    setZipErrors([]);
  };

  const handleZipSubmit = async () => {
    if (!zipFile) return;
    setZipLoading(true);
    setZipMessage({ type: "", text: "" });
    setZipErrors([]);

    try {
      const res = await bulkUploadPhotos(zipFile);
      const { successCount, errorCount, errors } = res.data;

      if (errorCount === 0) {
        setZipMessage({
          type: "success",
          text: `Successfully imported and linked ${successCount} employee photos!`,
        });
        setZipFile(null);
        const fileInput = document.getElementById("zipFile");
        if (fileInput) fileInput.value = "";
      } else if (successCount > 0) {
        setZipMessage({
          type: "warning",
          text: `Imported ${successCount} photos successfully, but ${errorCount} failed.`,
        });
        setZipErrors(errors);
      } else {
        setZipMessage({
          type: "error",
          text: `Failed to import photos. Check file names.`,
        });
        setZipErrors(errors);
      }

      // Refresh employee list
      qc.invalidateQueries(["labours"]);
    } catch (err) {
      setZipMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to upload ZIP file",
      });
    } finally {
      setZipLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkData.length === 0) return;
    setBulkLoading(true);
    setBulkMessage({ type: "", text: "" });
    setBulkErrors([]);
    try {
      const res = await bulkCreateLabours({ labours: bulkData });
      const { successCount, errorCount, errors } = res.data;

      let msgText = `Successfully created ${successCount} employee profiles.`;
      if (errorCount > 0) {
        msgText += ` Failed to create ${errorCount} profiles.`;
      }

      setBulkMessage({
        type: errorCount > 0 ? "warning" : "success",
        text: msgText,
      });

      setBulkErrors(errors || []);
      setBulkFile(null);
      setBulkData([]);
      const fileInput = document.getElementById("bulkFile");
      if (fileInput) fileInput.value = "";

      qc.invalidateQueries({ queryKey: ["labours"] });
      qc.invalidateQueries({ queryKey: ["departments-admin"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["all-hods"] });
    } catch (err) {
      setBulkMessage({ type: "error", text: err.response?.data?.message || "Failed to upload bulk profiles" });
    } finally {
      setBulkLoading(false);
    }
  };

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
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to create employee" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Employee Profiles"
        subtitle="Manually create a profile or upload a spreadsheet file to bulk import employees."
      />
      <Alert type={message.type} message={message.text} />
      {isError && (
        <Alert type="error" message={`Failed to load departments: ${error.response?.data?.message || error.message}`} />
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Column: Manual Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card-panel space-y-4">
            <h3 className="font-semibold text-slate-800 text-base mb-2">Create Employee Profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Employee ID *
                <input className="form-input" placeholder="EMP001" {...register("employeeCode", { required: true })} />
              </label>
              <label className="text-sm font-medium">
                Employee Name *
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
                Employee Mobile
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
            <button type="submit" className="btn-primary w-full" disabled={!departmentId}>
              Create Employee Profile
            </button>
          </form>
        </div>

        {/* Right Column: Bulk Upload Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card-panel space-y-4">
            <h3 className="font-semibold text-slate-800 text-base mb-1 flex items-center gap-1.5">
              <FiUpload size={18} /> Bulk Import Profiles
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Upload an Excel (`.xlsx`, `.xls`) or CSV spreadsheet. Columns will map automatically based on their names.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600 space-y-1.5 border border-slate-200/50">
              <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">Spreadsheet Guidelines:</p>
              <p>• <strong>Required Columns:</strong> Employee ID, Employee Name, Department</p>
              <p>• <strong>Optional Columns:</strong> Contractor, Mobile, HOD Name, HOD Mobile, Photo, Password, Address, Joining Date</p>
            </div>

            <Alert type={bulkMessage.type} message={bulkMessage.text} onClose={() => setBulkMessage({ type: "", text: "" })} />

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Select Spreadsheet File</label>
              <input
                id="bulkFile"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              />
            </div>

            {bulkFile && (
              <div className="bg-slate-50 p-2.5 rounded-lg text-xs flex justify-between items-center border border-slate-200">
                <div className="truncate pr-2">
                  <span className="font-semibold text-slate-700 block truncate">{bulkFile.name}</span>
                  <span className="text-[10px] text-slate-400">{(bulkFile.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBulkFile(null);
                    setBulkData([]);
                    setBulkMessage({ type: "", text: "" });
                    setBulkErrors([]);
                    const fileInput = document.getElementById("bulkFile");
                    if (fileInput) fileInput.value = "";
                  }}
                  className="text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                >
                  Clear
                </button>
              </div>
            )}

            {bulkData.length > 0 && (
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkLoading}
                className="btn-primary w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 text-white font-semibold transition py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {bulkLoading ? "Uploading..." : `Upload & Create ${bulkData.length} Labours`}
              </button>
            )}

            {bulkErrors.length > 0 && (
              <div className="border border-red-150 rounded-xl p-3 bg-red-50/50 max-h-60 overflow-y-auto space-y-2 mt-2">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                  <FiAlertCircle size={14} /> Import Failures ({bulkErrors.length})
                </p>
                <div className="divide-y divide-red-100">
                  {bulkErrors.map((err, idx) => (
                    <div key={idx} className="py-1.5 text-xs">
                      <div className="font-semibold text-slate-800">
                        {err.labourName} ({err.employeeCode})
                      </div>
                      <div className="text-red-650">{err.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ZIP Photo Import Panel */}
          <div className="card-panel space-y-4">
            <h3 className="font-semibold text-slate-800 text-base mb-1 flex items-center gap-1.5">
              <FiFolder size={18} /> Bulk Import Photos (ZIP)
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Upload a `.zip` file containing photo images. Each photo file inside the zip should be named exactly like the Employee ID (e.g. `EMP001.jpg`, `EMP002.png`).
            </p>

            <Alert type={zipMessage.type} message={zipMessage.text} onClose={() => setZipMessage({ type: "", text: "" })} />

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Select ZIP File</label>
              <input
                id="zipFile"
                type="file"
                accept=".zip"
                onChange={handleZipChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              />
            </div>

            {zipFile && (
              <button
                type="button"
                onClick={handleZipSubmit}
                disabled={zipLoading}
                className="btn-primary w-full flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700 text-white font-semibold transition py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {zipLoading ? "Uploading & Extracting..." : "Upload ZIP & Match Photos"}
              </button>
            )}

            {zipErrors.length > 0 && (
              <div className="border border-red-150 rounded-xl p-3 bg-red-50/50 max-h-60 overflow-y-auto space-y-2 mt-2">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                  <FiAlertCircle size={14} /> Photo Import Failures ({zipErrors.length})
                </p>
                <div className="divide-y divide-red-100">
                  {zipErrors.map((err, idx) => (
                    <div key={idx} className="py-1.5 text-xs text-red-650">
                      <strong>{err.fileName}</strong>: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LabourListSection />
    </div>
  );
}
