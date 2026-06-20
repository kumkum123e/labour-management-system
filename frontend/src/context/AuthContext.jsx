import { createContext, useContext, useState, useEffect } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        if (!parsed.role && parsed.role_name) parsed.role = parsed.role_name;
        if (!parsed.id && parsed.user_id) parsed.id = parsed.user_id;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [isPrivateNetwork, setIsPrivateNetwork] = useState(true);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const hasRole = (role) => String(user?.role || "").toUpperCase() === String(role).toUpperCase();

  useEffect(() => {
    if (!localStorage.getItem("token")) setUser(null);

    const checkNet = async () => {
      try {
        const data = await authService.checkNetworkStatus();
        setIsPrivateNetwork(data.isPrivate);
      } catch (err) {
        console.error("Failed to check network status", err);
      }
    };
    checkNet();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasRole, isPrivateNetwork }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
