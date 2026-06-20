import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth";
import { getRoleDashboardPath } from "../../utils/roleRedirect";
import { FaUserTie, FaArrowLeft } from "react-icons/fa";
import Alert from "../../components/common/Alert";

export default function HODLogin() {
  const { login, logout, loading, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    if (user) {
      if (String(user.role).trim().toUpperCase() === "HOD") {
        navigate("/hod/dashboard", { replace: true });
      } else {
        logout();
      }
    }
  }, [user, logout, navigate]);

  const onSubmit = async ({ username, password }) => {
    setError("");
    try {
      const data = await login(username, password);
      const userRole = String(data.user?.role || "").toUpperCase();
      if (userRole !== "HOD") {
        logout();
        setError("Access Denied: Only HOD accounts can log in here.");
        return;
      }
      navigate(getRoleDashboardPath(data.user.role));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-955 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl transition duration-300 hover:shadow-emerald-900/10 border border-slate-100">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-md">
            <FaUserTie className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">HOD Portal</h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            Sign in with your HOD credentials to manage department labours
          </p>
        </div>

        <Alert type="error" message={error} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              HOD Name
              <input
                type="text"
                className="form-input mt-1.5"
                placeholder="Enter HOD name"
                {...register("username", { required: true })}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                type="password"
                className="form-input mt-1.5"
                placeholder="••••••••"
                {...register("password", { required: true })}
              />
            </label>
          </div>
          <button type="submit" className="btn-primary mt-4 w-full py-2.5 flex justify-center items-center font-semibold text-base transition-all duration-200 shadow-md shadow-emerald-800/10 hover:shadow-lg hover:shadow-emerald-800/20 bg-emerald-700 hover:bg-emerald-800" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-700 transition-colors">
            <FaArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Portal Selection
          </Link>
        </div>
      </div>
    </div>
  );
}
