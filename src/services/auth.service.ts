const User = require("../model/user.model");
const { createError } = require("../utils/expense.util");
const bcrypt = require("bcrypt");

exports.signupService = async (name, email, password, passwordConfirm) => {
  try {
    const user = await User.create({ name, email, password, passwordConfirm });

    if (!user) {
      throw createError(400, "Unable to create user");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

exports.loginService = async (email, password) => {
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw createError(404, "Incorrect email or password");
    }
    return user;
  } catch (error) {
    throw error;
  }
};
