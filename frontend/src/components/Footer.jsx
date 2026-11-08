import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Footer.css";

export default function Footer() {
  const [activeInfo, setActiveInfo] = useState(null);

  useEffect(() => {
    if (!activeInfo) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setActiveInfo(null);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeInfo]);

  const footerInfo = {
    contact: {
      eyebrow: "VISIT OUR STORE",
      title: "Contact",
      content: (
        <div className="footer-info-details">
          <div>
            <span>Store branch</span>
            <strong>Greenhills Mall Branch</strong>
          </div>
          <div>
            <span>Address</span>
            <strong>
              3rd Floor, Greenhills Mall, Ortigas Avenue, San Juan City
            </strong>
          </div>
          <div>
            <span>Contact number</span>
            <a href="tel:+639678423860">09678423860</a>
          </div>
          <div>
            <span>Email</span>
            <a href="mailto:shoehub@gmail.com">shoehub@gmail.com</a>
          </div>
        </div>
      ),
    },
    about: {
      eyebrow: "OUR STORY",
      title: "About Us",
      content: (
        <p className="footer-info-story">
          Shoe Hub began with one simple belief: the right pair can carry you
          through every part of your day. We bring together comfortable,
          performance-inspired footwear and timeless style for people who are
          always moving. From everyday essentials to standout new drops, our
          goal is to help you find shoes that feel as good as they look.
        </p>
      ),
    },
    shipping: {
      eyebrow: "DELIVERY INFORMATION",
      title: "Shipping Features",
      content: (
        <div className="footer-shipping-list">
          <div>
            <strong>Nationwide delivery</strong>
            <span>
              We deliver orders across supported locations in the Philippines.
            </span>
          </div>
          <div>
            <strong>Order updates</strong>
            <span>
              Track important order milestones as your purchase is prepared.
            </span>
          </div>
          <div>
            <strong>Secure packaging</strong>
            <span>
              Your footwear is carefully packed to protect it during transit.
            </span>
          </div>
        </div>
      ),
    },
    faq: {
      eyebrow: "NEED HELP?",
      title: "Frequently Asked Questions",
      content: (
        <div className="footer-faq-list">
          <details>
            <summary>Where can I buy Shoe Hub products?</summary>
            <p>
              You can shop our available styles directly through the online
              store.
            </p>
          </details>
          <details>
            <summary>How do I choose the right shoe size?</summary>
            <p>
              Check the product size guide and select the size that matches your
              usual fit.
            </p>
          </details>
          <details>
            <summary>Can I change or cancel my order?</summary>
            <p>
              Please contact our Greenhills Mall branch as soon as possible for
              assistance.
            </p>
          </details>
          <details>
            <summary>How can I track my delivery?</summary>
            <p>
              Delivery updates will be provided through the contact details
              submitted with your order.
            </p>
          </details>
        </div>
      ),
    },
  };

  const currentInfo = activeInfo ? footerInfo[activeInfo] : null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link to="/">SHOE HUB</Link>
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
          <button type="button" onClick={() => setActiveInfo("contact")}>
            Contact
          </button>
          <button type="button" onClick={() => setActiveInfo("about")}>
            About Us
          </button>
          <button type="button" onClick={() => setActiveInfo("shipping")}>
            Shipping Features
          </button>
          <button type="button" onClick={() => setActiveInfo("faq")}>
            FAQ
          </button>
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

      {currentInfo && (
        <div
          className="footer-info-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveInfo(null);
          }}
        >
          <section
            className="footer-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-info-title"
          >
            <button
              type="button"
              className="footer-info-close"
              aria-label="Close"
              onClick={() => setActiveInfo(null)}
            >
              ×
            </button>
            <p className="footer-info-eyebrow">{currentInfo.eyebrow}</p>
            <h2 id="footer-info-title">{currentInfo.title}</h2>
            <div className="footer-info-body">{currentInfo.content}</div>
          </section>
        </div>
      )}
    </footer>
  );
}
