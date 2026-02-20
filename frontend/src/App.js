import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import api from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("balance_token");
    const savedUser = localStorage.getItem("balance_user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("balance_token");
        localStorage.removeItem("balance_user");
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("balance_token", token);
    localStorage.setItem("balance_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("balance_token");
    localStorage.removeItem("balance_user");
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "manager" ? "/manager" : "/dashboard"} replace />;
  }
  return children;
}

function App() {
  // Seed data on first load
  useEffect(() => {
    api.post("/seed").catch(() => { });
  }, []);

  return (
    <div className="App">
      <div className="noise-overlay" />
      <ThemeProvider defaultTheme="dark" storageKey="balance-theme">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <EmployeeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" />
      </ThemeProvider>
    </div>
  );
}

export default App;
