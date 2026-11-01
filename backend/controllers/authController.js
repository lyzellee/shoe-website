import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // check if login credentials completed
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }
    // find the user using email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    // compare password on hashed password in database
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    // creating JWT toker
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );
    // back to token and user information
    return res.status(200).json({
      message: "Login successfull",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // STEP 1: I-check kung kumpleto ang fields.
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // STEP 2: Payagan lamang ang valid roles.
    if (!["admin", "representative"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }
    // STEP 2.1: Maximum na 2 admin accounts lang.
    if (role === "admin") {
      const adminCount = await User.countDocuments({
        role: "admin",
      });

      if (adminCount >= 2) {
        return res.status(403).json({
          message: "Maximum of 2 admin accounts allowed",
        });
      }
    }

    // STEP 3: Tingnan kung existing na ang email.
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    // STEP 4: I-hash ang password.
    const hashedPassword = await bcrypt.hash(password, 10);

    // STEP 5: Gumawa at mag-save ng account sa MongoDB.
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
