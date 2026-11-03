import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Walang token? Bumalik sa login page.
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Hindi tugma ang role? Hindi puwedeng pumasok.
  if (!user || user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
