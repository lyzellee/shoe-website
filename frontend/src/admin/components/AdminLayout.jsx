import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import "./AdminLayout.css";

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">SHOE WEBSITE</div>

        <nav className="admin-navigation" aria-label="Admin navigation">
          <NavLink to="/admin/dashboard" className="admin-nav-link">
            Dashboard
          </NavLink>

          <NavLink to="/admin/stock" className="admin-nav-link">
            Stock Management
          </NavLink>

          <NavLink to="/admin/orders" className="admin-nav-link">
            Product Orders
          </NavLink>
        </nav>

        <button type="button" className="admin-logout" onClick={logout}>
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
          <span>Log out</span>
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
