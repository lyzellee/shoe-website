import { Navbar as BootstrapNavbar, Nav, Container } from "react-bootstrap";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-regular-svg-icons";
import {
  faMagnifyingGlass,
  faCartShopping,
  faReceipt,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { readFavorites } from "../client/favorites.js";
import { getCart } from "./AddToCartItems.jsx";
import "./Navbar.css";

function Navbar() {
  const [favoriteCount, setFavoriteCount] = useState(
    () => readFavorites().length,
  );
  const [cartCount, setCartCount] = useState(() => getCart().length);

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

            <Nav.Link
              as={Link}
              to="/your-order"
              className="nav-icon-order"
              aria-label="Your orders"
              title="Your Orders"
            >
              <FontAwesomeIcon icon={faReceipt} size="lg" />
            </Nav.Link>
          </div>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar;
