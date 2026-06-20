import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import Alert from "../../components/common/Alert";
import { listBackups, createBackup, restoreBackup, removeBackup } from "../../services/backupService";

export default function Backup() {
  const qc = useQueryClient();
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useQuery({ queryKey: ["backups"], queryFn: listBackups });
  const backups = data?.data || [];

  const backupNow = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await createBackup();
      setMessage({ type: "success", text: res.message || "Backup created successfully" });
      refetch();
      qc.invalidateQueries({ queryKey: ["backups"] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.message || "Backup failed. Is the server running?",
      });
    } finally {
      setLoading(false);
    }
  };

  const restore = async (fileName) => {
    if (!window.confirm(`Restore database from ${fileName}? All current data will be replaced.`)) return;
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await restoreBackup(fileName);
      setMessage({ type: "success", text: res.message || "Database restored" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Restore failed" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (fileName) => {
    if (!window.confirm(`Remove "${fileName}" from backup history?`)) return;
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await removeBackup(fileName);
      setMessage({ type: "success", text: res.message || "Backup removed" });
      refetch();
      qc.invalidateQueries({ queryKey: ["backups"] });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Remove failed" });
    } finally {
      setLoading(false);
    }
  };

  const availableBackups = backups.filter((b) => b.onDisk !== false);

  return (
    <div>
      <PageHeader title="Backup" subtitle="Database backup and restore" />
      <Alert type={message.type} message={message.text} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-panel">
          <h3 className="font-semibold">Backup Database</h3>
          <p className="mt-2 text-sm text-slate-500">
            Creates a new .bak file in the project backup folder
          </p>
          <button type="button" className="btn-primary mt-4" onClick={backupNow} disabled={loading}>
            {loading ? "Working..." : "Run Backup"}
          </button>
        </div>
        <div className="card-panel">
          <h3 className="font-semibold">Restore</h3>
          <p className="mt-2 text-sm text-slate-500">
            Only backups marked Available can be restored.
          </p>
        </div>
      </div>

      <div className="card-panel mt-6">
        <h3 className="mb-3 font-semibold">Backup History</h3>
        {backups.length === 0 ? (
          <p className="text-sm text-slate-500">No backups yet. Click Run Backup to create one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2">File</th>
                <th>Date</th>
                <th>Size</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2">{b.fileName}</td>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                  <td>{b.size}</td>
                  <td>
                    {b.onDisk === false ? (
                      <span className="text-red-600">Missing on disk</span>
                    ) : (
                      <span className="text-green-700">Available</span>
                    )}
                  </td>
                  <td className="flex flex-wrap gap-2 py-2">
                    {b.onDisk === false ? (
                      <>
                        <button
                          type="button"
                          className="btn-outline-sm cursor-not-allowed opacity-50"
                          disabled
                          title="File not found on disk"
                        >
                          Disabled
                        </button>
                        <button
                          type="button"
                          className="btn-outline-sm text-red-600"
                          onClick={() => remove(b.fileName)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-outline-sm"
                        onClick={() => restore(b.fileName)}
                        disabled={loading}
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {backups.some((b) => b.onDisk === false) && availableBackups.length === 0 && (
          <p className="mt-3 text-sm text-amber-700">
            All listed backups are missing from disk. Click Run Backup to create a fresh one.
          </p>
        )}
      </div>
    </div>
  );
}
