import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth";
import { getRoleDashboardPath } from "../../utils/roleRedirect";
import { FaHardHat, FaArrowLeft } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Alert from "../../components/common/Alert";

export default function LabourLogin() {
  const { login, logout, loading, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    if (user) {
      navigate(getRoleDashboardPath(user.role), { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async ({ username, password }) => {
    setError("");
    try {
      const data = await login(username, password);
      const userRole = String(data.user?.role || "").toUpperCase();
      if (userRole !== "LABOUR" && userRole !== "SECURITY") {
        logout();
        setError("Access Denied: Only Employee or Security accounts can log in here.");
        return;
      }
      navigate(getRoleDashboardPath(data.user.role));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-955 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl transition duration-300 hover:shadow-amber-900/10 border border-slate-100">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-md">
            <FaHardHat className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Employee Portal</h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            Sign in with your Employee ID to view outings and notifications
          </p>
        </div>

        <Alert type="error" message={error} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Employee ID
              <input
                type="text"
                className="form-input mt-1.5"
                placeholder="Enter Employee ID (e.g. ravi)"
                {...register("username", { required: true })}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  {...register("password", { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </label>
          </div>
          <button type="submit" className="btn-primary mt-4 w-full py-2.5 flex justify-center items-center font-semibold text-base transition-all duration-200 shadow-md shadow-amber-800/10 hover:shadow-lg hover:shadow-amber-800/20 bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-amber-600 transition-colors">
            <FaArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Portal Selection
          </Link>
        </div>
      </div>
    </div>
  );
}
