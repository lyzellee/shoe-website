import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useState, useEffect } from "react";
import "./orders.css";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/api\/?$/,
  "",
);

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found. Please sign in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getPaymentBadge = (status) => {
    switch (status) {
      case "completed":
        return <Badge bg="success">Completed</Badge>;
      case "pending":
        return (
          <Badge bg="warning" text="dark">
            Pending
          </Badge>
        );
      case "failed":
        return <Badge bg="danger">Failed</Badge>;
      default:
        return <Badge bg="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseOrder = () => {
    setSelectedOrder(null);
  };

  const getItemName = (item) => {
    if (item.shoeId && typeof item.shoeId === "object") {
      return item.shoeId.name || "Unnamed product";
    }

    return item.name || "Product";
  };

  const getItemPrice = (item) => {
    if (item.price !== undefined && item.price !== null) {
      return Number(item.price) || 0;
    }

    if (item.shoeId && typeof item.shoeId === "object") {
      return Number(item.shoeId.price) || 0;
    }

    return 0;
  };

  return (
    <div className="orders-page">
      <div className="orders-heading">
        <div>
          <p className="orders-eyebrow">ADMINISTRATION</p>
          <h2>Product Orders</h2>
          <p>View and manage customer orders.</p>
        </div>

        <div className="orders-count">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </div>
      </div>

      {error && <div className="orders-error-message">{error}</div>}

      <div className="orders-table-wrapper">
        <Table hover responsive className="orders-table">
          <thead>
            <tr>
              <th>Order Reference</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Order Status</th>
              <th>Payment Status</th>
              <th>Total</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="orders-message">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order._id}>
                  <td className="orders-reference">{order.orderReference}</td>

                  <td>{order.customer || "N/A"}</td>

                  <td>
                    {order.items?.reduce(
                      (total, item) => total + (Number(item.quantity) || 0),
                      0,
                    ) || 0}
                  </td>

                  <td>{getPaymentBadge(order.orderStatus)}</td>

                  <td>{getPaymentBadge(order.paymentStatus)}</td>

                  <td className="orders-total">
                    ₱{Number(order.totalPrice || 0).toLocaleString("en-PH")}
                  </td>

                  <td>{order.orderDate || "N/A"}</td>

                  <td>
                    <Button
                      className="orders-view-btn"
                      onClick={() => handleViewOrder(order)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="orders-message">
                  No orders available.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal
        show={selectedOrder !== null}
        onHide={handleCloseOrder}
        centered
        size="lg"
        dialogClassName="orders-modal"
      >
        {selectedOrder && (
          <>
            <Modal.Header closeButton className="orders-modal-header">
              <div>
                <p className="orders-modal-eyebrow">ORDER DETAILS</p>
                <Modal.Title className="orders-modal-title">
                  {selectedOrder.orderReference || "Order Information"}
                </Modal.Title>
              </div>
            </Modal.Header>

            <Modal.Body className="orders-modal-body">
              <div className="orders-details-grid">
                <div className="orders-detail">
                  <span>Customer</span>
                  <strong>{selectedOrder.customer || "N/A"}</strong>
                </div>

                <div className="orders-detail">
                  <span>Order Date</span>
                  <strong>{selectedOrder.orderDate || "N/A"}</strong>
                </div>

                <div className="orders-detail">
                  <span>Order Status</span>
                  <strong>{getPaymentBadge(selectedOrder.orderStatus)}</strong>
                </div>

                <div className="orders-detail">
                  <span>Payment Status</span>
                  <strong>
                    {getPaymentBadge(selectedOrder.paymentStatus)}
                  </strong>
                </div>
              </div>

              <div className="orders-products-section">
                <h6>Ordered Products</h6>

                {selectedOrder.items?.length > 0 ? (
                  selectedOrder.items.map((item, index) => (
                    <div className="orders-item" key={item._id || index}>
                      <div className="orders-item-info">
                        <strong>{getItemName(item)}</strong>
                        <span>Quantity: {Number(item.quantity) || 0}</span>
                      </div>

                      <div className="orders-item-price">
                        ₱
                        {(
                          getItemPrice(item) * (Number(item.quantity) || 0)
                        ).toLocaleString("en-PH")}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="orders-empty-items">
                    No product details available.
                  </p>
                )}
              </div>

              <div className="orders-modal-total">
                <span>Total Amount</span>
                <strong>
                  ₱
                  {Number(selectedOrder.totalPrice || 0).toLocaleString(
                    "en-PH",
                  )}
                </strong>
              </div>
            </Modal.Body>

            <Modal.Footer className="orders-modal-footer">
              <Button className="orders-close-btn" onClick={handleCloseOrder}>
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
}
