import UserFeedback from "../models/userFeedback.js";

// CREATE USER FEEDBACK
export const createUserFeedback = async (req, res) => {
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

    const feedback = await UserFeedback.create({
      rating,
      comment,
    });

    return res.status(201).json({
      message: "User feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    console.error("Create user feedback error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// GET ALL USER FEEDBACK
export const getAllUserFeedback = async (req, res) => {
  try {
    const feedback = await UserFeedback.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "User feedback retrieved successfully",
      feedback,
    });
  } catch (err) {
    console.error("Get user feedback error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// DELETE USER FEEDBACK
export const deleteUserFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: "Invalid feedback ID",
      });
    }

    const feedback = await UserFeedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({
        message: "User feedback not found",
      });
    }

    return res.status(200).json({
      message: "User feedback deleted successfully",
    });
  } catch (err) {
    console.error("Delete user feedback error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
