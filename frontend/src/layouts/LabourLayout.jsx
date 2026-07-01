import { useState } from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import { FiGrid, FiPlusCircle, FiList, FiClock, FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const links = [
  { to: "/labour/dashboard", label: "Dashboard", icon: FiGrid, end: true },
  { to: "/labour/create-request", label: "Create Request", icon: FiPlusCircle },
  { to: "/labour/request-status", label: "Request Status", icon: FiList },
  { to: "/labour/history", label: "History", icon: FiClock },
];

export default function LabourLayout() {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || (!hasRole("LABOUR") && !hasRole("ADMIN"))) return <Navigate to="/labour-login" replace />;

  return (
    <div className="flex min-h-screen bg-slate-100 relative">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-slate-200 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Employee Panel</h2>
            <p className="mt-1 text-xs text-slate-400">{user.username}</p>
          </div>
          {/* Mobile close button */}
          <button 
            type="button" 
            className="text-slate-400 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="m-3 flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800">
          <FiLogOut /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 md:hidden">
          <h2 className="text-lg font-bold text-slate-900">Employee Panel</h2>
          <button 
            type="button" 
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu size={20} />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
