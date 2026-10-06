import { useState } from "react";

export default function Checkout() {
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState("");

  // Customer information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  return (
    <div className="container mt-4">
      <h2>Checkout</h2>

      {/* Customer Information */}
      <h4>Customer Information</h4>

      <div className="mb-3">
        <label className="form-label">Name</label>

        <input
          type="text"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Email</label>

        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Address</label>

        <textarea
          className="form-control"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address"
        />
      </div>

      {/* Payment Method */}
      <h4>Payment Method</h4>

      <div className="mb-2">
        <input
          type="radio"
          name="payment"
          value="COD"
          onChange={(e) => setPaymentMethod(e.target.value)}
        />

        <label className="ms-2">Cash on Delivery</label>
      </div>

      <div className="mb-2">
        <input
          type="radio"
          name="payment"
          value="GCash"
          onChange={(e) => setPaymentMethod(e.target.value)}
        />

        <label className="ms-2">GCash</label>
      </div>

      <div className="mb-3">
        <input
          type="radio"
          name="payment"
          value="Card"
          onChange={(e) => setPaymentMethod(e.target.value)}
        />

        <label className="ms-2">Credit/Debit Card</label>
      </div>

      <button className="btn btn-primary">Place Order</button>
    </div>
  );
}
