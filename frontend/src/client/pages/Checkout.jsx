import { useState, useEffect, useRef } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import "./Checkout.css";

const paymentOptions = [
  { value: "COD", label: "Cash on Delivery (COD)" },
  { value: "GCash", label: "GCash" },
  { value: "Card", label: "Card" },
];

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
    <div className="checkout-page">
      <div className="checkout-containter">
        <p className="checkout-label"> CHECKOUT </p>
        <p className="checkout-title">Almost there</p>

        <div className="checkout-layout">
          <section className="checkout-form-section">
            <h2 className="checkout-section-title">Delivery</h2>

            <Form className="checkout-form">
              {/* First Name & Last Name */}
              <Row className="checkout-row">
                <Col xs={6}>
                  <Form.Control
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="checkout-input"
                  />
                </Col>

                <Col xs={6}>
                  <Form.Control
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="checkout-input"
                  />
                </Col>
              </Row>

              {/* Address */}
              <Form.Control
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                className="checkout-input checkout-address"
                required
              />

              {/* City, Province & ZIP Code */}
              <Row className="checkout-row">
                <Col xs={4}>
                  <Form.Control
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleChange}
                    className="checkout-input"
                    required
                  />
                </Col>

                <Col xs={4}>
                  <Form.Control
                    type="text"
                    name="province"
                    placeholder="Province"
                    value={formData.province}
                    onChange={handleChange}
                    className="checkout-input"
                    required
                  />
                </Col>

                <Col xs={4}>
                  <Form.Control
                    type="text"
                    name="zipCode"
                    placeholder="ZIP code"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className="checkout-input"
                    required
                  />
                </Col>
              </Row>

              {/* Phone & Email */}
              <Row className="checkout-row">
                <Col xs={6}>
                  <Form.Control
                    type="tel"
                    name="phone"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="checkout-input"
                    required
                  />
                </Col>

                <Col xs={6}>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    className="checkout-input"
                    required
                  />
                </Col>
              </Row>

              {/* Payment Method */}
              <h2 className="heckout-section-title payment-title">Payment</h2>

              <div
                className="checkout-payment-dropdown"
                ref={paymentDropdownRef}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsPaymentMenuOpen(false);
                  }
                }}
              >
                <button
                  ref={paymentTriggerRef}
                  type="button"
                  className="checkout-input checkout-payment-trigger"
                  aria-label="Payment method"
                  aria-haspopup="listbox"
                  aria-expanded={isPaymentMenuOpen}
                  aria-controls={
                    isPaymentMenuOpen ? "checkout-payment-options" : undefined
                  }
                  onClick={() => {
                    setActivePaymentIndex(
                      Math.max(
                        0,
                        paymentOptions.findIndex(
                          (option) => option.value === paymentMethod,
                        ),
                      ),
                    );
                    setIsPaymentMenuOpen((open) => !open);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowDown" ||
                      event.key === "ArrowUp" ||
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      setActivePaymentIndex(
                        Math.max(
                          0,
                          paymentOptions.findIndex(
                            (option) => option.value === paymentMethod,
                          ),
                        ),
                      );
                      setIsPaymentMenuOpen(true);
                    }
                  }}
                >
                  <span>
                    {paymentOptions.find(
                      (option) => option.value === paymentMethod,
                    )?.label || "Choose payment method"}
                  </span>
                  <span
                    className="checkout-payment-chevron"
                    aria-hidden="true"
                  />
                </button>
                {isPaymentMenuOpen && (
                  <div
                    id="checkout-payment-options"
                    ref={paymentListboxRef}
                    className="checkout-payment-options"
                    role="listbox"
                    aria-label="Payment method"
                    aria-activedescendant={`checkout-payment-option-${activePaymentIndex}`}
                    tabIndex={0}
                    onKeyDown={handlePaymentMenuKeyDown}
                  >
                    {paymentOptions.map((option, index) => (
                      <div
                        id={`checkout-payment-option-${index}`}
                        key={option.value}
                        className={`checkout-payment-option${
                          paymentMethod === option.value ? " is-selected" : ""
                        }${activePaymentIndex === index ? " is-active" : ""}`}
                        role="option"
                        aria-selected={paymentMethod === option.value}
                        onMouseEnter={() => setActivePaymentIndex(index)}
                        onClick={() => {
                          setPaymentMethod(option.value);
                          setIsPaymentMenuOpen(false);
                          paymentTriggerRef.current?.focus();
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Place Order */}
              <Button
                type="button"
                className="checkout-place-order"
                onClick={handlePayment}
              >
                {paymentMethod === "COD"
                  ? "Place Order"
                  : "Continue to Payment"}
              </Button>

              {/* Check Payment Status */}
              {paymentMethod !== "COD" && (
                <Button
                  type="button"
                  variant="outline-dark"
                  className="checkout-status-button"
                  onClick={checkPaymentStatus}
                >
                  Check Payment Status
                </Button>
              )}
            </Form>
          </section>

          {/* RIGHT: Order summary */}
          <aside className="checkout-order-card">
            <h2 className="checkout-order-title">Your order</h2>

            <div className="checkout-order-items">
              {orderItems.map((item, index) => (
                <div
                  className="checkout-order-item"
                  key={item._id || item.shoeId || index}
                >
                  <div className="checkout-product-image-wrapper">
                    <img
                      src={
                        item.image ||
                        item.imageUrl ||
                        item.img ||
                        "/placeholder-shoe.png"
                      }
                      alt={item.name || "Shoe"}
                      className="checkout-product-image"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder-shoe.png";
                      }}
                    />
                  </div>

                  <div className="checkout-product-details">
                    <p className="checkout-product-name">
                      {item.name || item.shoeName || "Shoe"}
                      {" x "}
                      {item.quantity || 1}
                    </p>

                    <p className="checkout-product-variant">
                      Size: {item.size || "N/A"}
                      {" · "}
                      {item.color || item.brand || ""}
                    </p>
                  </div>

                  <p className="checkout-product-price">
                    P{" "}
                    {(
                      Number(item.price || 0) * Number(item.quantity || 1)
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="checkout-summary-divider" />

            {/* Subtotal */}
            <div className="checkout-summary-row">
              <span>Subtotal</span>
              <strong>
                P{" "}
                {orderItems
                  .reduce(
                    (sum, item) =>
                      sum +
                      Number(item.price || 0) * Number(item.quantity || 1),
                    0,
                  )
                  .toFixed(2)}
              </strong>
            </div>

            {/* Shipping */}
            <div className="checkout-summary-row">
              <span>Shipping Fee</span>
              <strong>Free</strong>
            </div>

            {/* Voucher */}
            <div className="checkout-summary-row">
              <span>Voucher</span>
              <strong></strong>
            </div>

            <div className="checkout-summary-divider checkout-total-divider" />

            {/* Total */}
            <div className="checkout-summary-row checkout-total-row">
              <span>Total</span>
              <strong>
                P{" "}
                {orderItems
                  .reduce(
                    (sum, item) =>
                      sum +
                      Number(item.price || 0) * Number(item.quantity || 1),
                    0,
                  )
                  .toFixed(2)}
              </strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
