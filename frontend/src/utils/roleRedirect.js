export const getRoleDashboardPath = (role) => {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return "/admin/dashboard";
  if (r === "HOD") return "/hod/dashboard";
  if (r === "LABOUR") return "/labour/dashboard";
  return "/login";
};
