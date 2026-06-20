import { useQuery } from "@tanstack/react-query";
import { FiList, FiClock, FiCheck, FiX } from "react-icons/fi";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/cards/StatCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getLabourDashboard } from "../../services/dashboardService";
import { getNotifications } from "../../services/notificationService";

export default function LabourDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["labour-dashboard"], queryFn: getLabourDashboard });
  const { data: notifs } = useQuery({ queryKey: ["labour-notifs"], queryFn: () => getNotifications(false) });

  if (isLoading) return <LoadingSpinner />;
  const s = data?.data || {};

  return (
    <div>
      <PageHeader title="Labour Dashboard" subtitle="Your outing request summary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Requests" value={s.myRequests} icon={FiList} />
        <StatCard label="Pending" value={s.pending} icon={FiClock} accent="bg-amber-50 text-amber-700" />
        <StatCard label="Approved" value={s.approved} icon={FiCheck} accent="bg-emerald-50 text-emerald-700" />
        <StatCard label="Rejected" value={s.rejected} icon={FiX} accent="bg-red-50 text-red-700" />
      </div>
      {(notifs?.data?.length > 0) && (
        <div className="card-panel mt-6">
          <h3 className="font-semibold">Recent notifications</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {notifs.data.slice(0, 3).map((n) => (
              <li key={n.notificationID}>{n.title}: {n.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
