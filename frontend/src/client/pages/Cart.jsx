import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Shopping Cart</h2>

      {orders.map((order) =>
        order.items.map((item) => (
          <Card key={item._id} className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5>{item.shoeId.name}</h5>
                  <p className="mb-0">{item.shoeId.brand}</p>
                  <p className="mb-0">₱{item.shoeId.price.toFixed(2)}</p>
                </div>

                <div>
                  <Button variant="outline-secondary">-</Button>

                  <span className="mx-3">{item.quantity}</span>

                  <Button variant="outline-secondary">+</Button>
                </div>

                <div>
                  <h5>₱{(item.shoeId.price * item.quantity).toFixed(2)}</h5>

                  <Button variant="danger" size="sm">
                    Remove
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )),
      )}
    </div>
  );
}
