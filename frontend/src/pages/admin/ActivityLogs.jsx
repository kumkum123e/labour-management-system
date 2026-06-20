import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/tables/DataTable";
import { getActivityLogs } from "../../services/reportService";

export default function ActivityLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs-full"],
    queryFn: () => getActivityLogs(100),
  });

  const columns = [
    { key: "logID", label: "Log ID" },
    { key: "username", label: "User" },
    { key: "action", label: "Action" },
    { key: "entity", label: "Entity" },
    { key: "entityID", label: "Entity ID" },
    { key: "ipAddress", label: "IP" },
    {
      key: "createdAt",
      label: "Time",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader title="Activity Logs" subtitle="Audit trail of all system actions" />
      {isLoading ? (
        <p className="text-slate-500">Loading logs...</p>
      ) : (
        <DataTable columns={columns} data={data?.data || []} searchable pageSize={12} />
      )}
    </div>
  );
}
