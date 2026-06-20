import { FiTrendingUp } from "react-icons/fi";

export default function StatCard({ label, value, icon: Icon = FiTrendingUp, accent = "bg-blue-50 text-blue-700" }) {
  return (
    <div className="card-panel flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? 0}</p>
      </div>
      <div className={`rounded-xl p-3 ${accent}`}>
        <Icon size={22} />
      </div>
    </div>
  );
}
