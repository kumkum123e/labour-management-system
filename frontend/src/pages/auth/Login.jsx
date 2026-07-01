import { Link } from "react-router-dom";
import { FaUserShield, FaUserTie, FaHardHat } from "react-icons/fa";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { isPrivateNetwork } = useAuth();

  const portals = [
    {
      name: "Admin Portal",
      path: "/admin-login",
      description: "Manage departments, HOD accounts, and system-wide employee records.",
      icon: FaUserShield,
      color: "blue",
      bgClass: "bg-blue-50 text-blue-800 border-blue-100 hover:border-blue-300 hover:shadow-blue-900/5 hover:bg-blue-50/80",
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      name: "HOD Portal",
      path: "/hod-login",
      description: "Manage department employee profiles, outings, and requests.",
      icon: FaUserTie,
      color: "emerald",
      bgClass: "bg-emerald-50 text-emerald-800 border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-900/5 hover:bg-emerald-50/80",
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      name: "Employee Portal",
      path: "/labour-login",
      description: "View outings, request approvals, and view system notifications.",
      icon: FaHardHat,
      color: "amber",
      bgClass: "bg-amber-50 text-amber-800 border-amber-100 hover:border-amber-300 hover:shadow-amber-900/5 hover:bg-amber-50/80",
      iconClass: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-white/95 backdrop-blur-md p-8 sm:p-12 shadow-2xl border border-slate-100/50">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Frigerio Conserva Allana Pvt Ltd Management System
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
            Select your workspace portal below to access the management dashboards and portal applications.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {portals.map((portal) => {
            const IconComponent = portal.icon;
            const isRestrictedAdmin = portal.name === "Admin Portal" && !isPrivateNetwork;
            
            return (
              <Link
                key={portal.name}
                to={portal.path}
                className={`flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  isRestrictedAdmin
                    ? "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                    : portal.bgClass
                }`}
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-md ${
                  isRestrictedAdmin
                    ? "bg-slate-200 text-slate-500"
                    : portal.iconClass
                } transition duration-300`}>
                  <IconComponent className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900 flex items-center gap-1.5 justify-center">
                  {portal.name}
                  {isRestrictedAdmin && (
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal uppercase tracking-wider">
                      LAN Only
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {portal.description}
                </p>
                <span className="mt-6 text-sm font-semibold inline-flex items-center group-hover:underline">
                  {isRestrictedAdmin ? "Restricted Access" : "Enter Portal"} &rarr;
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center text-xs text-slate-400">
          Frigerio Conserva Allana Pvt Ltd Management System &copy; {new Date().getFullYear()} &bull; Enterprise Edition
        </div>
      </div>
    </div>
  );
}
