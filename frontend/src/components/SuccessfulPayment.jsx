import { useEffect } from "react";

export default function SuccessfulPayment() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/feedback";
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="payment-success" role="status" aria-live="polite">
      <div className="payment-success-card">
        <div className="payment-success-icon" aria-hidden="true">
          <span>✓</span>
        </div>
        <p className="payment-success-label">PAYMENT CONFIRMED</p>
        <h2>Payment Successful!</h2>
        <p className="payment-success-copy">
          Thank you for your purchase. Your order has been confirmed.
        </p>
        <div className="payment-success-progress" aria-hidden="true">
          <span></span>
        </div>
        <p className="payment-success-note">
          Taking you to share your experience...
        </p>
      </div>
    </div>
  );
}
