import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/tables/DataTable";
import { getOutingRequests } from "../../services/requestService";

export default function RequestStatus() {
  const { data } = useQuery({ queryKey: ["labour-requests"], queryFn: getOutingRequests });
  const allRequests = [...(data?.data || [])].sort((a, b) => b.requestID - a.requestID);

  const columns = [
    {
      key: "requestID",
      label: "Request ID",
      render: (row) => `REQ-${String(row.requestID).padStart(5, "0")}`
    },
    {
      key: "requestDate",
      label: "Date",
      render: (row) => row.requestDate ? new Date(row.requestDate).toLocaleDateString() : "—"
    },
    { key: "outTime", label: "Out" },
    { key: "returnTime", label: "Return" },
    { key: "reason", label: "Reason" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = String(row.status || "Pending").trim();
        let classes = "rounded px-2.5 py-0.5 text-xs font-semibold inline-block";
        if (status === "Approved") classes += " bg-emerald-100 text-emerald-800";
        else if (status === "Rejected") classes += " bg-red-100 text-red-800";
        else classes += " bg-amber-100 text-amber-800";
        return <span className={classes}>{status}</span>;
      }
    },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <div>
      <PageHeader title="Request Status" subtitle="All submitted outing requests and their current approval status" />
      <DataTable columns={columns} data={allRequests} pageSize={10} />
    </div>
  );
}
