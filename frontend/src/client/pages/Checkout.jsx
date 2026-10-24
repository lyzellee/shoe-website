import { useState, useEffect } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";

export default function Checkout() {
  // =====================================================
  // STEP 1: STATES
  // =====================================================

  // Dito naka-save ang payment method na pinili ng customer.
  // Possible values: "", "COD", "GCash", "Card".
  const [paymentMethod, setPaymentMethod] = useState("");

  // ID ng order na babayaran.
  // NOTE: Example ID lang ito. Sa actual application,
  // dapat manggaling ito sa order na ginawa ng customer.
  const [orderId, setOrderId] = useState("");

  // Delivery information na tina-type ng customer.
  // Bawat property ay katumbas ng isang input field.
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

  // =====================================================
  // STEP 2: HANDLE DELIVERY INPUTS
  // =====================================================

  // Tumatakbo kapag may binago ang customer sa input.
  const handleChange = (e) => {
    // name = pangalan ng input
    // value = value na kasalukuyang inilagay ng customer
    const { name, value } = e.target;

    // Gumagawa ng bagong formData object.
    // ...previousData = pinapanatili ang ibang fields.
    // [name]: value = ina-update lang ang field na binago.
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // =====================================================
  // STEP 3: CREATE PAYMENT REQUEST
  // =====================================================

  const handlePayment = async () => {
    // Check muna kung pumili ng payment method.
    // Kapag walang pinili, ititigil ang function.
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    try {
      // Ipapadala ang request sa backend.
      // Ang backend route na ito ay dapat naka-connect
      // sa createPayment controller.
      const response = await fetch("http://localhost:5000/api/payment", {
        method: "POST",

        // Sinasabi sa backend na JSON ang request body.
        headers: {
          "Content-Type": "application/json",
        },

        // Ginagawang JSON string ang data na ipapadala.
        // orderId = order na babayaran.
        // paymentMethod = piniling paraan ng pagbabayad.
        body: JSON.stringify({
          orderId: orderId,
          paymentMethod: paymentMethod,
        }),
      });

      // Kino-convert ang JSON response ng backend
      // para magamit natin ang values nito sa JavaScript.
      const result = await response.json();

      // Ipinapakita ang buong response sa browser console.
      // Useful ito sa debugging.
      console.log(result);

      // Kapag error ang HTTP response, huwag nang mag-redirect.
      if (!response.ok) {
        console.error("Backend Error:", result);
        return;
      }

      // Kinukuha ang redirect URL mula sa response ng backend.
      // Ang backend naman ay kumukuha nito mula sa PayMongo.
      const redirectUrl = result.nextAction?.redirect?.url;

      console.log("Redirect URL:", redirectUrl);
      console.log("Next Action:", result.nextAction);

      // Kapag may valid redirect URL, dadalhin ang customer
      // sa payment page na ibinigay ng PayMongo.
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        // Walang redirect URL: huwag mag-assume na successful
        // ang payment. Tingnan muna ang status at response.
        console.log("No direct URL:", redirectUrl);
      }
    } catch (error) {
      // Halimbawa: hindi tumatakbo ang backend,
      // may network problem, o hindi mabasa ang response.
      console.error("Error creating payment:", error);
    }
  };

  // =====================================================
  // STEP 4: GET PAYMENT STATUS
  // =====================================================

  const checkPaymentStatus = async () => {
    // Kailangan ang Payment Intent ID para malaman
    // kung aling payment attempt ang titingnan.
    // Kung walang ID, walang sapat na impormasyon para
    // tawagin ang payment status endpoint.
    if (!paymentIntentId) {
      console.log("Payment Intent ID is missing");
      return;
    }

    try {
      // Humihiling sa backend na kunin ang status ng
      // payment intent mula sa PayMongo.
      const response = await fetch(
        `http://localhost:5000/api/payment/${paymentIntentId}`,
      );

      const result = await response.json();

      // Ipinapakita ang status sa browser console.
      // Ang actual status ay manggagaling sa PayMongo response.
      console.log("Payment Status:", result.data?.attributes?.status);

      // NOTE:
      // Sa kasalukuyang code, hindi pa natin ina-update
      // ang UI para magpakita ng success/failure message.
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  };

  // =====================================================
  // STEP 5: GET PAYMENT INTENT ID FROM RETURN URL
  // =====================================================

  // Halimbawa ng URL:
  // http://localhost:5173/checkout?payment_intent_id=pi_123
  //
  // Kinukuha ang query parameter na payment_intent_id.
  // Hindi ito ang orderId; magkaibang identifier ang dalawa.
  const params = new URLSearchParams(window.location.search);
  const paymentIntentId = params.get("payment_intent_id");

  console.log("Current URL:", window.location.href);
  console.log("Payment Intent ID:", paymentIntentId);

  // =====================================================
  // STEP 6: CHECK STATUS AFTER RETURNING TO CHECKOUT
  // =====================================================

  useEffect(() => {
    // Kapag may Payment Intent ID sa URL,
    // tatawagin ang checkPaymentStatus().
    if (paymentIntentId) {
      checkPaymentStatus();
    }

    // Tatakbo ulit ang effect kapag nagbago ang ID.
    // NOTE: Sa development, maaaring tumakbo nang higit
    // sa isang beses dahil sa React Strict Mode.
  }, [paymentIntentId]);

  // =====================================================
  // STEP 7: DISPLAY CHECKOUT FORM
  // =====================================================

  return (
    <div className="container py-4">
      <h2 className="h4 fw-bold mb-3">Delivery</h2>

      <Form>
        {/* FIRST NAME AND LAST NAME */}
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

        {/* COMPLETE DELIVERY ADDRESS */}
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

        {/* CITY, PROVINCE, AND ZIP CODE */}
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

        {/* PHONE NUMBER AND EMAIL */}
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

        {/* PAYMENT METHOD SELECTION */}
        <h2 className="h5 fw-bold mb-3">Payment Method</h2>

        <div className="d-flex flex-wrap gap-4 mb-4">
          {/* COD = Cash on Delivery */}
          <Form.Check
            type="radio"
            name="payment"
            label="Cash on Delivery (COD)"
            value="COD"
            checked={paymentMethod === "COD"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />

          {/* GCash = payment method currently accepted
              by your createPayment backend */}
          <Form.Check
            type="radio"
            name="payment"
            label="GCash"
            value="GCash"
            checked={paymentMethod === "GCash"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />

          {/* Card is displayed in the UI, but your current
              backend rejects it because only GCash is supported. */}
          <Form.Check
            type="radio"
            name="payment"
            label="Card"
            value="Card"
            checked={paymentMethod === "Card"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
        </div>

        {/* BUTTON TO START THE PAYMENT FLOW */}
        <Button
          type="button"
          className="w-100 rounded-pill btn-dark py-2 mb-3"
          onClick={handlePayment}
        >
          {paymentMethod === "COD" ? "Place Order" : "Continue to Payment"}
        </Button>

        {/* MANUAL PAYMENT STATUS CHECK */}
        {/* Sa kasalukuyang backend, COD at Card ay hindi
            supported ng createPayment. */}
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
