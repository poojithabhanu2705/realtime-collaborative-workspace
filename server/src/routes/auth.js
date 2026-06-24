const express = require("express");
const { signup, login, refreshToken, logout } = require("../controllers/authController");
const { signupRules, loginRules, validate } = require("../middleware/validation");
const router = express.Router();

router.post("/signup", signupRules, validate, signup);
router.post("/login", loginRules, validate, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

module.exports = router;
