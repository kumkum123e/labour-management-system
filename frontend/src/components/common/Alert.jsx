export default function Alert({ type = "info", message, onClose }) {
  if (!message) return null;
  const styles = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  };
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${styles[type] || styles.info}`}>
      {message}
      {onClose && (
        <button type="button" className="ml-2 underline" onClick={onClose}>
          Dismiss
        </button>
      )}
    </div>
  );
}
