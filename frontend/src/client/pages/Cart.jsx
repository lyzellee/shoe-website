import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useState, useEffect } from "react";
import axios from "axios";
import "./Cart.css";

export default function Cart() {
  const [orders, setOrders] = useState([]);

  // Fetch orders from the backend
  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/orders");

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();

      // Keep only valid orders and items
      const validOrders = Array.isArray(data)
        ? data
            .filter((order) => order != null)
            .map((order) => ({
              ...order,
              items: Array.isArray(order.items)
                ? order.items.filter((item) => item != null)
                : [],
            }))
        : [];

      // Newest orders first
      validOrders.sort(
        (a, b) =>
          new Date(b.orderDate || b.createdAt || 0).getTime() -
          new Date(a.orderDate || a.createdAt || 0).getTime(),
      );

      setOrders(validOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Update quantity in the frontend only
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

            // Do not increase quantity if the shoe is unavailable
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

  // Delete an order
  const handleDeleteByOrder = async (id) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/orders/${id}`,
      );

      console.log("Order deleted:", response.data);
      await fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Calculate subtotal safely
  const subtotal = orders.reduce((total, order) => {
    return (
      total +
      order.items.reduce((orderTotal, item) => {
        const price = Number(item.shoeId?.price) || 0;
        const quantity = Number(item.quantity) || 0;

        return orderTotal + price * quantity;
      }, 0)
    );
  }, 0);

  // Format prices with commas and two decimal places
  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="cart-page">
      <h1 className="title-page">Shopping Cart</h1>

      <div className="cart-layout">
        <section className="cart-items-section">
          <h5 className="subtitle-page">YOUR BAG</h5>

          {orders.map((order) =>
            order.items.map((item) => {
              if (!item) {
                return null;
              }

              const shoe = item.shoeId;
              const quantity = Number(item.quantity) || 1;

              return (
                <Card key={item._id} className="card-item">
                  <Card.Body>
                    <div className="card-info">
                      {/* Shoe image */}
                      <div className="card-image-box">
                        <img
                          src={
                            shoe?.image ||
                            shoe?.imageUrl ||
                            shoe?.img ||
                            "/product-images/product%201.png"
                          }
                          alt={shoe?.name || "Product unavailable"}
                          className="cart-product-image"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src =
                              "/product-images/product%201.png";
                          }}
                        />
                      </div>

                      {/* Product details and quantity */}
                      <div className="cart-product-details">
                        <p className="card-category">MEN</p>

                        <h5 className="card-name">
                          {shoe?.name || "Product unavailable"}
                        </h5>

                        <p className="card-brand">{shoe?.brand || ""}</p>

                        <p className="card-size">
                          Size: {shoe?.size || "N/A"}
                          {shoe?.color ? ` · ${shoe.color}` : ""}
                        </p>

                        <div className="quantity-controls">
                          <Button
                            variant="outline-secondary"
                            onClick={() =>
                              handleQuantityChange(order._id, item._id, -1)
                            }
                            disabled={quantity <= 1}
                          >
                            −
                          </Button>

                          <span>{quantity}</span>

                          <Button
                            variant="outline-secondary"
                            onClick={() =>
                              handleQuantityChange(order._id, item._id, 1)
                            }
                            disabled={
                              !shoe || quantity >= (Number(shoe.stock) || 0)
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Price and Remove button */}
                      <div className="cart-product-actions">
                        <h5>
                          ₱{formatPrice((Number(shoe?.price) || 0) * quantity)}
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

                    {!shoe && (
                      <p className="text-muted mt-2">
                        This shoe is no longer available in the product catalog.
                      </p>
                    )}
                  </Card.Body>
                </Card>
              );
            }),
          )}

          {orders.every((order) => order.items.length === 0) && (
            <p className="mt-3">Your shopping cart is empty.</p>
          )}
        </section>

        {/* Order summary */}
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

          <div className="summary-row voucher-row">
            <span>Voucher</span>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>₱{formatPrice(subtotal)}</strong>
          </div>

          <Button
            className="checkout-button"
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
