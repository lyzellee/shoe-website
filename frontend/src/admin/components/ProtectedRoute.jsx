import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Walang token? Bumalik sa admin login.
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Hindi admin? Hindi puwedeng pumasok sa admin pages.
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
