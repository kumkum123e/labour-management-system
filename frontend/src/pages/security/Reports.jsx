import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Alert from "../../components/common/Alert";
import api from "../../services/api";
import { FiPrinter, FiSearch, FiFileText, FiClock, FiCheckCircle, FiXCircle, FiDownload } from "react-icons/fi";
import Modal from "../../components/modals/Modal";
import { exportToPdf, exportToExcel } from "../../utils/exportHelpers";

export default function SecurityReports() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPass, setSelectedPass] = useState(null);

  const exportColumns = [
    { key: "requestID", label: "Pass ID" },
    { key: "employeeCode", label: "Employee ID" },
    { key: "labourName", label: "Labour Name" },
    { key: "contractorName", label: "Contractor" },
    { key: "departmentName", label: "Department" },
    { key: "requestDateFormatted", label: "Outing Date" },
    { key: "outTime", label: "Out Time" },
    { key: "returnTime", label: "Return Time" },
    { key: "hodName", label: "Assigned HOD" },
    { key: "status", label: "Status" },
    { key: "reason", label: "Reason" },
  ];

  const handleExportPdf = () => {
    const exportRows = filteredList.map((r) => ({
      ...r,
      requestDateFormatted: new Date(r.requestDate).toLocaleDateString(),
    }));
    exportToPdf("Outing_Report", exportRows, exportColumns);
  };

  const handleExportExcel = () => {
    const exportRows = filteredList.map((r) => ({
      ...r,
      requestDateFormatted: new Date(r.requestDate).toLocaleDateString(),
    }));
    exportToExcel("Outing_Report", exportRows, exportColumns);
  };

  const { data: requestsRes, isLoading, isError, error } = useQuery({
    queryKey: ["security-outing-requests"],
    queryFn: () => api.get("/api/outing-requests").then((r) => r.data),
  });

  const list = requestsRes?.data || [];

  // Filter list based on search term (Employee Code or Name) and status
  const filteredList = list.filter((r) => {
    const codeMatch = String(r.employeeCode || "").toLowerCase().includes(search.toLowerCase());
    const nameMatch = String(r.labourName || "").toLowerCase().includes(search.toLowerCase());
    const searchMatch = codeMatch || nameMatch;
    const statusMatch = statusFilter === "all" || String(r.status).toLowerCase() === statusFilter.toLowerCase();
    return searchMatch && statusMatch;
  });

  // Calculate statistics
  const totalCount = filteredList.length;
  const pendingCount = filteredList.filter((r) => String(r.status).toLowerCase() === "pending").length;
  const approvedCount = filteredList.filter((r) => String(r.status).toLowerCase() === "approved").length;
  const rejectedCount = filteredList.filter((r) => String(r.status).toLowerCase() === "rejected").length;

  // Gate Pass Print Handler
  const handlePrintPass = (req) => {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    const html = `
      <html>
        <head>
          <title>Gate Outing Pass - ${req.employeeCode}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .pass-container { border: 3px double #cbd5e1; padding: 25px; border-radius: 15px; max-width: 500px; margin: 0 auto; background-color: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0 0; font-size: 14px; color: #64748b; }
            .status-stamp { display: inline-block; padding: 6px 16px; font-weight: bold; border-radius: 6px; font-size: 14px; text-transform: uppercase; margin-top: 12px; letter-spacing: 0.5px; }
            .status-Approved { background-color: #dcfce7; color: #15803d; border: 1.5px solid #15803d; }
            .status-Pending { background-color: #fef3c7; color: #b45309; border: 1.5px solid #b45309; }
            .status-Rejected { background-color: #fee2e2; color: #b91c1c; border: 1.5px solid #b91c1c; }
            .details-grid { display: grid; grid-template-columns: 140px 1fr; gap: 12px; font-size: 14px; margin-bottom: 25px; }
            .label { font-weight: 600; color: #64748b; }
            .value { color: #0f172a; }
            .signature-box { border-top: 2px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; }
            .signature-box img { max-height: 70px; max-width: 200px; object-contain; margin-top: 8px; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="pass-container">
            <div class="header">
              <h1>OUTING PASS</h1>
              <p>Labour Management System</p>
              <div class="status-stamp status-${req.status}">${req.status}</div>
            </div>
            <div class="details-grid">
              <div class="label">Pass ID:</div>
              <div class="value"><strong>#OP-${req.requestID}</strong></div>

              <div class="label">Employee ID:</div>
              <div class="value">${req.employeeCode}</div>

              <div class="label">Labour Name:</div>
              <div class="value"><strong>${req.labourName}</strong></div>

              <div class="label">Contractor:</div>
              <div class="value">${req.contractorName || "—"}</div>

              <div class="label">Department:</div>
              <div class="value">${req.departmentName}</div>

              <div class="label">Outing Date:</div>
              <div class="value">${new Date(req.requestDate).toLocaleDateString()}</div>

              <div class="label">Out Time:</div>
              <div class="value">${req.outTime}</div>

              <div class="label">Return Time:</div>
              <div class="value">${req.returnTime || "—"}</div>

              <div class="label">Reason:</div>
              <div class="value">${req.reason}</div>

              <div class="label">Assigned HOD:</div>
              <div class="value">${req.hodName}</div>
            </div>
            ${
              req.securitySignature
                ? `
              <div class="signature-box">
                <div class="label">Security Signature</div>
                <img src="${req.securitySignature}" alt="Security Signature" />
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Verified by: ${req.securityUsername || "Security Guard"}</div>
              </div>
              `
                : ""
            }
            <div class="footer">
              Generated on ${new Date().toLocaleString()}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Outing Reports"
        subtitle="View and print gate passes created by security team"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="btn-outline flex items-center gap-1.5 text-sm font-semibold py-2 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <FiDownload size={14} /> Export PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="btn-outline flex items-center gap-1.5 text-sm font-semibold py-2 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <FiDownload size={14} /> Export Excel
            </button>
          </div>
        }
      />

      {isError && (
        <Alert type="error" message={`Failed to load reports: ${error.response?.data?.message || error.message}`} />
      )}

      {/* Mini Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sent</p>
            <h4 className="text-xl font-bold text-slate-800 mt-1">{totalCount}</h4>
          </div>
          <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <FiFileText size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
            <h4 className="text-xl font-bold text-amber-600 mt-1">{pendingCount}</h4>
          </div>
          <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <FiClock size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved</p>
            <h4 className="text-xl font-bold text-emerald-600 mt-1">{approvedCount}</h4>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <FiCheckCircle size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected</p>
            <h4 className="text-xl font-bold text-red-600 mt-1">{rejectedCount}</h4>
          </div>
          <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <FiXCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-panel mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <FiSearch className="absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Employee ID or Labour Name..."
            className="form-input pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <select
            className="form-input text-sm w-full sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Reports Table/Cards */}
      {filteredList.length === 0 ? (
        <div className="card-panel text-center py-10 text-slate-400">No outing records found matching filters.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-left">
                  <th className="py-3 px-4 font-semibold">Pass ID</th>
                  <th className="py-3 px-4 font-semibold">Labour Info</th>
                  <th className="py-3 px-4 font-semibold">Outing Details</th>
                  <th className="py-3 px-4 font-semibold">Assigned HOD</th>
                  <th className="py-3 px-4 font-semibold">Signature</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((req) => (
                  <tr key={req.requestID} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-500">#OP-{req.requestID}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{req.labourName}</div>
                      <div className="text-xs text-slate-400">
                        Code: {req.employeeCode} · Cont: {req.contractorName || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        {new Date(req.requestDate).toLocaleDateString()} at <strong>{req.outTime}</strong>
                      </div>
                      <div className="text-xs text-slate-500 italic max-w-xs truncate" title={req.reason}>
                        "{req.reason}"
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <div>{req.hodName}</div>
                      <div className="text-xs text-slate-400">{req.departmentName}</div>
                    </td>
                    <td className="py-3 px-4">
                      {req.securitySignature ? (
                        <div className="border border-slate-200 rounded p-1 bg-white inline-block max-w-[100px]">
                          <img src={req.securitySignature} alt="Signature" className="max-h-[30px] object-contain mx-auto" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          req.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPass(req)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <FiFileText size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintPass(req)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          <FiPrinter size={12} /> Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Pass Modal */}
      <Modal
        open={!!selectedPass}
        onClose={() => setSelectedPass(null)}
        title="Gate Outing Pass Preview"
      >
        {selectedPass && (
          <div className="space-y-4">
            <div className="border border-slate-200 p-5 rounded-2xl bg-white shadow-inner relative overflow-hidden">
              <div className="text-center border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xl font-bold tracking-wider text-slate-800 uppercase">Outing Pass</h2>
                <p className="text-xs text-slate-400">Labour Management System</p>
                <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold mt-2 ${
                  selectedPass.status === "Approved"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : selectedPass.status === "Rejected"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}>
                  {selectedPass.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-400">Pass ID:</span>
                <span className="col-span-2 font-bold text-slate-800">#OP-{selectedPass.requestID}</span>

                <span className="font-semibold text-slate-400">Employee ID:</span>
                <span className="col-span-2">{selectedPass.employeeCode}</span>

                <span className="font-semibold text-slate-400">Labour Name:</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedPass.labourName}</span>

                <span className="font-semibold text-slate-400">Contractor:</span>
                <span className="col-span-2">{selectedPass.contractorName || "—"}</span>

                <span className="font-semibold text-slate-400">Department:</span>
                <span className="col-span-2">{selectedPass.departmentName}</span>

                <span className="font-semibold text-slate-400">Outing Date:</span>
                <span className="col-span-2">{new Date(selectedPass.requestDate).toLocaleDateString()}</span>

                <span className="font-semibold text-slate-400">Out Time:</span>
                <span className="col-span-2">{selectedPass.outTime}</span>

                <span className="font-semibold text-slate-400">Return Time:</span>
                <span className="col-span-2">{selectedPass.returnTime || "—"}</span>

                <span className="font-semibold text-slate-400">Reason:</span>
                <span className="col-span-2">{selectedPass.reason}</span>

                <span className="font-semibold text-slate-400">Assigned HOD:</span>
                <span className="col-span-2">{selectedPass.hodName}</span>
              </div>

              {selectedPass.securitySignature && (
                <div className="border-t border-slate-100 mt-4 pt-3 text-center">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Security Signature</span>
                  <div className="border border-slate-200 rounded p-1 bg-white inline-block max-w-[150px] mx-auto">
                    <img src={selectedPass.securitySignature} alt="Security Signature" className="max-h-[50px] object-contain" />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Verified by: {selectedPass.securityUsername || "Security"}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn-outline px-4 py-2 text-sm font-semibold rounded-lg hover:bg-slate-50 transition border border-slate-200"
                onClick={() => setSelectedPass(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 border border-amber-600 rounded-lg transition"
                onClick={() => {
                  handlePrintPass(selectedPass);
                  setSelectedPass(null);
                }}
              >
                <FiPrinter size={14} /> Print Pass
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
