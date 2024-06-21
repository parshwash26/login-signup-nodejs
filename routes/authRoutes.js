const express = require("express");
const router = express.Router();
const {
  signup,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/authController");
const {
  validateSignup,
  validateVerificationCode,
} = require("../middlewares/validatorMiddleware");

router.post("/signup", validateSignup, signup);
router.post("/verify-email", validateVerificationCode, verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);

module.exports = router;
