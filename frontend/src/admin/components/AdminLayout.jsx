import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">SHOE WEBSITE</div>

        <nav className="admin-navigation">
          <NavLink to="/admin/stock" className="admin-nav-link">
            Stock Management
          </NavLink>

          <NavLink to="/admin/orders" className="admin-nav-link">
            Product Orders
          </NavLink>
          <NavLink to="/admin/dashboard" className="admin-nav-link">
            Dashboard
          </NavLink>
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
