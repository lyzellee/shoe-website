import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useState, useEffect } from "react";
import axios from "axios";
import "./Cart.css";

export default function Cart() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleQuantityChange = (orderId, itemId, change) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) => {
        if (order._id !== orderId) {
          return order;
        }

        return {
          ...order,
          items: order.items.map((item) => {
            if (item._id !== itemId) {
              return item;
            }

            const newQuantity = item.quantity + change;

            // Quantity cannot go below 1
            if (newQuantity < 1) {
              return item;
            }

            // Prevent increasing quantity beyond available stock
            const availableStock = item.shoeId?.stock ?? 0;

            if (change > 0 && newQuantity > availableStock) {
              return item;
            }

            return {
              ...item,
              quantity: newQuantity,
            };
          }),
        };
      }),
    );
  };

  const handleDeleteByOrder = async (id) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/orders/${id}`,
      );
      console.log("Delete Shoes!", response.data);
      fetchOrders();
    } catch (e) {
      console.error("Error deleting shoes", e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  //get all cart items

  const cartItems = orders.flatMap((order) => order.items);

  return (
    <div className="cart-page">
      {/* Page title */}
      <h1 className="title-page">Shopping Cart</h1>

      <div className="cart-layout">
        <section className="cart-items-section">
          <h5 className="subtitle-page">YOUR BAG</h5>

          {/* items orders */}
          {orders.map((order) =>
            order.items.map((item) => (
              <Card key={item._id} className="card-item">
                <Card.Body>
                  <div className="card-info">
                    {/* Shoe image */}
                    <div className="card-image-box">
                      <img
                        src={
                          item.shoeId.image ||
                          item.shoeId.imageUrl ||
                          item.shoeId.img ||
                          "/product-images/product 1.png"
                        }
                        alt={item.shoeId.name}
                        className="cart-product-image"
                      />
                    </div>

                    {/* Product details and quantity */}
                    <div className="cart-product-details">
                      <p className="card-category">MEN</p>

                      <h5 className="card-name">{item.shoeId?.name}</h5>

                      <p className="card-size">
                        Size: {item.shoeId?.size || "N/A"} ·{" "}
                        {item.shoeId?.color || item.shoeId?.name}
                      </p>

                      <div className="quantity-controls">
                        <Button
                          variant="outline-secondary"
                          onClick={() =>
                            handleQuantityChange(order._id, item._id, -1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          −
                        </Button>

                        <span>{item.quantity}</span>

                        <Button
                          variant="outline-secondary"
                          onClick={() =>
                            handleQuantityChange(order._id, item._id, 1)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Price and remove */}
                    <div className="cart-product-actions">
                      <h5>
                        ₱
                        {(
                          (item.shoeId?.price || 0) * item.quantity
                        ).toLocaleString("en-PH", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </h5>

                      <Button
                        variant="link"
                        onClick={() => handleDeleteByOrder(order._id)}
                        className="remove-button"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )),
          )}
        </section>

        <aside className="cart-summary">
          <h2>Summary</h2>

          {/* Subtotal */}
          <div className="summary-row">
            <span>Subtotal</span>

            <strong>
              ₱
              {orders
                .flatMap((order) => order.items)
                .reduce(
                  (total, item) =>
                    total + (item.shoeId?.price || 0) * item.quantity,
                  0,
                )
                .toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </strong>
          </div>

          {/* Shipping fee */}
          <div className="summary-row">
            <span>Shipping Fee</span>
            <strong>Free</strong>
          </div>

          {/* Voucher section */}
          <div className="summary-row voucher-row">
            <span>Voucher</span>
          </div>

          {/* Total amount */}
          <div className="summary-total">
            <span>Total</span>
            <strong>
              ₱
              {orders
                .flatMap((order) => order.items)
                .reduce(
                  (total, item) =>
                    total + (item.shoeId?.price || 0) * item.quantity,
                  0,
                )
                .toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </strong>
          </div>

          {/* Navigate to checkout */}
          <Button
            className="checkout-button"
            onClick={() => {
              window.location.href = "/checkout";
            }}
          >
            Checkout <span>→</span>
          </Button>

          {/* Return to the home page */}
          <a href="/" className="continue-shopping">
            Continue Shopping
          </a>
        </aside>
      </div>
    </div>
  );
}
