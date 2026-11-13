import { fileTypeFromBuffer } from "file-type";

const validateImage = async (req, res, next) => {
  try {
    // Walang image? Allow muna (optional ang image).
    if (!req.file) {
      return next();
    }

    const fileType = await fileTypeFromBuffer(req.file.buffer);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!fileType || !allowedTypes.includes(fileType.mime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image file. Only JPG, PNG, and WEBP are allowed.",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to validate image file.",
    });
  }
};

export default validateImage;
