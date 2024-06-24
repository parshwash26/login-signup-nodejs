const express = require("express");
const router = express.Router();
const {
  signup,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  resetPassword,
  login,
} = require("../controllers/authController");
const {
  validateSignup,
  validateVerificationCode,
  validateChangePassword,
  validateResetPassword,
  validateLogin,
} = require("../utils/validatorUtils");

router.post("/signup", validateSignup, signup);
router.post("/verify-email", validateVerificationCode, verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);
router.post("/change-password", validateChangePassword, changePassword);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/login", validateLogin, login);

module.exports = router;
