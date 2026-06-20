import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/tables/DataTable";
import { getOutingRequests } from "../../services/requestService";

export default function HodHistory() {
  const { data } = useQuery({ queryKey: ["hod-requests"], queryFn: getOutingRequests });
  const rows = data?.data || [];

  const columns = [
    { key: "labourName", label: "Labour" },
    { key: "requestDate", label: "Date" },
    { key: "status", label: "Status" },
    { key: "reason", label: "Reason" },
    { key: "remarks", label: "Remarks" },
    {
      key: "approvedAt",
      label: "Processed",
      render: (r) => (r.approvedAt || r.rejectedAt ? new Date(r.approvedAt || r.rejectedAt).toLocaleString() : "—"),
    },
  ];

  return (
    <div>
      <PageHeader title="History" subtitle="Approval, rejection and labour request history" />
      <DataTable columns={columns} data={rows} pageSize={12} />
    </div>
  );
}
