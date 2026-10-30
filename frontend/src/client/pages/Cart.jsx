import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useState } from "react";
import "./Cart.css";

export default function Cart() {
  // Kunin ang cart items mula sa localStorage
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // I-save ang updated cart sa state at localStorage
  const updateCart = (updatedCart) => {
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  // Baguhin ang quantity
  const handleQuantityChange = (shoeId, change) => {
    const updatedCart = cartItems.map((item) => {
      if (item._id !== shoeId) {
        return item;
      }

      const currentQuantity = Number(item.quantity) || 1;
      const newQuantity = currentQuantity + change;

      // Hindi puwedeng mas mababa sa 1
      if (newQuantity < 1) {
        return item;
      }

      // Huwag lumampas sa available stock
      const stock = Number(item.stock) || 0;

      if (change > 0 && newQuantity > stock) {
        return item;
      }

      return {
        ...item,
        quantity: newQuantity,
      };
    });

    updateCart(updatedCart);
  };

  // Alisin ang shoe sa cart
  const handleRemove = (shoeId) => {
    const updatedCart = cartItems.filter((item) => item._id !== shoeId);

    updateCart(updatedCart);
  };

  // Kalkulahin ang subtotal
  const subtotal = cartItems.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;

    return total + price * quantity;
  }, 0);

  // Format ng presyo
  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // IMPORTANT: Dito natin ibinabalik ang UI
  return (
    <div className="cart-page">
      <h1 className="title-page">Shopping Cart</h1>

      <div className="cart-layout">
        <section className="cart-items-section">
          <h5 className="subtitle-page">YOUR BAG</h5>

          {cartItems.length === 0 ? (
            <p className="mt-3">Your shopping cart is empty.</p>
          ) : (
            cartItems.map((item) => {
              const shoe = item;
              const quantity = Number(item.quantity) || 1;

              return (
                <Card key={item._id} className="card-item">
                  <Card.Body>
                    <div className="card-info">
                      <div className="card-image-box">
                        <img
                          src={
                            shoe.image ||
                            shoe.imageUrl ||
                            shoe.img ||
                            "/product-images/product%201.png"
                          }
                          alt={shoe.name || "Product"}
                          className="cart-product-image"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src =
                              "/product-images/product%201.png";
                          }}
                        />
                      </div>

                      <div className="cart-product-details">
                        <p className="card-category">
                          {(shoe.gender || "SHOES").toUpperCase()}
                        </p>

                        <h5 className="card-name">{shoe.name || "Product"}</h5>

                        <p className="card-brand">{shoe.brand}</p>

                        <div className="quantity-controls">
                          <Button
                            variant="outline-secondary"
                            disabled={quantity <= 1}
                            onClick={() => handleQuantityChange(item._id, -1)}
                          >
                            −
                          </Button>

                          <span>{quantity}</span>

                          <Button
                            variant="outline-secondary"
                            disabled={quantity >= (Number(shoe.stock) || 0)}
                            onClick={() => handleQuantityChange(item._id, 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="cart-product-actions">
                        <h5>
                          ₱{formatPrice((Number(shoe.price) || 0) * quantity)}
                        </h5>

                        <Button
                          variant="link"
                          className="remove-button"
                          onClick={() => handleRemove(item._id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })
          )}
        </section>

        <aside className="cart-summary">
          <h2>Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <strong>₱{formatPrice(subtotal)}</strong>
          </div>

          <div className="summary-row">
            <span>Shipping Fee</span>
            <strong>Free</strong>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>₱{formatPrice(subtotal)}</strong>
          </div>

          <Button
            className="checkout-button"
            disabled={cartItems.length === 0}
            onClick={() => {
              window.location.href = "/checkout";
            }}
          >
            Checkout <span>→</span>
          </Button>

          <a href="/" className="continue-shopping">
            Continue Shopping
          </a>
        </aside>
      </div>
    </div>
  );
}
