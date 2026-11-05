import TesterFeedback from "../models/testerFeedback.js";

// CREATE TESTER FEEDBACK
export const createTesterFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const feedback = await TesterFeedback.create({
      rating,
      comment,
    });

    return res.status(201).json({
      message: "Tester feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    console.error("Create tester feedback error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL TESTER FEEDBACK
export const getAllTesterFeedback = async (req, res) => {
  try {
    const feedback = await TesterFeedback.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tester feedback retrieved successfully",
      feedback,
    });
  } catch (err) {
    console.error("Get tester feedback error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// DELETE TESTER FEEDBACK
export const deleteTesterFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Invalid feedback ID",
      });
    }

    const feedback = await TesterFeedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({
        message: "Tester feedback not found",
      });
    }

    return res.status(200).json({
      message: "Tester feedback deleted successfully",
    });
  } catch (err) {
    console.error("Delete tester feedback error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
