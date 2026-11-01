import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // Kunin ang token mula sa Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // I-verify ang token gamit ang JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ilagay ang user information sa request
    req.user = decoded;

    // Ituloy sa susunod na middleware o controller
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // check if authenticated user
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized. Please Log in. ",
      });
    }
    // check if pinapayagan and role ng user
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden. You do not have permission",
      });
    }
    next();
  };
};
