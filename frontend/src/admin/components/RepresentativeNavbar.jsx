import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./RepresentativeNavbar.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "Orders" },
];

export default function RepresentativeNavbar({
  activePage,
  onNavigate,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Esc closes the drawer, page scroll is locked while it is open, and it
  // closes automatically when the screen becomes desktop-size
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 821px)");
    const handleResize = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleResize);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleNavigate = (key) => {
    onNavigate(key);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="representative-topbar">
        <button
          type="button"
          className="representative-hamburger"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="representative-sidebar"
          onClick={() => setMenuOpen(true)}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <span className="representative-topbar-brand">SHOE WEBSITE</span>
      </div>

      {menuOpen && (
        <div
          className="representative-sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="representative-sidebar"
        className={`representative-sidebar${menuOpen ? " open" : ""}`}
      >
        <button
          type="button"
          className="representative-sidebar-close"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className="representative-brand">SHOE WEBSITE</div>

        <nav
          className="representative-nav"
          aria-label="Representative navigation"
        >
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.key}
              className={activePage === item.key ? "active" : ""}
              aria-current={activePage === item.key ? "page" : undefined}
              onClick={() => handleNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="representative-logout"
          onClick={onLogout}
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
          <span>Log out</span>
        </button>
      </aside>
    </>
  );
}
