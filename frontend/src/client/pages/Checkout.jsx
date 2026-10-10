import { useState } from "react";

export default function Checkout() {
  // Dito natin ise-save kung anong payment method ang pinili
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderId, setOrderId] = useState("6ac35bf37a02e2a95afa0bb6"); // Example orderId, dapat galing sa order na ginawa mo

  const handlePayment = async () => {
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
  console.log("Payment Intent ID:", paymentIntentId);

  return (
    <div>
      {" "}
      {/* Piliin ang payment method; ise-save ng onChange ang value */}{" "}
      <label>
        {" "}
        <input
          type="radio"
          name="payment"
          value="COD"
          checked={paymentMethod === "COD"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />{" "}
        COD{" "}
      </label>{" "}
      <label>
        {" "}
        <input
          type="radio"
          name="payment"
          value="GCash"
          checked={paymentMethod === "GCash"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />{" "}
        GCash{" "}
      </label>{" "}
      <label>
        {" "}
        <input
          type="radio"
          name="payment"
          value="Card"
          checked={paymentMethod === "Card"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />{" "}
        Card{" "}
      </label>{" "}
      <br /> <button onClick={handlePayment}> Continue Payment </button>{" "}
      <button onClick={checkPaymentStatus}> Check Payment Status </button>{" "}
    </div>
  );
}
