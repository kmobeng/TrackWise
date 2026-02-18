import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const UserSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"] },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  password: {
    type: String,
    min: 8,
    required: [true, "Password is required"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (el: any) {
        return this.password === this.passwordConfirm;
      },
      message: "Password do not match",
    },
  },
  createdAt: { type: Date, default: Date.now },
  passwordChangedAt: Date,
});

UserSchema.pre("save", async function (this:any,next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

UserSchema.methods.correctPassword = async function (
  candidatePassword:string,
  userPassword:string,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

UserSchema.methods.signToken = function () {
  const options: any = {};
  if (process.env.JWT_EXPIRESIN) {
    options.expiresIn = parseInt(process.env.JWT_EXPIRESIN, 10);
  }
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET as string, options);
};

UserSchema.methods.changedPasswordAfter = function (jwtTimestamp:any) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000).toString(),
      10,
    );
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

const User =  mongoose.model("User", UserSchema);

export default User
