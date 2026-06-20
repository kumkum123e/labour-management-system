import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DataTable from "../tables/DataTable";
import Modal from "../modals/Modal";
import { getLabours, deactivateLabour, assignHodToLabour } from "../../services/labourService";
import { getDepartmentHods } from "../../services/departmentService";

export default function LabourListSection() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [assignTarget, setAssignTarget] = useState(null);
  const [hodId, setHodId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["labours"], queryFn: getLabours });
  const { data: hodsData } = useQuery({
    queryKey: ["dept-hods", assignTarget?.departmentID],
    queryFn: () => getDepartmentHods(assignTarget.departmentID),
    enabled: !!assignTarget?.departmentID,
  });

  const labours = (data?.data || []).filter((l) => !statusFilter || l.status === statusFilter);

  const printLabour = (labour) => {
    const printWindow = window.open("", "_blank", "width=850,height=700");
    if (!printWindow) {
      alert("Please allow popups to print labour profiles.");
      return;
    }

    const backendUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const imageUrl = labour.photoUrl ? `${backendUrl}/${labour.photoUrl}` : "";

    const htmlContent = `
      <html>
        <head>
          <title>Labour Profile - ${labour.labourName}</title>
          <style>
            body {
              font-family: 'Segoe UI', system-ui, sans-serif;
              margin: 40px;
              color: #1e293b;
              line-height: 1.5;
            }
            .profile-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 24px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
              background: #fff;
              max-width: 750px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .header-title h1 {
              font-size: 24px;
              font-weight: 800;
              color: #1e3a8a;
              margin: 0;
            }
            .header-title p {
              font-size: 13px;
              color: #64748b;
              margin: 4px 0 0 0;
            }
            .badge {
              background-color: ${labour.status === "Active" ? "#d1fae5" : "#f1f5f9"};
              color: ${labour.status === "Active" ? "#065f46" : "#334155"};
              font-weight: 600;
              font-size: 12px;
              padding: 4px 10px;
              border-radius: 9999px;
              text-transform: uppercase;
            }
            .content {
              display: flex;
              gap: 32px;
            }
            .avatar-container {
              flex: 0 0 160px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .avatar-img {
              width: 160px;
              height: 160px;
              border-radius: 8px;
              object-fit: cover;
              border: 2px solid #e2e8f0;
              background-color: #f8fafc;
            }
            .avatar-placeholder {
              width: 160px;
              height: 160px;
              border-radius: 8px;
              border: 2px dashed #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              color: #94a3b8;
              background-color: #f8fafc;
              text-align: center;
              padding: 10px;
            }
            .info-grid {
              flex: 1;
              display: grid;
              grid-template-columns: 140px 1fr;
              row-gap: 12px;
              column-gap: 16px;
            }
            .info-label {
              font-weight: 600;
              color: #475569;
              font-size: 14px;
            }
            .info-value {
              color: #0f172a;
              font-size: 14px;
            }
            .info-value.name {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .footer {
              margin-top: 32px;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              font-size: 11px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .profile-card {
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="profile-card">
            <div class="header">
              <div class="header-title">
                <h1>Labour Profile Card</h1>
                <p>Labour Management System &bull; Official Record</p>
              </div>
              <div class="badge">${labour.status}</div>
            </div>
            
            <div class="content">
              <div class="avatar-container">
                ${
                  imageUrl
                    ? `<img src="${imageUrl}" class="avatar-img" onerror="this.style.display='none'; document.getElementById('ph').style.display='flex';" />`
                    : ""
                }
                <div id="ph" class="avatar-placeholder" style="${imageUrl ? "display:none;" : ""}">
                  No Photograph Uploaded
                </div>
              </div>
              
              <div class="info-grid">
                <div class="info-label">Employee ID</div>
                <div class="info-value">${labour.employeeCode || "-"}</div>
                
                <div class="info-label">Full Name</div>
                <div class="info-value name">${labour.labourName || "-"}</div>
                
                <div class="info-label">Department</div>
                <div class="info-value">${labour.departmentName || "-"}</div>
                
                <div class="info-label">Contractor</div>
                <div class="info-value">${labour.contractorName || "-"}</div>
                
                <div class="info-label">Assigned HOD</div>
                <div class="info-value">${labour.hodName || "Not Assigned"}</div>
                
                <div class="info-label">Labour Mobile</div>
                <div class="info-value">${labour.phone || "-"}</div>
                
                <div class="info-label">Joining Date</div>
                <div class="info-value">${labour.joiningDate ? new Date(labour.joiningDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "-"}</div>
                
                <div class="info-label">Home Address</div>
                <div class="info-value">${labour.address || "-"}</div>
              </div>
            </div>
            
            <div class="footer">
              <span>System ID: ${labour.labourID}</span>
              <span>Generated on: ${new Date().toLocaleString()}</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const columns = [
    { key: "employeeCode", label: "Employee ID" },
    { key: "labourName", label: "Name" },
    { key: "contractorName", label: "Contractor" },
    { key: "departmentName", label: "Department" },
    { key: "hodName", label: "Assigned HOD" },
    { key: "phone", label: "Mobile" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded px-2 py-0.5 text-xs ${row.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <Link to={`/admin/labour/edit/${row.labourID}`} className="btn-outline-sm">Edit</Link>
          <button
            type="button"
            className="btn-outline-sm text-blue-600 hover:text-blue-700 font-semibold"
            onClick={() => printLabour(row)}
          >
            Print
          </button>
          {row.status === "Active" && (
            <>
              <button type="button" className="btn-outline-sm" onClick={() => setAssignTarget(row)}>Assign HOD</button>
              <button
                type="button"
                className="btn-outline-sm text-red-600"
                onClick={async () => {
                  if (window.confirm(`Deactivate ${row.labourName}?`)) {
                    await deactivateLabour(row.labourID);
                    qc.invalidateQueries({ queryKey: ["labours"] });
                    qc.invalidateQueries({ queryKey: ["departments-admin"] });
                    qc.invalidateQueries({ queryKey: ["all-hods"] });
                  }
                }}
              >
                Deactivate
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const assignHod = async (e) => {
    e.preventDefault();
    await assignHodToLabour(assignTarget.labourID, parseInt(hodId, 10));
    setMessage("HOD assigned successfully");
    setAssignTarget(null);
    qc.invalidateQueries({ queryKey: ["labours"] });
  };

  return (
    <div className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-slate-900">All Labour Profiles</h2>
      {message && <p className="mb-3 text-sm text-emerald-700">{message}</p>}
      {isLoading ? (
        <p className="text-slate-500">Loading labour list...</p>
      ) : (
        <DataTable
          columns={columns}
          data={labours}
          filters={
            <select className="form-input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          }
        />
      )}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Assign HOD — ${assignTarget?.labourName}`}>
        <form onSubmit={assignHod}>
          <select className="form-input" value={hodId} onChange={(e) => setHodId(e.target.value)} required>
            <option value="">Select HOD</option>
            {(hodsData?.data || []).map((h) => (
              <option key={h.hodID} value={h.hodID}>{h.hodName}</option>
            ))}
          </select>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => setAssignTarget(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Assign</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
