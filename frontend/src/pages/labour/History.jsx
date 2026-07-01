import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/tables/DataTable";
import { getOutingRequests } from "../../services/requestService";
import { formatTime } from "../../utils/timeFormat";

export default function LabourHistory() {
  const { data } = useQuery({ queryKey: ["labour-requests"], queryFn: getOutingRequests });
  const sortedRequests = [...(data?.data || [])].sort((a, b) => b.requestID - a.requestID);

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
    { key: "outTime", label: "Out", render: (row) => formatTime(row.outTime) },
    { key: "returnTime", label: "Return", render: (row) => formatTime(row.returnTime) },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <div>
      <PageHeader title="History" subtitle="All previous outing requests" />
      <DataTable columns={columns} data={sortedRequests} pageSize={12} />
    </div>
  );
}
