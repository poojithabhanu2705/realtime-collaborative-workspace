const { body, param } = require("express-validator");
const { validationResult } = require("express-validator");

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`[VALIDATION] Failure for ${req.originalUrl}:`, errors.array());
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Auth validations
const signupRules = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Must be a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Must be a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Document validations
const createDocRules = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters"),
];

const renameDocRules = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be 1-200 characters"),
];

const inviteRules = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Must be a valid email address"),
  body("role")
    .optional()
    .isIn(["editor", "viewer"])
    .withMessage("Role must be editor or viewer"),
];

const permissionRules = [
  body("userId").isMongoId().withMessage("Invalid user ID"),
  body("role")
    .isIn(["editor", "viewer"])
    .withMessage("Role must be editor or viewer"),
];

const shareLinkRules = [
  body("role")
    .optional()
    .isIn(["editor", "viewer"])
    .withMessage("Role must be editor or viewer"),
  body("expiryHours")
    .optional()
    .isInt({ min: 1, max: 720 })
    .withMessage("Expiry must be 1-720 hours"),
];

module.exports = {
  validate,
  signupRules,
  loginRules,
  createDocRules,
  renameDocRules,
  inviteRules,
  permissionRules,
  shareLinkRules,
};
