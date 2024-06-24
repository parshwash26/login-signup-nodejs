const User = require("../models/userModel");
const { validationResult } = require("express-validator");
const {
  generateToken,
  encryptVerificationCode,
  decryptVerificationCode,
} = require("../utils/authUtils");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createTransporter } = require("../utils/commonUtils");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  const { username, email, password } = req.body;
  const service = req.body.service || "default";

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        status: "false",
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    const verificationToken = generateToken(user._id);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const encryptedVerificationCode = encryptVerificationCode(verificationCode);
    user.verificationToken = verificationToken;
    user.verificationCode = encryptedVerificationCode;
    user.service = service;
    await user.save();

    const transporter = createTransporter(service);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Email Verification",
      html: `
        <p>Hello ${user.username},</p>
        <p>Please verify your email by entering the following verification code in the application:</p>
        <p>Verification Code: <strong>${verificationCode}</strong></p>
        <p>This code will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your account will remain inactive.</p>
      `,
    };

    let attempt = 1;
    const maxAttempts = 3;

    const sendMail = () => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(
            `Error sending email (attempt ${attempt}/${maxAttempts}):`,
            error
          );
          if (attempt < maxAttempts) {
            attempt++;
            sendMail();
          } else {
            return res.status(500).json({
              message:
                "Failed to send verification email after multiple attempts. Please try again later.",
            });
          }
        } else {
          res.status(201).json({
            message: "User registered successfully. Verification email sent.",
          });
        }
      });
    };

    sendMail();
  } catch (err) {
    console.error("Error signing up user:", err.message);
    res.status(500).json({
      message: "An error occurred during signup. Please try again later.",
    });
  }
};

exports.resendVerificationEmail = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    if (!user.service) {
      return res
        .status(400)
        .json({ msg: "User service information is missing." });
    }

    const verificationToken = generateToken(user._id);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const encryptedVerificationCode = encryptVerificationCode(verificationCode);

    user.verificationToken = verificationToken;
    user.verificationCode = encryptedVerificationCode;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Email Verification",
      html: `
        <p>Hello ${user.username},</p>
        <p>Please verify your email by entering the following verification code in the application:</p>
        <p>Verification Code: <strong>${verificationCode}</strong></p>
        <p>This code will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your account will remain inactive.</p>
      `,
    };

    const transporter = createTransporter(user.service);
    const maxAttempts = 3;

    const sendMail = (attempt = 1) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(
            `Error sending email (attempt ${attempt}/${maxAttempts}):`,
            error
          );
          if (attempt < maxAttempts) {
            sendMail(attempt + 1);
          } else {
            console.error(
              "Max attempts reached. Failed to send verification email."
            );
            return res
              .status(500)
              .json({ msg: "Error sending verification email." });
          }
        } else {
          res
            .status(200)
            .json({ msg: "Verification email sent successfully." });
        }
      });
    };

    sendMail();
  } catch (err) {
    console.error("Error resending verification email:", err.message);
    res.status(500).json({
      msg: "Failed to resend verification email. Please try again later.",
    });
  }
};

exports.verifyEmail = async (req, res, next) => {
  const { verificationToken, verificationCode } = req.body;

  if (!verificationToken || !verificationCode) {
    return res
      .status(400)
      .json({ msg: "Verification token and code are required." });
  }

  try {
    let decodedToken;
    try {
      decodedToken = jwt.verify(verificationToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Error decoding verification token:", err.message);
      return res.status(400).json({ msg: "Invalid verification token." });
    }

    const userId = decodedToken.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ msg: "Email is already verified." });
    }

    try {
      const decryptedVerificationCode = decryptVerificationCode(
        user.verificationCode
      );

      if (decryptedVerificationCode !== verificationCode.toString()) {
        return res.status(400).json({ msg: "Invalid verification code." });
      }

      user.isVerified = true;
      await user.save();

      return res.status(200).json({ msg: "Email verified successfully." });
    } catch (error) {
      console.error("Error decrypting verification code:", error.message);
      return res
        .status(500)
        .json({ msg: "Failed to verify email. Please try again." });
    }
  } catch (err) {
    console.error("Error verifying email:", err.message);
    return res
      .status(500)
      .json({ msg: "Failed to verify email. Please try again." });
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        msg: "Email not verified. Please verify your email to login.",
      });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) {
          console.error("Error signing JWT:", err.message);
          return res.status(500).json({ msg: "Failed to log in" });
        }
        res.status(200).json({ token });
      }
    );
  } catch (err) {
    console.error("Error logging in user:", err.message);
    res.status(500).json({ msg: "Failed to log in" });
  }
};

exports.changePassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, oldPassword, newPassword } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid old password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ msg: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err.message);
    res.status(500).json({ msg: "Failed to change password" });
  }
};

exports.resetPassword = async (req, res, next) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ msg: "New password and confirm password do not match" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ msg: "Password reset successfully" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ msg: "Reset token has expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ msg: "Invalid reset token" });
    } else {
      console.error("Error resetting password:", err.message);
      res.status(500).json({ msg: "Failed to reset password" });
    }
  }
};
