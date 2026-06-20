import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/tables/DataTable";
import { getOutingRequests } from "../../services/requestService";

export default function RejectedRequests() {
  const { data } = useQuery({ queryKey: ["hod-requests"], queryFn: getOutingRequests });
  const rows = (data?.data || []).filter((r) => r.status === "Rejected");

  const columns = [
    { key: "labourName", label: "Labour" },
    { key: "employeeCode", label: "Employee ID" },
    { key: "requestDate", label: "Date" },
    { key: "reason", label: "Reason" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <div>
      <PageHeader title="Rejected Requests" />
      <DataTable columns={columns} data={rows} pageSize={10} />
    </div>
  );
}
