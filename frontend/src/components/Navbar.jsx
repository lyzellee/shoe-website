import { Navbar as BootstrapNavbar, Nav, Container } from "react-bootstrap";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-regular-svg-icons";
import {
  faMagnifyingGlass,
  faCartShopping,
  faReceipt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { readFavorites } from "../client/favorites.js";
import { getCart } from "./AddToCartItems.jsx";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const [favoriteCount, setFavoriteCount] = useState(
    () => readFavorites().length,
  );
  const [cartCount, setCartCount] = useState(() => getCart().length);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const accountTriggerRef = useRef(null);

  useEffect(() => {
    const updateCounts = () => {
      setFavoriteCount(readFavorites().length);
      setCartCount(getCart().length);
    };

    window.addEventListener("favoritesUpdated", updateCounts);
    window.addEventListener("cartUpdated", updateCounts);
    window.addEventListener("storage", updateCounts);
    window.addEventListener("focus", updateCounts);

    return () => {
      window.removeEventListener("favoritesUpdated", updateCounts);
      window.removeEventListener("cartUpdated", updateCounts);
      window.removeEventListener("storage", updateCounts);
      window.removeEventListener("focus", updateCounts);
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleAccountMenuKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Tab"].includes(event.key)) {
      return;
    }

    if (event.key === "Tab") {
      setIsAccountMenuOpen(false);
      return;
    }

    const items = accountMenuRef.current?.querySelectorAll(
      '[role="menuitem"]:not([disabled])',
    );
    if (!items?.length) return;

    event.preventDefault();
    const currentIndex = Array.from(items).indexOf(document.activeElement);
    let nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    else if (event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else if (event.key === "ArrowDown" && currentIndex >= 0) {
      nextIndex = (currentIndex + 1) % items.length;
    }
    items[nextIndex].focus();
  };

  const isOrdersPage =
    location.pathname === "/your-order" || location.pathname.startsWith("/orders/");

  return (
    <BootstrapNavbar expand="lg" className="custom-navbar">
      <Container>
        {/* Logo */}
        <BootstrapNavbar.Brand as={Link} to="/" className="navbar-logo">
          SHOE HUB
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle
          aria-controls="main-navbar"
          className="navbar-menu-toggle"
        />

        <BootstrapNavbar.Collapse
          id="main-navbar"
          className="navbar-menu-collapse"
        >
          {/* Navigation Links */}
          <Nav className="navbar-main-links mx-lg-auto">
            <Nav.Link as={NavLink} to="/" end>
              Home
            </Nav.Link>

            <Nav.Link as={NavLink} to="/men">
              Men
            </Nav.Link>

            <Nav.Link as={NavLink} to="/women">
              Women
            </Nav.Link>

            <Nav.Link as={NavLink} to="/kids">
              Kids
            </Nav.Link>

            <Nav.Link as={NavLink} to="/accessories">
              Accessories
            </Nav.Link>
          </Nav>

          {/* Right-Side Icons */}
          <div className="navbar-icons">
            <button className="nav-icon" type="button" aria-label="Search">
              <FontAwesomeIcon icon={faMagnifyingGlass} size="sm" />
            </button>

            <Nav.Link as={Link} to="/wishlist" className="nav-icon-heart">
              <FontAwesomeIcon icon={faHeart} size="lg" />
              {favoriteCount > 0 && (
                <span className="nav-count-badge">{favoriteCount}</span>
              )}
            </Nav.Link>

            <Nav.Link as={Link} to="/cart" className="nav-icon-cart">
              <FontAwesomeIcon icon={faCartShopping} size="lg" />
              {cartCount > 0 && (
                <span className="nav-count-badge">{cartCount}</span>
              )}
            </Nav.Link>

            <div className="navbar-account" ref={accountMenuRef}>
              <button
                ref={accountTriggerRef}
                className={`nav-icon-account ${isAccountMenuOpen ? "is-open" : ""}`}
                type="button"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && !isAccountMenuOpen) {
                    event.preventDefault();
                    setIsAccountMenuOpen(true);
                    window.requestAnimationFrame(() => {
                      accountMenuRef.current
                        ?.querySelector('[role="menuitem"]:not([disabled])')
                        ?.focus();
                    });
                  }
                }}
              >
                <FontAwesomeIcon icon={faUser} />
              </button>

              {isAccountMenuOpen && (
                <div
                  className="account-dropdown"
                  role="menu"
                  aria-label="Account options"
                  onKeyDown={handleAccountMenuKeyDown}
                >
                  <button
                    className="account-dropdown-item account-dropdown-unavailable"
                    type="button"
                    role="menuitem"
                    disabled
                    title="Account features are not available yet"
                  >
                    <FontAwesomeIcon icon={faUser} />
                    <span>Your Account</span>
                  </button>
                  <div className="account-dropdown-divider" role="separator" />
                  <Link
                    className={`account-dropdown-item ${isOrdersPage ? "active" : ""}`}
                    to="/your-order"
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <FontAwesomeIcon icon={faReceipt} />
                    <span>Your Orders</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar;
