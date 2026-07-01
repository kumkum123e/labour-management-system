import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/tables/DataTable";
import Alert from "../../components/common/Alert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getLabours, deactivateLabour } from "../../services/labourService";

export default function LabourManagement() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["labours"], queryFn: getLabours });

  const labours = (data?.data || []).filter((l) => !statusFilter || l.status === statusFilter);

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
          {row.status === "Active" && (
            <button
              type="button"
              className="btn-outline-sm text-red-600"
              onClick={async () => {
                if (window.confirm(`Deactivate ${row.labourName}?`)) {
                  await deactivateLabour(row.labourID);
                  qc.invalidateQueries({ queryKey: ["labours"] });
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Employee Management"
        subtitle="Search, filter, edit and manage employee profiles"
        actions={<Link to="/admin/labour/add" className="btn-primary">Add Employee</Link>}
      />
      <Alert type="success" message={message} onClose={() => setMessage("")} />
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
    </div>
  );
}
