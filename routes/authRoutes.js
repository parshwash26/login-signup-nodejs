const express = require("express");
const router = express.Router();
const {
  signup,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  login,
} = require("../controllers/authController");
const {
  validateSignup,
  validateVerificationCode,
  validateForgotPassword,
  validateResetPassword,
  validateLogin,
} = require("../middlewares/validatorMiddleware");

router.post("/signup", validateSignup, signup);
router.post("/verify-email", validateVerificationCode, verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/login", validateLogin, login);

module.exports = router;
