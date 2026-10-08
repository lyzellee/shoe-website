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
      const redirectUrl = result.nextAction.redirect.url;
      window.location.href = redirectUrl;
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

      console.log("Payment Status:", result);
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  };

  const params = new URLSearchParams(window.location.search);
  const paymentIntentId = params.get("payment_intent_id");
  console.log("Payment Intent ID:", paymentIntentId);

  const testFetch = async () => {};
  return (
    <div>
      <input type="radio" name="payment" value="COD" /> COD
      <input type="radio" name="payment" value="GCash" /> GCash
      <input type="radio" name="payment" value="Card" /> Card
      <br />
      <button onClick={handlePayment}>Continue Payment</button>
      <button onClick={checkPaymentStatus}>Check Payment Status</button>
    </div>
  );
}
