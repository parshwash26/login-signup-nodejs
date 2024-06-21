const User = require("../models/userModel");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const {
  generateVerificationToken,
  encryptVerificationCode,
  decryptVerificationCode,
} = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const createTransporter = (service) => {
  const commonConfig = {
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };

  let transporter;

  switch (service.toLowerCase()) {
    case "gmail":
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: commonConfig.auth,
      });
      break;
    case "yopmail":
      transporter = nodemailer.createTransport({
        host: "smtp.yopmail.com",
        port: 465,
        secure: true,
        auth: commonConfig.auth,
      });
      break;
    case "yahoo":
      transporter = nodemailer.createTransport({
        service: "yahoo",
        auth: commonConfig.auth,
      });
      break;
    case "outlook":
      transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: commonConfig.auth,
        tls: {
          ciphers: "SSLv3",
        },
      });
      break;
    default:
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === "true",
        auth: commonConfig.auth,
      });
      break;
  }

  transporter.verify((error, success) => {
    if (error) {
      console.error("Error verifying transporter:", error);
    } else {
      console.log("Transporter is ready to send emails");
    }
  });

  return transporter;
};

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  const service = req.body.service || "default";

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    const verificationToken = generateVerificationToken(user._id);
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const encryptedVerificationCode = encryptVerificationCode(verificationCode);
    user.verificationToken = verificationToken;
    user.verificationCode = encryptedVerificationCode;
    user.service = service;
    await user.save();

    console.log({ verificationToken, verificationCode });

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
            return res
              .status(500)
              .json({ msg: "Error sending verification email" });
          }
        } else {
          console.log("Verification email sent:", info.response);
          res
            .status(201)
            .json({ msg: "User registered. Verification email sent." });
        }
      });
    };

    sendMail();
  } catch (err) {
    console.error("Error signing up user:", err.message);
    next(err);
  }
};

exports.resendVerificationEmail = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.service) {
      return res.status(400).json({ msg: "User service information missing" });
    }

    const verificationToken = generateVerificationToken(user._id);
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
            console.error(
              "Max attempts reached. Failed to send verification email."
            );
            return res
              .status(500)
              .json({ msg: "Error sending verification email" });
          }
        } else {
          console.log("Verification email sent:", info.response);
          res.status(200).json({ msg: "Verification email sent successfully" });
        }
      });
    };

    sendMail();
  } catch (err) {
    console.error("Error resending verification email:", err.message);
    res.status(500).json({ msg: "Failed to resend verification email" });
  }
};

exports.verifyEmail = async (req, res, next) => {
  const { verificationToken, verificationCode } = req.body;

  try {
    if (!verificationToken || !verificationCode) {
      return res
        .status(400)
        .json({ msg: "Verification token and code are required" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(verificationToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Error decoding verification token:", err.message);
      return res.status(400).json({ msg: "Invalid verification token" });
    }
    console.log({ decodedToken });
    const userId = decodedToken.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ msg: "Email already verified" });
    }

    try {
      const decryptedVerificationCode = decryptVerificationCode(
        user.verificationCode
      );

      if (decryptedVerificationCode !== verificationCode.toString()) {
        return res.status(400).json({ msg: "Invalid verification code" });
      }

      user.isVerified = true;
      await user.save();

      res.status(200).json({ msg: "Email verified successfully" });
    } catch (error) {
      console.error("Error decrypting verification code:", error.message);
      return res.status(500).json({ msg: "Failed to verify email" });
    }
  } catch (err) {
    console.error("Error verifying email:", err.message);
    res.status(500).json({ msg: "Failed to verify email" });
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

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const { resetToken, resetTokenExpiry } = generateResetToken();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    res.status(200).json({ msg: "Password reset token sent successfully" });
  } catch (err) {
    console.error("Error in forgot password:", err.message);
    res.status(500).json({ msg: "Failed to send password reset token" });
  }
};

exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired reset token" });
    }

    const isTokenValid = validateResetToken(user.resetPasswordExpiry);

    if (!isTokenValid) {
      return res.status(400).json({ msg: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    await user.save();

    res.status(200).json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error("Error in reset password:", err.message);
    res.status(500).json({ msg: "Failed to reset password" });
  }
};
