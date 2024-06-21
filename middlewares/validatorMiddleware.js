const { body, validationResult } = require("express-validator");

const validateSignup = [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  handleValidationErrors,
];

const validateVerificationCode = [
  body("verificationToken")
    .notEmpty()
    .withMessage("Verification token is required"),
  body("verificationCode")
    .notEmpty()
    .withMessage("Verification code is required"),
  handleValidationErrors,
];

const validateForgotPassword = [
  body("email").isEmail().normalizeEmail(),
  handleValidationErrors,
];

const validateResetPassword = [
  body("token").notEmpty(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  handleValidationErrors,
];

const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  handleValidationErrors,
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = {
  validateSignup,
  validateVerificationCode,
  validateForgotPassword,
  validateResetPassword,
  validateLogin,
};
