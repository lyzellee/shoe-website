import { useState, useEffect } from "react";
import { Form, Button, Row, Col, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPen,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import "./Checkout.css";
import { getCart } from "../../components/AddToCartItems.jsx";
import SuccessfulPayment from "../../components/SuccessfulPayment.jsx";

const paymentOptions = [
  {
    value: "COD",
    label: "Cash on Delivery (COD)",
    description: "Pay in cash when your order arrives",
  },
  {
    value: "GCash",
    label: "GCash",
    description: "Pay securely with your GCash wallet",
  },
  {
    value: "Card",
    label: "Card",
    description: "Pay with a credit or debit card",
  },
];

const SAVED_ADDRESSES_KEY = "savedCheckoutAddresses";
const DEFAULT_ADDRESS_KEY = "defaultCheckoutAddressId";
const ADDRESS_LABELS = ["Home", "Work", "Other"];

const SERVER_URL = `${import.meta.env.VITE_API_BASE_URL || ""}`.replace(
  /\/api\/?$/,
  "",
);

// TERMS AND POLICIES CONTENT (draft)

const TERMS_SECTIONS = [
  {
    heading: "Privacy Policy",
    blocks: [
      {
        title: "Information we collect",
        text: "When you place an order, we collect your name, delivery address, phone number, and email address, along with the items you ordered and the payment method you chose.",
      },
      {
        title: "How we use it",
        text: "We use your information only to process and deliver your order, to send order updates, and to respond to your concerns.",
      },
      {
        title: "Who we share it with",
        text: "We share only what is needed with our courier partners (to deliver your order) and our payment provider, PayMongo (to process GCash and card payments). We do not sell your personal information. We do not store your card details.",
      },
      {
        title: "Storage and security",
        text: "Your order details are stored in our database. Saved addresses are stored in your own browser on this device, and you can edit or delete them at any time on the checkout page.",
      },
      {
        title: "Your rights",
        text: "Under the Data Privacy Act of 2012 (RA 10173), you may ask to access, correct, or delete your personal information. Contact us at [shoehub@gmail.com].",
      },
    ],
  },
  {
    heading: "Terms and Conditions",
    blocks: [
      {
        title: "Orders and prices",
        text: "All prices are in Philippine pesos (₱). An order is confirmed once it is successfully created in our system. We may cancel an order if an item is out of stock or the details provided are incorrect.",
      },
      {
        title: "Payment",
        text: "You may pay by Cash on Delivery, GCash, or Card. GCash and card payments are processed securely by PayMongo.",
      },
      {
        title: "Shipping and delivery",
        text: "Shipping is currently free. Delivery times are estimates and may vary by location. Please make sure your address and phone number are correct so the courier can reach you.",
      },
      {
        title: "Cancellations",
        text: "You may cancel your order before it is shipped. Contact us at [your email address or phone number] as soon as possible.",
      },
      {
        title: "Returns and refunds",
        text: "You may request a return within [7] days of receiving your order if the item is unused and in its original packaging, or if it arrived damaged or incorrect. Approved refunds are sent through the original payment method within [7–14] business days.",
      },
      {
        title: "Contact us",
        text: "[Shoe Hub] · [shoehub@gmail.com]",
      },
    ],
  },
];

const formatPrice = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getCheckoutImage = (item) => {
  const image = item?.image || item?.imageUrl || item?.img;
  if (!image) return "/product-images/product%201.png";
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("/product-images/")
  ) {
    return image;
  }
  return `${SERVER_URL}${image.startsWith("/") ? "" : "/"}${image}`;
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

const readDefaultAddressId = () => {
  try {
    return localStorage.getItem(DEFAULT_ADDRESS_KEY) || "";
  } catch {
    return "";
  }
};

// Dalawang address ay duplicate kung pareho ang address, city, ZIP, at phone.
const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const isSameAddress = (a, b) =>
  normalize(a.address) === normalize(b.address) &&
  normalize(a.city) === normalize(b.city) &&
  normalize(a.zipCode) === normalize(b.zipCode) &&
  normalize(a.phone) === normalize(b.phone);

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  province: "",
  zipCode: "",
  phone: "",
  email: "",
};

