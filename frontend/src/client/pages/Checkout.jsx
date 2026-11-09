import { useState, useEffect, useRef } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import "./Checkout.css";
import { getCart } from "../../components/AddToCartItems.jsx";
import SuccessfulPayment from "../../components/SuccessfulPayment.jsx";

const paymentOptions = [
  { value: "COD", label: "Cash on Delivery (COD)" },
  { value: "GCash", label: "GCash" },
  { value: "Card", label: "Card" },
];

const SAVED_ADDRESSES_KEY = "savedCheckoutAddresses";

const getCheckoutImage = (item) => {
  const image = item?.image || item?.imageUrl || item?.img;
  if (!image) return "/product-images/product%201.png";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${import.meta.env.VITE_API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

const readSavedAddresses = () => {
  try {
    const addresses = JSON.parse(
      localStorage.getItem(SAVED_ADDRESSES_KEY) || "[]",
    );
    return Array.isArray(addresses) ? addresses : [];
  } catch {
    return [];
  }
};

export default function Checkout() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderItems, setOrderItems] = useState(() => getCart());
  const paymentDropdownRef = useRef(null);
  const paymentTriggerRef = useRef(null);
  const paymentListboxRef = useRef(null);
  const [isPaymentMenuOpen, setIsPaymentMenuOpen] = useState(false);
  const [activePaymentIndex, setActivePaymentIndex] = useState(0);
  const [orderId, setOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
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
  const [savedAddresses, setSavedAddresses] = useState(readSavedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveCurrentAddress, setSaveCurrentAddress] = useState(true);

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

  const selectSavedAddress = (address) => {
    setSelectedAddressId(address.id);
    setFormData({
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      address: address.address || "",
      city: address.city || "",
      province: address.province || "",
      zipCode: address.zipCode || "",
      phone: address.phone || "",
      email: address.email || "",
    });
  };

  // =====================================================
  // STEP 3: CREATE PAYMENT REQUEST
  // =====================================================

  const handlePayment = async () => {
    const {
      firstName,
      lastName,
      address,
      city,
      province,
      zipCode,
      phone,
      email,
    } = formData;
    // STEP 1: Check kung may napiling payment method
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    // STEP 2: Kunin ang cart items sa localStorage
    const savedCart = localStorage.getItem("cart");
    const cartItems = savedCart ? JSON.parse(savedCart) : [];

    // Check kung may laman ang cart
    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (saveCurrentAddress) {
      const addressExists = savedAddresses.some(
        (saved) =>
          saved.address === address &&
          saved.city === city &&
          saved.zipCode === zipCode &&
          saved.phone === phone,
      );

      if (!addressExists) {
        const updatedAddresses = [
          ...savedAddresses,
          {
            id: `address-${Date.now()}`,
            firstName,
            lastName,
            address,
            city,
            province,
            zipCode,
            phone,
            email,
          },
        ];
        localStorage.setItem(
          SAVED_ADDRESSES_KEY,
          JSON.stringify(updatedAddresses),
        );
        setSavedAddresses(updatedAddresses);
      }
    }

    try {
      // STEP 3: Gumawa muna ng order sa MongoDB
      const orderResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Gumawa ng unique order reference
            orderReference: `ORD-${Date.now()}`,
            paymentMethod,

            // I-convert ang cart items sa format na kailangan ng backend
            items: cartItems.map((item) => ({
              shoeId: item._id,
              quantity: item.quantity,
              size: item.size || "",
              color: item.color || item.brand || "",
            })),
          }),
        },
      );

      const orderResult = await orderResponse.json();

      console.log("Create Order Response:", orderResult);

      // Itigil kapag hindi nagtagumpay ang paggawa ng order
      if (!orderResponse.ok) {
        console.error("Create Order Error:", orderResult);
        alert(orderResult.message || "Failed to create order.");
        return;
      }

      // STEP 4: Kunin ang MongoDB order ID
      const newOrderId = orderResult.data._id;

      setOrderId(newOrderId);

      console.log("New Order ID:", newOrderId);
      // STEP 4.1: I-save ang delivery information sa backend
      const informationResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/order-information`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: newOrderId,
            firstName,
            lastName,
            address,
            city,
            province,
            zipCode,
            phone,
            email,
          }),
        },
      );

      const informationResult = await informationResponse.json();

      console.log("Order Information Response:", informationResult);

      // Itigil kung hindi na-save ang customer information
      if (!informationResponse.ok) {
        console.error("Order Information Error:", informationResult);

        alert(
          informationResult.message || "Failed to save delivery information.",
        );
        return;
      }

      const savedOrders = JSON.parse(
        localStorage.getItem("shoeHubOrders") || "[]",
      );
      const localOrder = {
        _id: newOrderId,
        orderReference: orderResult.data.orderReference,
        customerAccessToken: orderResult.customerAccessToken,
        createdAt: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        orderStatus: "pending",
        statusHistory: [
          { status: "pending", changedAt: new Date().toISOString() },
        ],
        paymentStatus: "pending",
        paymentMethod: paymentMethod,
        totalPrice:
          orderResult.data.totalPrice ||
          cartItems.reduce(
            (total, item) =>
              total + Number(item.price || 0) * Number(item.quantity || 1),
            0,
          ),
        customerInfo: {
          firstName,
          lastName,
          address,
          city,
          province,
          zipCode,
          phone,
          email,
        },
        items: cartItems.map((item) => ({
          _id: `${newOrderId}-${item._id}`,
          quantity: Number(item.quantity || 1),
          size: item.size || "",
          color: item.color || item.brand || "",
          price: Number(item.price || 0),
          shoeId: {
            _id: item._id,
            name: item.name,
            brand: item.brand,
            image: item.image || item.imageUrl || item.img,
            price: Number(item.price || 0),
          },
        })),
      };
      localStorage.setItem(
        "shoeHubOrders",
        JSON.stringify([localOrder, ...(Array.isArray(savedOrders) ? savedOrders : [])]),
      );

      // STEP 5: Ipadala ang valid order ID sa payment backend
      const paymentResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: newOrderId,
            paymentMethod: paymentMethod,
          }),
        },
      );

      const paymentResult = await paymentResponse.json();

      console.log("Payment Response:", paymentResult);

      // Check kung may error sa payment
      if (!paymentResponse.ok) {
        console.error("Payment Error:", paymentResult);
        alert(paymentResult.message || "Failed to create payment.");
        return;
      }

      // STEP 6: Pumunta sa PayMongo payment page kung may redirect URL
      const redirectUrl = paymentResult.nextAction?.redirect?.url;

      console.log("Redirect URL:", redirectUrl);

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        console.log("No redirect URL returned by the backend.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Please check your backend.");
    }
  };

  // =====================================================
  // STEP 4: GET PAYMENT STATUS
  // =====================================================

  const checkPaymentStatus = async () => {
    if (!paymentIntentId) {
      console.log("Payment Intent ID is missing");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/payment/${paymentIntentId}`,
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Payment status error:", result);
        return;
      }

      const status = result.data?.attributes?.status;

      console.log("Payment Status:", status);

      if (status === "succeeded") {
        setIsPaymentSuccess(true);
        localStorage.removeItem("cart");
        setOrderItems([]);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePaymentMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsPaymentMenuOpen(false);
      paymentTriggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActivePaymentIndex((index) => (index + 1) % paymentOptions.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActivePaymentIndex(
        (index) => (index - 1 + paymentOptions.length) % paymentOptions.length,
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();

      setPaymentMethod(paymentOptions[activePaymentIndex].value);
      setIsPaymentMenuOpen(false);
      paymentTriggerRef.current?.focus();
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
      {isLoading ? (
        <div className="payment-verification" role="status" aria-live="polite">
          <div className="payment-verification-card">
            <div className="payment-verification-icon" aria-hidden="true">
              <span className="payment-spinner"></span>
              <span className="payment-spinner-dot"></span>
            </div>
            <p className="payment-verification-label">PAYMENT VERIFICATION</p>
            <h2>Checking your payment</h2>
            <p className="payment-verification-copy">
              Please wait while we securely confirm your transaction.
            </p>
            <div className="payment-verification-progress" aria-hidden="true">
              <span></span>
            </div>
            <p className="payment-verification-note">
              Do not close or refresh this page.
            </p>
          </div>
        </div>
      ) : isPaymentSuccess ? (
        <SuccessfulPayment />
      ) : (
        <div className="checkout-containter">
          <button
            type="button"
            className="checkout-back-button"
            aria-label="Back to cart"
            onClick={() => navigate("/cart")}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <p className="checkout-label"> CHECKOUT </p>
          <p className="checkout-title">Almost there</p>

          <div className="checkout-layout">
            <section className="checkout-form-section">
              <h2 className="checkout-section-title">Delivery</h2>

              <Form className="checkout-form">
                {savedAddresses.length > 0 && (
                  <div className="saved-addresses">
                    <div className="saved-addresses-heading">
                      <span>Saved addresses</span>
                      <span>Choose an address</span>
                    </div>
                    {savedAddresses.map((savedAddress) => (
                      <button
                        type="button"
                        key={savedAddress.id}
                        className={`saved-address-option ${
                          selectedAddressId === savedAddress.id
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => selectSavedAddress(savedAddress)}
                      >
                        <strong>
                          {savedAddress.firstName} {savedAddress.lastName}
                        </strong>
                        <span>
                          {savedAddress.address}, {savedAddress.city},{" "}
                          {savedAddress.province} {savedAddress.zipCode}
                        </span>
                        <span>{savedAddress.phone}</span>
                      </button>
                    ))}
                  </div>
                )}

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

                <Form.Check
                  type="checkbox"
                  className="save-address-check"
                  checked={saveCurrentAddress}
                  onChange={(event) =>
                    setSaveCurrentAddress(event.target.checked)
                  }
                  label="Save this address for next time"
                />

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
                        src={getCheckoutImage(item)}
                        alt={item.name || "Shoe"}
                        className="checkout-product-image"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "/product-images/product%201.png";
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
      )}
    </div>
  );
}
