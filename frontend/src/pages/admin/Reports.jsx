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
import { exportToPdf, exportToExcel, printTable } from "../../utils/exportHelpers";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "outings", label: "Outing Report" },
  { id: "labour", label: "Labour Report" },
  { id: "department", label: "Department Report" },
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
                      <td>{r.outTime || "—"}</td>
                      <td>{r.returnTime || "—"}</td>
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
    </div>
  );
}
