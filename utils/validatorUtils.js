const { body, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

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

const validateChangePassword = [
  body("email").isEmail().withMessage("Invalid email"),
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
  handleValidationErrors,
];

const validateResetPassword = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("New password and confirm password do not match");
      }
      return true;
    }),
  handleValidationErrors,
];

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

module.exports = {
  validateSignup,
  validateVerificationCode,
  validateChangePassword,
  validateResetPassword,
  validateLogin,
};
