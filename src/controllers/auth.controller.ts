const logger = require("../config/logger.config");
const { signupService, loginService } = require("../services/auth.service");
const { createError } = require("../utils/expense.util");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../model/user.model");

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    logger.info("User signup attempt", { name, email });

    const user = await signupService(name, email, password, passwordConfirm);

    logger.info("User signed up successfully", {
      userId: user._id,
      name: user.name,
      email: user.email,
    });

    const token = user.signToken();

    res.status(201).json({ status: "success", token, data: user });
  } catch (error) {
    logger.error("Signup error", {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
      name: req.body.name,
    });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info("Login attempt", { email });
    if (!email || !password) {
      throw createError(400, "Please provide email and password");
    }
    const user = await loginService(email, password);
    const token = user.signToken();
    user.password = undefined;
    logger.info("Login successful", {
      userId: user._id,
      name: user.name,
      email: user.email,
    });
    res.status(200).json({ status: "success", token, data: user });
  } catch (error) {
    logger.error("Login error", {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
    });
    next(error);
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      logger.warn("No token provided");
      throw createError(401, "You are not logged in. Please log in");
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      logger.warn("User does not exist", { userId: decoded.id });
      throw createError(404, "The user with this token does not exist");
    }
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      logger.warn("Password changed. Please login again", {
        userId: currentUser._id,
        email: currentUser.email,
      });
      throw createError(400, "Password changed. Please login again");
    }

    req.user = currentUser;
    next();
  } catch (error) {
    logger.error("Unauthorized route", { error: error.message });
    next(error);
  }
};
