import { useEffect } from "react";

export default function SuccessfulPayment() {
  // Babalik sa home page pagkatapos ng 3 segundo
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/feedback";
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="payment-message">
      <h2>Payment Successful!</h2>
      <p>Thank you for your purchase.</p>
      <p>You will be redirected to the home page shortly...</p>
    </div>
  );
}
