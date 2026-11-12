import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faSort,
  faFilter,
  faFileExcel,
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
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

  // Frontend-only search, sort and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest-first");
  const [filterOrderStatus, setFilterOrderStatus] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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

  const getCustomerName = (order) =>
    order.customerInfo
      ? `${order.customerInfo.firstName} ${order.customerInfo.lastName}`
      : "N/A";

  const getOrderTime = (order) =>
    new Date(order.createdAt || order.orderDate || 0).getTime() || 0;

  const getItemCount = (order) =>
    order.items?.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0,
    ) || 0;

  const filteredOrders = orders
    .filter((order) =>
      `${order.orderReference} ${getCustomerName(order)} ${order.orderStatus} ${order.paymentStatus} ${order.orderDate}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
    .filter(
      (order) => !filterOrderStatus || order.orderStatus === filterOrderStatus,
    )
    .filter(
      (order) =>
        !filterPaymentStatus || order.paymentStatus === filterPaymentStatus,
    )
    .sort((a, b) => {
      if (sortBy === "newest-first") return getOrderTime(b) - getOrderTime(a);
      if (sortBy === "oldest-first") return getOrderTime(a) - getOrderTime(b);
      if (sortBy === "total-asc")
        return Number(a.totalPrice || 0) - Number(b.totalPrice || 0);
      if (sortBy === "total-desc")
        return Number(b.totalPrice || 0) - Number(a.totalPrice || 0);
      if (sortBy === "customer-desc")
        return getCustomerName(b).localeCompare(getCustomerName(a));
      return getCustomerName(a).localeCompare(getCustomerName(b));
    });

  const handleExportExcel = () => {
    const rows = filteredOrders.map((order) => ({
      "Order Reference": order.orderReference || "",
      Customer: getCustomerName(order),
      Items: getItemCount(order),
      "Order Status": order.orderStatus || "",
      "Payment Status": order.paymentStatus || "",
      Total: Number(order.totalPrice || 0),
      Date: order.orderDate || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 26 },
      { wch: 24 },
      { wch: 8 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(
      workbook,
      `orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="orders-page">
      <div className="orders-heading">
        <div>
          <p className="orders-eyebrow">ADMINISTRATION</p>
          <h2>Product Orders</h2>
          <p>View and manage customer orders.</p>
        </div>

        <div className="orders-header-actions">
          <div className="orders-search">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              size="sm"
              className="orders-search-icon"
            />
            <Form.Control
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="orders-count">
            {orders.length} {orders.length === 1 ? "Order" : "Orders"}
          </div>
        </div>
      </div>

      <div className="orders-view-row">
        <div className="orders-toolbar">
          <div className="orders-toolbar-control">
            <button
              type="button"
              className={`orders-tool-btn ${showSortMenu ? "active" : ""}`}
              onClick={() => {
                setShowSortMenu((current) => !current);
                setShowFilterMenu(false);
              }}
            >
              <FontAwesomeIcon icon={faSort} />
              Sort
            </button>
            {showSortMenu && (
              <div className="orders-popover orders-sort-popover">
                <Form.Label>Sort orders by</Form.Label>
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest-first">Newest First</option>
                  <option value="oldest-first">Oldest First</option>
                  <option value="customer-asc">Customer: A to Z</option>
                  <option value="customer-desc">Customer: Z to A</option>
                  <option value="total-asc">Total: Low to High</option>
                  <option value="total-desc">Total: High to Low</option>
                </Form.Select>
              </div>
            )}
          </div>

          <div className="orders-toolbar-control">
            <button
              type="button"
              className={`orders-tool-btn ${
                showFilterMenu || filterOrderStatus || filterPaymentStatus
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setShowFilterMenu((current) => !current);
                setShowSortMenu(false);
              }}
            >
              <FontAwesomeIcon icon={faFilter} />
              Filter
            </button>
            {showFilterMenu && (
              <div className="orders-popover orders-filter-popover">
                <div className="orders-filter-grid">
                  <Form.Group>
                    <Form.Label>Order Status</Form.Label>
                    <Form.Select
                      value={filterOrderStatus}
                      onChange={(e) => setFilterOrderStatus(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Payment Status</Form.Label>
                    <Form.Select
                      value={filterPaymentStatus}
                      onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    >
                      <option value="">All payments</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </Form.Select>
                  </Form.Group>
                </div>
                <button
                  type="button"
                  className="orders-clear-filter"
                  onClick={() => {
                    setFilterOrderStatus("");
                    setFilterPaymentStatus("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="orders-tool-btn orders-export-btn"
            onClick={handleExportExcel}
          >
            <FontAwesomeIcon icon={faFileExcel} />
            Export
          </button>
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
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td className="orders-reference">{order.orderReference}</td>

                  <td>
                    {" "}
                    {order.customerInfo
                      ? `${order.customerInfo.firstName} ${order.customerInfo.lastName}`
                      : "N/A"}
                  </td>

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
                  <strong>
                    {" "}
                    {selectedOrder.customerInfo
                      ? `${selectedOrder.customerInfo.firstName} ${selectedOrder.customerInfo.lastName}`
                      : "N/A"}
                  </strong>
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
