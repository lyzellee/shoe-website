import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./AdminLayout.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin/login", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  // Close on Escape, and when the screen grows back to desktop size
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Prevent the page behind the drawer from scrolling
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="admin-layout">
      {/* Mobile top bar with hamburger */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-hamburger"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
        >
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
        </button>
        <span className="admin-topbar-brand">SHOE WEBSITE</span>
      </header>

      {menuOpen && (
        <div className="admin-overlay" onClick={closeMenu} aria-hidden="true" />
      )}

      <aside
        id="admin-sidebar"
        className={`admin-sidebar ${menuOpen ? "open" : ""}`}
      >
        <div className="admin-brand">SHOE WEBSITE</div>

        <nav className="admin-navigation" aria-label="Admin navigation">
          <NavLink
            to="/admin/dashboard"
            className="admin-nav-link"
            onClick={closeMenu}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/stock"
            className="admin-nav-link"
            onClick={closeMenu}
          >
            Stock Management
          </NavLink>

          <NavLink
            to="/admin/orders"
            className="admin-nav-link"
            onClick={closeMenu}
          >
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
