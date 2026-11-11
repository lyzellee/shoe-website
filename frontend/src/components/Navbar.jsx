import { Navbar as BootstrapNavbar, Nav, Container } from "react-bootstrap";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-regular-svg-icons";
import {
  faMagnifyingGlass,
  faCartShopping,
  faReceipt,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { readFavorites } from "../client/favorites.js";
import { getCart } from "./AddToCartItems.jsx";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [favoriteCount, setFavoriteCount] = useState(
    () => readFavorites().length,
  );
  const [cartCount, setCartCount] = useState(() => getCart().length);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accountMenuRef = useRef(null);
  const accountTriggerRef = useRef(null);
  const searchPanelRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Tighten and solidify the floating bar once the page scrolls
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // Search panel: focus on open, close on outside click / Escape
  useEffect(() => {
    if (!isSearchOpen) return undefined;

    searchInputRef.current?.focus();

    const handlePointerDown = (event) => {
      if (
        searchPanelRef.current?.contains(event.target) ||
        searchTriggerRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsSearchOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        searchTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSearchOpen]);

  // Keep the box in sync with the URL when viewing /search?q=...
  useEffect(() => {
    if (location.pathname === "/search") {
      setSearchQuery(new URLSearchParams(location.search).get("q") ?? "");
    }
  }, [location.pathname, location.search]);

  const toggleSearch = () => {
    setIsSearchOpen((open) => !open);
    setIsAccountMenuOpen(false);
    setIsMenuOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const term = searchQuery.trim();
    if (!term) {
      searchInputRef.current?.focus();
      return;
    }
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setIsSearchOpen(false);
    setIsMenuOpen(false);
  };

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
    location.pathname === "/your-order" ||
    location.pathname.startsWith("/orders/");

  const isAccountPage = location.pathname === "/account";

  const isHomePage = location.pathname === "/";

  return (
    <>
      <BootstrapNavbar
        expand="lg"
        expanded={isMenuOpen}
        onToggle={(open) => {
          setIsMenuOpen(open);
          if (open) setIsSearchOpen(false);
        }}
        className={`custom-navbar ${isScrolled ? "is-scrolled" : ""}`}
      >
        <Container fluid className="navbar-pill">
          {/* Logo (text only) */}
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
              <button
                ref={searchTriggerRef}
                className="nav-icon"
                type="button"
                aria-label="Search"
                aria-expanded={isSearchOpen}
                aria-controls="navbar-search"
                onClick={toggleSearch}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>

              <Nav.Link
                as={Link}
                to="/wishlist"
                className="nav-icon-heart"
                aria-label="Wishlist"
              >
                <FontAwesomeIcon icon={faHeart} />
                {favoriteCount > 0 && (
                  <span className="nav-count-badge">{favoriteCount}</span>
                )}
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/cart"
                className="nav-icon-cart"
                aria-label="Cart"
              >
                <FontAwesomeIcon icon={faCartShopping} />
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
                  onClick={() => {
                    setIsAccountMenuOpen((open) => !open);
                    setIsSearchOpen(false);
                  }}
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
                    <Link
                      className={`account-dropdown-item ${isAccountPage ? "active" : ""}`}
                      to="/account"
                      role="menuitem"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={faUser} />
                      <span>Your Account</span>
                    </Link>
                    <div
                      className="account-dropdown-divider"
                      role="separator"
                    />
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

        {isSearchOpen && (
          <form
            id="navbar-search"
            ref={searchPanelRef}
            className="navbar-search"
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="navbar-search-icon"
            />
            <input
              ref={searchInputRef}
              type="search"
              className="navbar-search-input"
              placeholder="Search shoes, brands, styles"
              aria-label="Search products"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="navbar-search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
            <button type="submit" className="navbar-search-submit">
              Search
            </button>
          </form>
        )}
      </BootstrapNavbar>

      {/* Keeps page content clear of the fixed bar (home hero goes under it) */}
      {!isHomePage && <div className="navbar-spacer" aria-hidden="true" />}
    </>
  );
}

export default Navbar;
