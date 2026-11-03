import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link to="/">WEB NAME</Link>
          <p>Performance-inspired footwear designed for everyday movement.</p>
        </div>

        <div className="footer-column">
          <h3>SHOP</h3>
          <Link to="/men">Men</Link>
          <Link to="/women">Women</Link>
          <Link to="/kids">Kids</Link>
          <Link to="/">All footwear</Link>
        </div>

        <div className="footer-column">
          <h3>HELP</h3>
          <Link to="/cart">Contact</Link>
          <Link to="/cart">About Us</Link>
          <Link to="/cart">Shipping features</Link>
          <Link to="/cart">FAQ</Link>
        </div>

        <div className="footer-newsletter">
          <h3>STAY IN MOTION</h3>
          <p>Get first access to new drops and seasonal releases.</p>
          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="footer-email">Email Address</label>
            <div>
              <input
                id="footer-email"
                type="email"
                placeholder="Email Address"
              />
              <button type="submit">Join</button>
            </div>
          </form>
        </div>
      </div>
    </footer>
  );
}
