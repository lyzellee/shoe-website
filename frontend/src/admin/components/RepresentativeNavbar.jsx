import { useEffect, useRef, useState } from "react";
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
  const [slotWidth, setSlotWidth] = useState(0);
  const slotRef = useRef(null);

  // The <aside> keeps its column in the page layout (the "slot"), while the
  // visible sidebar panel is fixed to the screen so it never scrolls away.
  // Measure the slot so the fixed panel always matches the column width.
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return undefined;

    const update = () => setSlotWidth(slot.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

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
      {/* Keeps page content from hiding under the fixed top bar */}
      <div className="representative-topbar-spacer" aria-hidden="true" />

      {menuOpen && (
        <div
          className="representative-sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slot: holds the sidebar's column in the layout on desktop */}
      <aside className="representative-sidebar" ref={slotRef}>
        {/* Panel: fixed to the screen, always full height */}
        <div
          id="representative-sidebar"
          className={`representative-sidebar-panel${menuOpen ? " open" : ""}`}
          style={slotWidth ? { "--rp-sidebar-w": `${slotWidth}px` } : undefined}
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
        </div>
      </aside>
    </>
  );
}
