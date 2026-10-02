import { Navbar as BootstrapNavbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { faMagnifyingGlass, faCartShopping } from '@fortawesome/free-solid-svg-icons';
import "./Navbar.css";

function Navbar() {
    return (
        <BootstrapNavbar expand="lg" className="custom-navbar">
            <Container>

                {/* Logo */}
                <BootstrapNavbar.Brand
                    as={Link}
                    to="/"
                    className="navbar-logo"
                >
                    WEB NAME
                </BootstrapNavbar.Brand>

                {/* Mobile menu button 
                <BootstrapNavbar.Toggle aria-controls="main-navbar" />

                <BootstrapNavbar.Collapse id="main-navbar">*/}

                {/* Navigation Links */}
                <Nav className="mx-auto">
                    <Nav.Link as={Link} to="/">
                        Home
                    </Nav.Link>

                    <Nav.Link as={Link} to="/men">
                        Men
                    </Nav.Link>

                    <Nav.Link as={Link} to="/women">
                        Women
                    </Nav.Link>

                    <Nav.Link as={Link} to="/kids">
                        Kids
                    </Nav.Link>

                    <Nav.Link as={Link} to="/accessories">
                        Accessories
                    </Nav.Link>
                </Nav>

                {/* Right-Side Icons */}
                <div className="navbar-icons">

                    {/* Search */}
                    <button className="nav-icon">
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass} size="sm"/>
                    </button>

                    {/* Wishlist */}
                    <Nav.Link as={Link} to="/wishlist" className="nav-icon-heart">
                        <FontAwesomeIcon icon={faHeart} size="lg"/>
                    </Nav.Link>

                    {/* Cart */}
                    <Nav.Link as={Link} to="/cart" className="nav-icon-cart">
                        <FontAwesomeIcon icon={faCartShopping} size="lg"/>
                    </Nav.Link>

                </div>

            </Container>
        </BootstrapNavbar>
    );
}

export default Navbar;