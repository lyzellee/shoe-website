import Table from "react-bootstrap/Table";
import { useState, useEffect } from "react";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderReference, setOrderReference] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [date, setDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [orderId, setOrderId] = useState("");
  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Order Reference</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Status</th>
          <th>Total</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order._id}>
            <td>{order.orderReference}</td>
            <td>{order.customer}</td>
            <td>{order.items?.length || 0}</td>
            <td>{order.orderStatus}</td>
            <td>${order.totalPrice ? order.totalPrice.toFixed(2) : "0.00"}</td>
            <td>{order.orderDate}</td>
            <td>
              <button className="btn btn-sm btn-primary">View</button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