export default function Checkout() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderItems, setOrderItems] = useState(() => getCart());
  const [orderId, setOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  // Delivery information na tina-type ng customer.
  // Bawat property ay katumbas ng isang input field.
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [savedAddresses, setSavedAddresses] = useState(readSavedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveCurrentAddress, setSaveCurrentAddress] = useState(true);

  // Bago: terms modal, saved address management, summary
  const [showTerms, setShowTerms] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [defaultAddressId, setDefaultAddressId] =
    useState(readDefaultAddressId);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [isAddressListOpen, setIsAddressListOpen] = useState(false);
  const [editDefault, setEditDefault] = useState(false);
  const [isAddressPageOpen, setIsAddressPageOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 767.98px)").matches,
  );

  // Alamin kung mobile ang screen (para sa Address Selection page)
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767.98px)");
    const handleQueryChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) setIsAddressPageOpen(false);
    };
    query.addEventListener("change", handleQueryChange);
    return () => query.removeEventListener("change", handleQueryChange);
  }, []);

  // Huwag mag-scroll ang checkout sa likod habang bukas ang Address Selection
  useEffect(() => {
    if (isAddressPageOpen && isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isAddressPageOpen, isMobile]);

  // Mobile: bubukas ang buong page. Desktop: dropdown na listahan.
  const toggleAddressList = () => {
    if (isMobile) {
      setIsAddressPageOpen(true);
    } else {
      setIsAddressListOpen((open) => !open);
    }
  };

  // Address na kasalukuyang napili (ipinapakita sa saved address card)
  const selectedSavedAddress = savedAddresses.find(
    (saved) => saved.id === selectedAddressId,
  );

  // Laman ng isang saved address row (pangalan, label, address, phone)
  const renderAddressContent = (saved) => (
    <>
      <span className="saved-address-top">
        <strong>
          {saved.firstName} {saved.lastName}
        </strong>
        {saved.label && (
          <span className="saved-address-badge">{saved.label}</span>
        )}
        {defaultAddressId === saved.id && (
          <span className="saved-address-badge is-default">Default</span>
        )}
      </span>
      <span>
        {saved.address}, {saved.city}, {saved.province} {saved.zipCode}
      </span>
      <span>{saved.phone}</span>
    </>
  );

  // Order totals (isang beses lang kinukuwenta)
  const subtotal = orderItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );
  const itemCount = orderItems.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0,
  );

  // STEP 2: HANDLE DELIVERY INPUTS

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

  // Tanggalin ang sobrang space kapag umalis sa input
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const trimmed = value.trim();
    if (trimmed !== value) {
      setFormData((previousData) => ({ ...previousData, [name]: trimmed }));
    }
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

  // Awtomatikong piliin ang default address pagbukas ng checkout
  useEffect(() => {
    const defaultAddress = savedAddresses.find(
      (saved) => saved.id === defaultAddressId,
    );
    if (defaultAddress) {
      selectSavedAddress(defaultAddress);
    }
    // Isang beses lang tatakbo pagbukas ng page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SAVED ADDRESS MANAGEMENT

  const persistAddresses = (list) => {
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(list));
    setSavedAddresses(list);
  };

  const useNewAddress = () => {
    setSelectedAddressId("");
    setEditingAddressId("");
    setEditLabel("");
    setAddressMessage("");
    setIsAddressListOpen(false);
    setFormData(EMPTY_FORM);
  };

  const startEditAddress = (address) => {
    selectSavedAddress(address);
    setEditingAddressId(address.id);
    setEditLabel(address.label || "");
    setEditDefault(defaultAddressId === address.id);
    setIsAddressListOpen(false);
    setAddressMessage("");
  };

  const cancelEditAddress = () => {
    setEditingAddressId("");
    setEditLabel("");
    setAddressMessage("");
  };

  const updateSavedAddress = () => {
    const isDuplicate = savedAddresses.some(
      (saved) =>
        saved.id !== editingAddressId && isSameAddress(saved, formData),
    );
    if (isDuplicate) {
      setAddressMessage("This address is already saved.");
      return;
    }

    persistAddresses(
      savedAddresses.map((saved) =>
        saved.id === editingAddressId
          ? { ...saved, ...formData, label: editLabel }
          : saved,
      ),
    );

    if (editDefault) {
      setAsDefaultAddress(editingAddressId);
    } else if (defaultAddressId === editingAddressId) {
      localStorage.removeItem(DEFAULT_ADDRESS_KEY);
      setDefaultAddressId("");
    }

    cancelEditAddress();
  };

  const deleteSavedAddress = (id) => {
    if (!window.confirm("Delete this saved address?")) return;

    persistAddresses(savedAddresses.filter((saved) => saved.id !== id));

    if (defaultAddressId === id) {
      localStorage.removeItem(DEFAULT_ADDRESS_KEY);
      setDefaultAddressId("");
    }
    if (selectedAddressId === id) setSelectedAddressId("");
    if (editingAddressId === id) cancelEditAddress();
  };

  const setAsDefaultAddress = (id) => {
    localStorage.setItem(DEFAULT_ADDRESS_KEY, id);
    setDefaultAddressId(id);
  };

  // Mga aksyon sa Address Selection page (mobile)
  const selectFromAddressPage = (saved) => {
    selectSavedAddress(saved);
    setIsAddressPageOpen(false);
  };

  const editFromAddressPage = (saved) => {
    startEditAddress(saved);
    setIsAddressPageOpen(false);
  };

  const addNewFromAddressPage = () => {
    useNewAddress();
    setIsAddressPageOpen(false);
  };

  // STEP 3: CREATE PAYMENT REQUEST

  const handlePayment = async () => {
    if (isLoading) return;

    setIsLoading(true);
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
        JSON.stringify([
          localOrder,
          ...(Array.isArray(savedOrders) ? savedOrders : []),
        ]),
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
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 4: GET PAYMENT STATUS

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

  // STEP 5: GET PAYMENT INTENT ID FROM RETURN URL

  // Halimbawa ng URL:
  // http://localhost:5173/checkout?payment_intent_id=pi_123
  //
  // Kinukuha ang query parameter na payment_intent_id.
  // Hindi ito ang orderId; magkaibang identifier ang dalawa.
  const params = new URLSearchParams(window.location.search);
  const paymentIntentId = params.get("payment_intent_id");

  console.log("Current URL:", window.location.href);
  console.log("Payment Intent ID:", paymentIntentId);

  // STEP 6: CHECK STATUS AFTER RETURNING TO CHECKOUT

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

  // STEP 7: DISPLAY CHECKOUT FORM

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
                    </div>

                    {/* Napiling address + > button para buksan ang listahan */}
                    <div
                      className={`saved-address-option saved-address-row ${
                        selectedSavedAddress ? "selected" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="saved-address-select"
                        onClick={toggleAddressList}
                      >
                        {selectedSavedAddress ? (
                          renderAddressContent(selectedSavedAddress)
                        ) : (
                          <span className="saved-address-placeholder">
                            Choose a saved address
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className={`saved-address-toggle${
                          isAddressListOpen ? " is-open" : ""
                        }`}
                        aria-label="Show saved addresses"
                        aria-expanded={isAddressListOpen}
                        onClick={toggleAddressList}
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>

                    {/* Listahan ng lahat ng saved address, may Edit sa kanan */}
                    {isAddressListOpen && (
                      <div className="saved-address-list">
                        {savedAddresses.map((savedAddress) => (
                          <div
                            key={savedAddress.id}
                            className={`saved-address-option saved-address-row ${
                              selectedAddressId === savedAddress.id
                                ? "selected"
                                : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="saved-address-select"
                              onClick={() => {
                                selectSavedAddress(savedAddress);
                                setIsAddressListOpen(false);
                              }}
                            >
                              {renderAddressContent(savedAddress)}
                            </button>
                            <button
                              type="button"
                              className="saved-address-edit"
                              aria-label="Edit address"
                              onClick={() => startEditAddress(savedAddress)}
                            >
                              <FontAwesomeIcon icon={faPen} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="saved-addresses-new"
                          onClick={useNewAddress}
                        >
                          Use a new address
                        </button>
                      </div>
                    )}
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
                      onBlur={handleBlur}
                      autoComplete="given-name"
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
                      onBlur={handleBlur}
                      autoComplete="family-name"
                      className="checkout-input"
                    />
                  </Col>
                </Row>

                {/* Address */}
                <div>
                  <Form.Control
                    type="text"
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="street-address"
                    className="checkout-input checkout-address"
                  />
                </div>

                {/* City, Province & ZIP Code */}
                <Row className="checkout-row">
                  <Col xs={4}>
                    <Form.Control
                      type="text"
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="address-level2"
                      className="checkout-input"
                    />
                  </Col>

                  <Col xs={4}>
                    <Form.Control
                      type="text"
                      name="province"
                      placeholder="Province"
                      value={formData.province}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="address-level1"
                      className="checkout-input"
                    />
                  </Col>

                  <Col xs={4}>
                    <Form.Control
                      type="text"
                      name="zipCode"
                      placeholder="ZIP code"
                      value={formData.zipCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      className="checkout-input"
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
                      onBlur={handleBlur}
                      inputMode="numeric"
                      autoComplete="tel"
                      className="checkout-input"
                    />
                  </Col>

                  <Col xs={6}>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="email"
                      className="checkout-input"
                    />
                  </Col>
                </Row>

                {editingAddressId ? (
                  <div className="saved-address-editor">
                    <p className="saved-address-editor-title">
                      Editing a saved address
                    </p>
                    <Form.Select
                      value={editLabel}
                      onChange={(event) => setEditLabel(event.target.value)}
                      className="checkout-input saved-address-label-select"
                      aria-label="Address label"
                    >
                      <option value="">No label</option>
                      {ADDRESS_LABELS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Check
                      type="checkbox"
                      className="save-address-check"
                      checked={editDefault}
                      onChange={(event) => setEditDefault(event.target.checked)}
                      label="Set as default address"
                    />
                    {addressMessage && (
                      <p className="checkout-field-message">{addressMessage}</p>
                    )}
                    <div className="saved-address-editor-buttons">
                      <Button
                        type="button"
                        className="saved-address-save"
                        onClick={updateSavedAddress}
                      >
                        Update address
                      </Button>
                      <Button
                        type="button"
                        variant="outline-dark"
                        className="saved-address-cancel"
                        onClick={cancelEditAddress}
                      >
                        Cancel
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="saved-address-delete"
                      onClick={() => deleteSavedAddress(editingAddressId)}
                    >
                      Delete this address
                    </button>
                  </div>
                ) : (
                  <Form.Check
                    type="checkbox"
                    className="save-address-check"
                    checked={saveCurrentAddress}
                    onChange={(event) =>
                      setSaveCurrentAddress(event.target.checked)
                    }
                    label="Save this address for next time"
                  />
                )}

                {/* Payment Method (radio buttons) */}
                <h2 className="checkout-section-title payment-title">
                  Payment
                </h2>

                <div
                  className="checkout-payment-group"
                  role="radiogroup"
                  aria-label="Payment method"
                >
                  {paymentOptions.map((option) => {
                    const isSelected = paymentMethod === option.value;

                    return (
                      <label
                        key={option.value}
                        className={`checkout-payment-option${
                          isSelected ? " is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.value}
                          checked={isSelected}
                          onChange={() => setPaymentMethod(option.value)}
                        />
                        <span className="checkout-radio" aria-hidden="true" />
                        <span className="checkout-payment-text">
                          <span className="checkout-payment-label">
                            {option.label}
                          </span>
                          <span className="checkout-payment-desc">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Terms and Policies (link na nagbubukas ng modal) */}
                <p className="checkout-terms-note">
                  By continuing, you agree to our{" "}
                  <button
                    type="button"
                    className="checkout-privacy-link"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms and Policies
                  </button>
                  .
                </p>

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
            <aside
              className={`checkout-order-card${isSummaryOpen ? " is-open" : ""}`}
            >
              {/* Toggle: lalabas lang sa tablet at mobile */}
              <button
                type="button"
                className="checkout-summary-toggle"
                aria-expanded={isSummaryOpen}
                onClick={() => setIsSummaryOpen((open) => !open)}
              >
                <span>{isSummaryOpen ? "Hide" : "Show"} order summary</span>
                <strong>{formatPrice(subtotal)}</strong>
              </button>

              <div className="checkout-order-body">
                <div className="checkout-order-head">
                  <h2 className="checkout-order-title">
                    Your order
                    <span className="checkout-order-count">
                      {" "}
                      ({itemCount} {itemCount === 1 ? "item" : "items"})
                    </span>
                  </h2>
                  <button
                    type="button"
                    className="checkout-edit-cart"
                    onClick={() => navigate("/cart")}
                  >
                    Edit cart
                  </button>
                </div>

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
                        {formatPrice(
                          Number(item.price || 0) * Number(item.quantity || 1),
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="checkout-summary-divider" />

                {/* Subtotal */}
                <div className="checkout-summary-row">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
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
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ADDRESS SELECTION PAGE (mobile lang) */}
      {isAddressPageOpen && isMobile && (
        <div
          className="address-page"
          role="dialog"
          aria-modal="true"
          aria-label="Address selection"
        >
          <header className="address-page-header">
            <button
              type="button"
              className="address-page-back"
              aria-label="Back to checkout"
              onClick={() => setIsAddressPageOpen(false)}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h2 className="address-page-title">Address Selection</h2>
          </header>

          <div className="address-page-label">Address</div>

          <div
            className="address-page-list"
            role="radiogroup"
            aria-label="Saved addresses"
          >
            {savedAddresses.map((saved) => {
              const isSelected = selectedAddressId === saved.id;
              return (
                <div className="address-page-item" key={saved.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className="address-page-select"
                    onClick={() => selectFromAddressPage(saved)}
                  >
                    <span
                      className={`address-page-radio${
                        isSelected ? " is-selected" : ""
                      }`}
                      aria-hidden="true"
                    />
                    <span className="address-page-info">
                      <span className="address-page-name-row">
                        <strong className="address-page-name">
                          {saved.firstName} {saved.lastName}
                        </strong>
                        <span className="address-page-phone">
                          {saved.phone}
                        </span>
                      </span>
                      <span className="address-page-line">{saved.address}</span>
                      <span className="address-page-line">
                        {saved.city}, {saved.province} {saved.zipCode}
                      </span>
                      {(defaultAddressId === saved.id || saved.label) && (
                        <span className="address-page-badges">
                          {defaultAddressId === saved.id && (
                            <span className="address-page-badge is-default">
                              Default
                            </span>
                          )}
                          {saved.label && (
                            <span className="address-page-badge">
                              {saved.label}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="address-page-edit"
                    onClick={() => editFromAddressPage(saved)}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>

          <div className="address-page-footer">
            <button
              type="button"
              className="address-page-add"
              onClick={addNewFromAddressPage}
            >
              <FontAwesomeIcon icon={faPlus} /> Add a new address
            </button>
          </div>
        </div>
      )}

      {/* TERMS AND POLICIES MODAL */}
      <Modal
        show={showTerms}
        onHide={() => setShowTerms(false)}
        centered
        scrollable
        size="lg"
        dialogClassName="terms-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Terms and Policies</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {TERMS_SECTIONS.map((section) => (
            <section key={section.heading} className="terms-section">
              <h3 className="terms-heading">{section.heading}</h3>
              {section.blocks.map((block) => (
                <div key={block.title} className="terms-block">
                  <h4>{block.title}</h4>
                  <p>{block.text}</p>
                </div>
              ))}
            </section>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            className="terms-close-button"
            onClick={() => setShowTerms(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
