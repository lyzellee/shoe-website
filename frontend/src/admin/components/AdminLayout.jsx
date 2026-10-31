import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        {/* Website Name */}
        <div className="admin-brand">SHOE WEBSITE</div>

        {/* Admin Navigation */}
        <nav className="admin-navigation">
          <NavLink
            to="/stock"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            Stock Management
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            Product Orders
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
