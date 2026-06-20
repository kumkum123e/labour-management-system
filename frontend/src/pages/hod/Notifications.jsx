import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import { getNotifications, markNotificationRead } from "../../services/notificationService";

export default function HodNotifications() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["hod-notifs-all"], queryFn: () => getNotifications(false) });

  const markRead = async (id) => {
    await markNotificationRead(id);
    qc.invalidateQueries({ queryKey: ["hod-notifs-all"] });
  };

  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="space-y-3">
        {(data?.data || []).map((n) => (
          <div key={n.notificationID} className={`card-panel ${!n.isRead ? "border-l-4 border-l-primary" : ""}`}>
            <div className="flex justify-between">
              <strong>{n.title}</strong>
              {!n.isRead && (
                <button type="button" className="text-xs text-primary" onClick={() => markRead(n.notificationID)}>Mark read</button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{n.message}</p>
            <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {!(data?.data?.length) && <p className="text-slate-500">No notifications</p>}
      </div>
    </div>
  );
}
