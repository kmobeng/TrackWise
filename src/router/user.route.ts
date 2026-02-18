const { Router } = require("express");
const { signup, login } = require("../controllers/auth.controller");

const userRoute = Router();

userRoute.post("/signup", signup);
userRoute.post("/login", login);

module.exports = userRoute;
