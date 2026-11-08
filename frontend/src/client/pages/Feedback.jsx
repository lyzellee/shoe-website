import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Feedback.css";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/create-userfb`;

export default function Feedback() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    if (!comment.trim()) {
      setError("Please enter your feedback.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit feedback.");
      }

      setMessage("Thank you! Your feedback has been submitted.");

      // Reset form after successful submission
      setRating(0);
      setHoverRating(0);
      setComment("");
    } catch (err) {
      console.error("Submit feedback error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="feedback-page">
      <section className="feedback-card">
        <div className="feedback-icon">✦</div>

        <p className="feedback-label">YOUR EXPERIENCE MATTERS</p>

        <h1>We Value Your Feedback!</h1>

        <p className="feedback-description">
          Your thoughts help us make your shopping experience better.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="feedback-rating-section">
            <h3>Rate your experience</h3>

            <div className="feedback-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`feedback-star ${
                    star <= (hoverRating || rating) ? "active" : ""
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${star} out of 5 stars`}
                  aria-pressed={rating === star}
                >
                  ★
                </button>
              ))}
            </div>

            <p className="feedback-rating-text">
              {rating === 0
                ? "Select your rating"
                : rating === 1
                  ? "Poor"
                  : rating === 2
                    ? "Fair"
                    : rating === 3
                      ? "Good"
                      : rating === 4
                        ? "Very Good"
                        : "Excellent"}
            </p>
          </div>

          <div className="feedback-comment-section">
            <label htmlFor="feedback-comment">Share your thoughts</label>

            <textarea
              id="feedback-comment"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={5}
            />

            <div className="feedback-character-count">
              {comment.length}/1000
            </div>
          </div>

          {error && (
            <div className="feedback-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="feedback-success" role="status">
              ✓ {message}
            </div>
          )}

          <button type="submit" className="feedback-submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>

          <button
            type="button"
            className="feedback-close"
            onClick={() => navigate("/")}
          >
            Close
          </button>
        </form>

        <p className="feedback-footer">Thank you for helping us improve!</p>
      </section>
    </main>
  );
}
