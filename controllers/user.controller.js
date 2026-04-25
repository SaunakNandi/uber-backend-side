const userModel = require("../models/user.model");
const userService = require("../services/user.service");
const rideService = require("../services/ride.service");
const redis = require("../services/redis.service");
const { validationResult } = require("express-validator");
const blackListTokenModel = require("../models/blackListToken.model");
const twilio = require("twilio");
const { default: axios } = require("axios");
const rideModel = require("../models/ride.model");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

module.exports.registerUser = async (req, res) => {
  const { fullname, email, password, mobile } = req.body;
  const isuserExist = await userModel.findOne({ mobile });
  const regex = /^[6-9]\d{9}$/;
  if (isuserExist)
    return res.status(400).json({ message: "User already exist" });
  if (!regex.test(mobile)) {
    return res
      .status(400)
      .json({ message: "Enter a valid 10-digit mobile number" });
  }
  const hashPassword = await userModel.hashPassword(password);
  console.log("mobile ", mobile);
  await redis.set(
    `register:${mobile}`,
    JSON.stringify({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      mobile,
      password: hashPassword,
    }),
    "EX",
    600,
  );
  // await redis.set()
  const otp = Math.floor(100000 + Math.random() * 900000);
  // await client.messages.create({
  //     body: `Your OTP is ${otp}`,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //     to: `+91${mobile}`
  // });
  const otpApi = process.env.TWOFACTOR_API;
  const receiverMobile = `+91${mobile}`;
  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/${otpApi}/SMS/${receiverMobile}/${otp}/OTP1`,
    );
    console.log("otp response ", response);
    if (response.data.Status !== "Success") {
      return res.status(400).json({ message: "Failed to send otp" });
    }
    await redis.set(`otp:${mobile}`, otp, "EX", 300);
    return res.status(200).json({ message: "Otp sent" });
  } catch (error) {
    console.log("Error while sending otp", error);
  }
};
module.exports.verifyLoginOtp = async (req, res) => {
  const { otp, mobile } = req.body;
  console.log(otp, mobile);
  const storedOtp = await redis.get(`otp:${mobile}`);
  const user = await userModel.findOne({ mobile });
  if (!storedOtp) return res.status(400).json({ message: "OTP is expired" });
  if (storedOtp && storedOtp == otp) {
    await redis.del(`otp:${mobile}`);
    const token = user.generateAuthToken();
    res.cookie("token", token);
    return res.status(200).json({ message: "OTP verified", token, user });
  } else return res.status(400).json({ message: "Invalid OTP" });
};
module.exports.verifyOTP = async (req, res) => {
  const { otp, mobile } = req.body;
  const storedOtp = await redis.get(`otp:${mobile}`);
  const temp = await redis.get(`register:${mobile}`);
  const user_data = JSON.parse(temp);
  if (!storedOtp) return res.status(400).json({ message: "OTP is expired" });
  if (storedOtp && storedOtp == otp) {
    // await userModel.findByIdAndUpdate(_id,{mobile})
    const user = await userService.createUser(user_data);
    await redis.del(`otp:${mobile}`);
    await redis.del(`register:${mobile}`);
    const token = user.generateAuthToken();
    res.cookie("token", token);
    res.status(200).json({ message: "OTP verified", token, user });
  } else res.status(400).json({ message: "Invalid OTP" });
};
module.exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() }); // we get withMessage data in errors.array()
  }
  const { mobile } = req.body;

  // since I mentioned select:false for password in userModel I am using +password
  const user = await userModel.findOne({ mobile });
  if (!user)
    return res.status(404).json({ message: "Mobile number not registered" });
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpApi = process.env.TWOFACTOR_API;
  const receiverMobile = `+91${mobile}`;
  try {
    // await client.messages.create({
    //     body: `Your OTP is ${otp}`,
    //     from: process.env.TWILIO_PHONE_NUMBER,
    //     to: `+91${mobile}`
    // });

    const response = await axios.get(
      `https://2factor.in/API/V1/${otpApi}/SMS/${receiverMobile}/${otp}/OTP1`,
    );
    if (response.data.Status !== "Success") {
      return res.status(400).json({ message: "Failed to send otp" });
    }
    // console.log("loginUser ",otp,mobile)
    await redis.set(`otp:${mobile}`, otp, "EX", 300); // expire after 5 min
    // console.log(redis.get(`otp:${mobile}`))
    return res.status(200).json({ message: "OTP sent to you mobile number" });
  } catch (error) {
    console.log("Send OTP error ", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

module.exports.logoutUser = async (req, res, next) => {
  const token = req.cookies.token || req.headers?.authorization.split(" ")[1];
  await blackListTokenModel.create({ token });
  res.clearCookie("token");
  res.status(200).json({ message: "Logged Out" });
};

module.exports.getUserProfile = async (req, res, next) => {
  if (!req.user) return res.status(404).json({ message: "User not found" });

  // we will get req.user value from the response of authUser
  return res.status(200).json(req.user);
};

module.exports.getUserRideDetails = async (req, res, next) => {
  const { page } = req.query;
  const uid=req.user._id
  if (!uid) return res.status(404).json({ message: "user not found for ride" });
  const skip = (page - 1) * 20;

  const rideData = await rideService.getRideDetails(skip, uid);
  console.log("RideData ", rideData);

  if (!rideData.data || rideData.data.length === 0) {
    return res.status(404).json({ message: "No rides found for this user." });
  }

  return res.status(200).json({
    rideData: rideData.data,
    totalPageCount: rideData.count,
    hasMore:!(skip+20)>rideData.count,
  });
};