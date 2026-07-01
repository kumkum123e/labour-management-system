import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import {
  getMonthlyReport,
  getDailyReport,
  getWeeklyReport,
  getLabourReport,
  getOutingReport,
  getDepartmentReport,
} from "../../services/reportService";
import { getDepartments } from "../../services/departmentService";
import { exportToPdf, exportToExcel, printTable, exportSinglePassToPdf } from "../../utils/exportHelpers";
import api from "../../services/api";
import Modal from "../../components/modals/Modal";
import { FiPrinter, FiSearch, FiFileText, FiClock, FiCheckCircle, FiXCircle, FiDownload } from "react-icons/fi";
import { formatTime } from "../../utils/timeFormat";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "outings", label: "Outing Report" },
  { id: "labour", label: "Labour Report" },
  { id: "department", label: "Department Report" },
  { id: "security", label: "Security Report" },
];

const securityExportColumns = [
  { key: "requestID", label: "Pass ID" },
  { key: "employeeCode", label: "Employee ID" },
  { key: "labourName", label: "Employee Name" },
  { key: "departmentName", label: "Department" },
  { key: "requestDateFormatted", label: "Outing Date" },
  { key: "outTime", label: "Out Time" },
  { key: "returnTime", label: "Return Time" },
  { key: "hodName", label: "Assigned HOD" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
];

const photoSrc = (url) => (url ? `${API}/${url.replace(/^\//, "")}` : null);

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

export default function Reports() {
  const now = new Date();
  const [tab, setTab] = useState("overview");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dailyDate, setDailyDate] = useState(now.toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState("");
  const [deptReportId, setDeptReportId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Security Report states
  const [securitySearch, setSecuritySearch] = useState("");
  const [securityStatusFilter, setSecurityStatusFilter] = useState("all");
  const [selectedPass, setSelectedPass] = useState(null);

  const { data: monthly } = useQuery({
    queryKey: ["monthly-report", year, month],
    queryFn: () => getMonthlyReport(year, month),
    enabled: tab === "overview",
  });
  const { data: daily } = useQuery({
    queryKey: ["daily-report", dailyDate],
    queryFn: () => getDailyReport(dailyDate),
    enabled: tab === "overview",
  });
  const { data: weekly } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: getWeeklyReport,
    enabled: tab === "overview",
  });
  const { data: labourReport } = useQuery({
    queryKey: ["labour-report"],
    queryFn: () => getLabourReport(),
    enabled: tab === "labour",
  });
  const { data: deptReport } = useQuery({
    queryKey: ["dept-report", deptReportId],
    queryFn: () => getDepartmentReport(deptReportId),
    enabled: tab === "department" && !!deptReportId,
  });
  const { data: outingReport } = useQuery({
    queryKey: ["outing-report", year, month, departmentId, statusFilter],
    queryFn: () =>
      getOutingReport({
        year,
        month: tab === "outings" ? month : undefined,
        departmentId: departmentId || undefined,
        status: statusFilter || undefined,
      }),
    enabled: tab === "outings",
  });
  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    enabled: tab === "outings" || tab === "department",
  });

  const { data: securityRequestsRes } = useQuery({
    queryKey: ["security-outing-requests"],
    queryFn: () => api.get("/api/outing-requests").then((r) => r.data),
    enabled: tab === "security",
  });

  const securityList = securityRequestsRes?.data || [];

  const filteredSecurityList = securityList.filter((r) => {
    const codeMatch = String(r.employeeCode || "").toLowerCase().includes(securitySearch.toLowerCase());
    const nameMatch = String(r.labourName || "").toLowerCase().includes(securitySearch.toLowerCase());
    const searchMatch = codeMatch || nameMatch;
    const statusMatch = securityStatusFilter === "all" || String(r.status).toLowerCase() === securityStatusFilter.toLowerCase();
    return searchMatch && statusMatch;
  });

  const securityTotalCount = filteredSecurityList.length;
  const securityPendingCount = filteredSecurityList.filter((r) => String(r.status).toLowerCase() === "pending").length;
  const securityApprovedCount = filteredSecurityList.filter((r) => String(r.status).toLowerCase() === "approved").length;
  const securityRejectedCount = filteredSecurityList.filter((r) => String(r.status).toLowerCase() === "rejected").length;

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
              <p>Frigerio Conserva Allana Pvt Ltd</p>
              <div class="status-stamp status-${req.status}">${req.status}</div>
            </div>
            <div style="display: flex; gap: 20px; align-items: flex-start; justify-content: space-between;">
              <div class="details-grid" style="flex: 1; margin-bottom: 0;">
                <div class="label">Pass ID:</div>
                <div class="value"><strong>#OP-${req.requestID}</strong></div>

                <div class="label">Employee ID:</div>
                <div class="value">${req.employeeCode}</div>

                <div class="label">Employee Name:</div>
                <div class="value"><strong>${req.labourName}</strong></div>

                <div class="label">Department:</div>
                <div class="value">${req.departmentName}</div>

                <div class="label">Outing Date:</div>
                <div class="value">${new Date(req.requestDate).toLocaleDateString()}</div>

                <div class="label">Out Time:</div>
                <div class="value">${formatTime(req.outTime)}</div>

                <div class="label">Return Time:</div>
                <div class="value">${formatTime(req.returnTime) || "—"}</div>

                <div class="label">Reason:</div>
                <div class="value">${req.reason}</div>

                <div class="label">Assigned HOD:</div>
                <div class="value">${req.hodName}</div>
              </div>
              <div style="flex-shrink: 0; text-align: center;">
                ${
                  req.photoUrl
                    ? `<img src="http://localhost:5000/${req.photoUrl}" style="width: 100px; height: 110px; object-fit: cover; border: 1.5px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />`
                    : `<div style="width: 100px; height: 110px; border: 1.5px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; background-color: #f8fafc; font-weight: 500; box-sizing: border-box; padding: 10px;">No Photo</div>`
                }
              </div>
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

  const outing = monthly?.data?.outings || {};
  const overviewRows = [
    { metric: "Total Outings", value: outing.totalOutings || 0 },
    { metric: "Approved", value: outing.approved || 0 },
    { metric: "Rejected", value: outing.rejected || 0 },
    { metric: "Pending", value: outing.pending || 0 },
    { metric: "New Labour", value: monthly?.data?.newLabour || 0 },
  ];

  const labourList = labourReport?.data || [];
  const outingList = outingReport?.data || [];
  const weeklyDays = weekly?.data?.last7Days || [];
  const dailyOutings = daily?.data?.outings || [];

  const labourExportColumns = [
    { key: "labourName", label: "Name" },
    { key: "employeeCode", label: "Employee ID" },
    { key: "departmentName", label: "Department" },
    { key: "hodName", label: "HOD" },
    { key: "phone", label: "Mobile" },
    { key: "status", label: "Status" },
  ];

  const outingExportColumns = [
    { key: "labourName", label: "Labour" },
    { key: "employeeCode", label: "Employee ID" },
    { key: "departmentName", label: "Department" },
    { key: "requestDate", label: "Date" },
    { key: "status", label: "Status" },
    { key: "reason", label: "Reason" },
  ];

  const deptExportRows = deptReport?.data
    ? [
        { metric: "Department", value: deptReport.data.departmentName },
        { metric: "Total Labour", value: deptReport.data.totalLabour },
        { metric: "Total HODs", value: deptReport.data.totalHODs },
        ...Object.entries(deptReport.data.outingSummary || {}).map(([k, v]) => ({
          metric: `Outings — ${k}`,
          value: v,
        })),
      ]
    : [];

  const handleExport = () => {
    if (tab === "labour") {
      exportToPdf("Labour Report", labourList, labourExportColumns);
    } else if (tab === "outings") {
      exportToPdf("Outing Report", outingList, outingExportColumns);
    } else if (tab === "department") {
      exportToPdf("Department Report", deptExportRows, [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ]);
    } else if (tab === "security") {
      const exportRows = filteredSecurityList.map((r) => ({
        ...r,
        requestDateFormatted: new Date(r.requestDate).toLocaleDateString(),
        outTime: formatTime(r.outTime),
        returnTime: formatTime(r.returnTime),
      }));
      exportToPdf("Security Outing Report", exportRows, securityExportColumns);
    } else {
      exportToPdf("Monthly Report", overviewRows, [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Count" },
      ]);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Monthly, daily, weekly, outing, labour and department reports"
        actions={
          <>
            <button type="button" className="btn-outline" onClick={handleExport}>
              Export PDF
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                if (tab === "labour") exportToExcel("Labour Report", labourList, labourExportColumns);
                else if (tab === "outings") exportToExcel("Outing Report", outingList, outingExportColumns);
                else if (tab === "department") {
                  exportToExcel("Department Report", deptExportRows, [
                    { key: "metric", label: "Metric" },
                    { key: "value", label: "Value" },
                  ]);
                } else if (tab === "security") {
                  const exportRows = filteredSecurityList.map((r) => ({
                    ...r,
                    requestDateFormatted: new Date(r.requestDate).toLocaleDateString(),
                    outTime: formatTime(r.outTime),
                    returnTime: formatTime(r.returnTime),
                  }));
                  exportToExcel("Security Outing Report", exportRows, securityExportColumns);
                } else exportToExcel("Monthly Report", overviewRows, [
                  { key: "metric", label: "Metric" },
                  { key: "value", label: "Count" },
                ]);
              }}
            >
              Export Excel
            </button>
            <button type="button" className="btn-outline" onClick={() => printTable("Reports")}>
              Print
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "btn-primary" : "btn-outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "overview" || tab === "outings" || tab === "department") && (
        <div className="card-panel mb-4 flex flex-wrap gap-4">
        {(tab === "overview" || tab === "outings") && (
          <>
            <label className="text-sm">
              Year
              <input
                type="number"
                className="form-input ml-2 w-28"
                value={year}
                onChange={(e) => setYear(+e.target.value)}
              />
            </label>
            <label className="text-sm">
              Month
              <input
                type="number"
                min={1}
                max={12}
                className="form-input ml-2 w-28"
                value={month}
                onChange={(e) => setMonth(+e.target.value)}
              />
            </label>
          </>
        )}
        {tab === "overview" && (
          <label className="text-sm">
            Daily date
            <input
              type="date"
              className="form-input ml-2"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
            />
          </label>
        )}
        {(tab === "outings") && (
          <label className="text-sm">
            Department
            <select
              className="form-input ml-2 w-48"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All departments</option>
              {(depts || []).map((d) => (
                <option key={d.departmentID} value={d.departmentID}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "department" && (
          <label className="text-sm">
            Department
            <select
              className="form-input ml-2 w-48"
              value={deptReportId}
              onChange={(e) => setDeptReportId(e.target.value)}
            >
              <option value="">Select department</option>
              {(depts || []).map((d) => (
                <option key={d.departmentID} value={d.departmentID}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "outings" && (
          <label className="text-sm">
            Status
            <select
              className="form-input ml-2 w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
        )}
        </div>
      )}

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-panel">
            <h3 className="font-semibold">
              Monthly Report — {year}/{month}
            </h3>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {overviewRows.map((r) => (
                  <tr key={r.metric} className="border-b">
                    <td className="py-2">{r.metric}</td>
                    <td className="py-2 font-medium">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold">Daily Report — {dailyDate}</h3>
            {dailyOutings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No outings on this date.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {dailyOutings.map((r) => (
                    <tr key={r.status} className="border-b">
                      <td className="py-2">{r.status}</td>
                      <td className="py-2 font-medium">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card-panel lg:col-span-2">
            <h3 className="font-semibold">Weekly Report (last 7 days)</h3>
            {weeklyDays.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No outings in the last 7 days.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {weeklyDays.map((r) => (
                    <tr key={r.day} className="border-b">
                      <td className="py-2">{formatDate(r.day)}</td>
                      <td className="py-2 font-medium">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "outings" && (
        <div className="card-panel">
          <h3 className="mb-3 font-semibold">Outing Report</h3>
          {outingList.length === 0 ? (
            <p className="text-sm text-slate-500">No outing records for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2">Labour</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>HOD</th>
                    <th>Date</th>
                    <th>Out</th>
                    <th>Return</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {outingList.map((r) => (
                    <tr key={r.requestID} className="border-t">
                      <td className="py-2">{r.labourName}</td>
                      <td>{r.employeeCode}</td>
                      <td>{r.departmentName}</td>
                      <td>{r.hodName}</td>
                      <td>{formatDate(r.requestDate)}</td>
                      <td>{formatTime(r.outTime) || "—"}</td>
                      <td>{formatTime(r.returnTime) || "—"}</td>
                      <td>{r.status}</td>
                      <td>{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "labour" && (
        <div>
          <p className="mb-4 text-sm text-slate-600">
            {labourList.length} labour record{labourList.length === 1 ? "" : "s"}
          </p>
          {labourList.length === 0 ? (
            <div className="card-panel">
              <p className="text-sm text-slate-500">No labour records found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {labourList.map((l) => {
                const src = photoSrc(l.photoUrl);
                return (
                  <div key={l.labourID} className="card-panel flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {src ? (
                        <img
                          src={src}
                          alt={l.labourName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <h4 className="font-semibold">{l.labourName}</h4>
                      <p className="text-slate-500">{l.employeeCode}</p>
                      <dl className="mt-2 space-y-1">
                        <div>
                          <dt className="inline text-slate-500">Department: </dt>
                          <dd className="inline">{l.departmentName || "—"}</dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">HOD: </dt>
                          <dd className="inline">{l.hodName || "—"}</dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Mobile: </dt>
                          <dd className="inline">{l.phone || "—"}</dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Contractor: </dt>
                          <dd className="inline">{l.contractorName || "—"}</dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Joined: </dt>
                          <dd className="inline">{formatDate(l.joiningDate)}</dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Status: </dt>
                          <dd className="inline font-medium">{l.status}</dd>
                        </div>
                        {l.address && (
                          <div>
                            <dt className="inline text-slate-500">Address: </dt>
                            <dd className="inline">{l.address}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "department" && (
        <div className="card-panel">
          <h3 className="font-semibold">
            Department Report — {deptReport?.data?.departmentName || "Select a department"}
          </h3>
          {!deptReportId ? (
            <p className="mt-2 text-sm text-slate-500">Choose a department from the filter above.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Labour: {deptReport?.data?.totalLabour ?? "—"} · HODs: {deptReport?.data?.totalHODs ?? "—"}
              </p>
              <h4 className="mt-4 font-medium">Outing summary</h4>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {Object.entries(deptReport?.data?.outingSummary || {}).map(([k, v]) => (
                    <tr key={k} className="border-b">
                      <td className="py-2">{k}</td>
                      <td className="py-2 font-medium">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-6">
          {/* Mini Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sent</p>
                <h4 className="text-xl font-bold text-slate-800 mt-1">{securityTotalCount}</h4>
              </div>
              <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                <FiFileText size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
                <h4 className="text-xl font-bold text-amber-600 mt-1">{securityPendingCount}</h4>
              </div>
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <FiClock size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved</p>
                <h4 className="text-xl font-bold text-emerald-600 mt-1">{securityApprovedCount}</h4>
              </div>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <FiCheckCircle size={20} />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected</p>
                <h4 className="text-xl font-bold text-red-600 mt-1">{securityRejectedCount}</h4>
              </div>
              <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <FiXCircle size={20} />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="card-panel flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <FiSearch className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Employee ID or Employee Name..."
                className="form-input pl-9 text-sm"
                value={securitySearch}
                onChange={(e) => setSecuritySearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <select
                className="form-input text-sm w-full sm:w-40"
                value={securityStatusFilter}
                onChange={(e) => setSecurityStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Reports Table/Cards */}
          {filteredSecurityList.length === 0 ? (
            <div className="card-panel text-center py-10 text-slate-400">No outing records found matching filters.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-left">
                      <th className="py-3 px-4 font-semibold">Pass ID</th>
                      <th className="py-3 px-4 font-semibold">Employee Info</th>
                      <th className="py-3 px-4 font-semibold">Outing Details</th>
                      <th className="py-3 px-4 font-semibold">Assigned HOD</th>
                      <th className="py-3 px-4 font-semibold">Signature</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSecurityList.map((req) => (
                      <tr key={req.requestID} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 font-bold text-slate-500">#OP-{req.requestID}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{req.labourName}</div>
                          <div className="text-xs text-slate-400">
                            Code: {req.employeeCode}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            {new Date(req.requestDate).toLocaleDateString()} at <strong>{formatTime(req.outTime)}</strong>
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
                                : req.status === "Returned"
                                ? "bg-blue-100 text-blue-800"
                                : req.status === "Not Returned"
                                ? "bg-slate-200 text-slate-800 border border-slate-300"
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
                            <button
                              type="button"
                              onClick={() => exportSinglePassToPdf(req)}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              <FiDownload size={12} /> PDF
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
                <p className="text-xs text-slate-400">Frigerio Conserva Allana Pvt Ltd</p>
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

                <span className="font-semibold text-slate-400">Employee Name:</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedPass.labourName}</span>

                <span className="font-semibold text-slate-400">Department:</span>
                <span className="col-span-2">{selectedPass.departmentName}</span>

                <span className="font-semibold text-slate-400">Outing Date:</span>
                <span className="col-span-2">{new Date(selectedPass.requestDate).toLocaleDateString()}</span>

                <span className="font-semibold text-slate-400">Out Time:</span>
                <span className="col-span-2">{formatTime(selectedPass.outTime)}</span>

                <span className="font-semibold text-slate-400">Return Time:</span>
                <span className="col-span-2">{formatTime(selectedPass.returnTime) || "—"}</span>

                <span className="font-semibold text-slate-400">Reason:</span>
                <span className="col-span-2">{selectedPass.reason}</span>

                <span className="font-semibold text-slate-400">Assigned HOD:</span>
                <span className="col-span-2">{selectedPass.hodName}</span>

                {selectedPass.actualReturnTime && (
                  <>
                    <span className="font-semibold text-slate-400">Actual Return:</span>
                    <span className="col-span-2 font-semibold text-blue-600">{formatTime(selectedPass.actualReturnTime)}</span>
                  </>
                )}

                {selectedPass.securityRemarks && (
                  <>
                    <span className="font-semibold text-slate-400">Security Remarks:</span>
                    <span className="col-span-2 text-slate-700 italic">"{selectedPass.securityRemarks}"</span>
                  </>
                )}
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
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 border border-amber-600 rounded-lg transition"
                onClick={() => {
                  exportSinglePassToPdf(selectedPass);
                  setSelectedPass(null);
                }}
              >
                <FiDownload size={14} /> Download PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
