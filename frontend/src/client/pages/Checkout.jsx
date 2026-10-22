import { useState, useEffect } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

export default function Checkout() {
  // Dito natin ise-save kung anong payment method ang pinili
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderId, setOrderId] = useState("6ad61fa0b20a274adf826d1e"); // Example orderId, dapat galing sa order na ginawa mo
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
    phone: "",
    email: "",
  });
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };
  const handlePayment = async () => {
    // Check if a payment method was selected
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderId, // Assuming you have an orderId to send
          paymentMethod: paymentMethod,
        }),
      });

      const result = await response.json();
      console.log(result);
      if (!response.ok) {
        console.error("Backend Error:", result);
        return;
      }
      const redirectUrl = result.nextAction?.redirect?.url;

      console.log("Redirect URL:", redirectUrl);
      console.log("Next Action:", result.nextAction);

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        console.log("No direct URL:", redirectUrl);
      }
    } catch (error) {
      console.error("Error creating payment:", error);
    }
  };
  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/payment/${paymentIntentId}`,
      );

      const result = await response.json();

      console.log("Payment Status:", result.data?.attributes?.status);
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  };

  // Kunin ang Payment Intent ID mula sa URL
  const params = new URLSearchParams(window.location.search);
  const paymentIntentId = params.get("payment_intent_id");

  // Tingnan kung may nakuha tayong ID
  console.log("Current URL:", window.location.href);
  // Automatically check payment when returning from GCash
  useEffect(() => {
    if (paymentIntentId) {
      checkPaymentStatus();
    }
  }, [paymentIntentId]);
  console.log("Payment Intent ID:", paymentIntentId);

  return (
    <div className="container py-4">
      <h2 className="h4 fw-bold mb-3">Delivery</h2>

      <Form>
        {/* First Name & Last Name */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Control
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>

          <Col md={6} className="mt-2 mt-md-0">
            <Form.Control
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
        </Row>

        {/* Address */}
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            name="address"
            placeholder="Complete Address"
            value={formData.address}
            onChange={handleChange}
            className="rounded-pill bg-light"
          />
        </Form.Group>

        {/* City, Province & ZIP Code */}
        <Row className="mb-3">
          <Col md={4}>
            <Form.Control
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>

          <Col md={4} className="mt-2 mt-md-0">
            <Form.Control
              type="text"
              name="province"
              placeholder="Province"
              value={formData.province}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>

          <Col md={4} className="mt-2 mt-md-0">
            <Form.Control
              type="text"
              name="zipCode"
              placeholder="ZIP Code"
              value={formData.zipCode}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
        </Row>

        {/* Phone & Email */}
        <Row className="mb-4">
          <Col md={6}>
            <Form.Control
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>

          <Col md={6} className="mt-2 mt-md-0">
            <Form.Control
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
        </Row>

        {/* Payment Method */}
        <h2 className="h5 fw-bold mb-3">Payment Method</h2>

        <div className="d-flex flex-wrap gap-4 mb-4">
          <Form.Check
            type="radio"
            name="payment"
            label="Cash on Delivery (COD)"
            value="COD"
            checked={paymentMethod === "COD"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />

          <Form.Check
            type="radio"
            name="payment"
            label="GCash"
            value="GCash"
            checked={paymentMethod === "GCash"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />

          <Form.Check
            type="radio"
            name="payment"
            label="Card"
            value="Card"
            checked={paymentMethod === "Card"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
        </div>

        {/* Place Order */}
        <Button
          type="button"
          className="w-100 rounded-pill btn-dark py-2 mb-3"
          onClick={handlePayment}
        >
          {paymentMethod === "COD" ? "Place Order" : "Continue to Payment"}
        </Button>

        {/* Check Payment Status */}
        {paymentMethod !== "COD" && (
          <Button
            type="button"
            variant="outline-dark"
            className="w-100 rounded-pill py-2"
            onClick={checkPaymentStatus}
          >
            Check Payment Status
          </Button>
        )}
      </Form>
    </div>
  );
}
