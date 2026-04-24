const captainModel=require('../models/captain.model')
const captainService=require('../services/captain.service')
const {validationResult}=require('express-validator')
const blackListTokenModel=require('../models/blackListToken.model')
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const redis=require('../services/redis.service')
const { default: axios } = require('axios')
module.exports.registerCaptain=async(req,res,next)=>{
    const {fullname,email,password,vehicle,mobile}=req.body
    
    const isCapatainExist=await captainModel.findOne({mobile})
    if(isCapatainExist)
        return res.status(400).json({message:"Captain already exist"})

    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(mobile)) {
        return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    }
    const hashPassword=await captainModel.hashPassword(password)
    console.log("Good till here")
    // console.log(captain)
    await redis.set(`register:${mobile}`,JSON.stringify({
        firstname:fullname.firstname,
        lastname:fullname.lastname,
        email,
        mobile,
        password:hashPassword,
        color:vehicle.color,
        plate:vehicle.plate,
        capacity:vehicle.capacity,
        vehicleType:vehicle.vehicleType
    }),'EX', 600)
    // await redis.set()
    const otpApi=process.env.TWOFACTOR_API
    const receiverMobile=`+91${mobile}`
    try {
        const response=await axios.get(`https://2factor.in/API/V1/${otpApi}/SMS/${receiverMobile}/${otp}/OTP1`)
        if(response.data.Status !== 'Success')
        {
            return res.status(400).json({message:'Failed to send otp'})
        }
        await redis.set(`otp:${mobile}`,otp,'EX',300)
        return res.status(200).json({message:'Otp sent'})
    } catch (error) {
        console.log("Error while sending otp",error)
    }
}
module.exports.verifyLoginOtp=async(req,res)=>{
    const {mobile,otp}=req.body
    const storedOtp=await redis.get(`otp:${mobile}`)
    if(!storedOtp) return res.status(400).json({message:'OTP is expired'})
    if(storedOtp && storedOtp==otp) 
    {
        const captain=await captainModel.findOne({mobile})
        await redis.del(`otp:${mobile}`)
        const token=captain.generateAuthToken()
        res.cookie('token',token)
        return res.status(200).json({message:'OTP verified',token,captain})
    }
    else return res.status(400).json({ message: 'Invalid OTP' })
}
module.exports.verifyOTP=async(req,res)=>{
    const {otp,mobile}=req.body
    const storedOtp=await redis.get(`otp:${mobile}`)
    const temp=await redis.get(`register:${mobile}`)
    const captain_data=JSON.parse(temp)
    if(!storedOtp) return res.status(400).json({message:'OTP is expired'})
    if(storedOtp && storedOtp==otp) 
    {
        const captain=await captainService.createCaptain(captain_data)
        await redis.del(`otp:${mobile}`)
        await redis.del(`regsiter:${mobile}`)
        const token=captain.generateAuthToken()        
        res.cookie('token',token)
        return res.status(200).json({message:'OTP verified',token,captain})
    }
    else res.status(400).json({ message: 'Invalid OTP' });
}
module.exports.loginCaptain=async(req,res)=>{
    // const errors=validationResult(req)
    // if(!errors.isEmpty()){
    //     return res.status(400).json({errors:errors.array()})  // we get withMessage data in errors.array()
    // }
    const {mobile}=req.body
    
    // since I mentioned select:false for password in userModel I am using +password
    const captain=await captainModel.findOne({mobile})
    if(!captain) return res.status(404).json({message:"Mobile number not registered"})
    const otp=Math.floor(100000+Math.random()*900000)
    const otpApi=process.env.TWOFACTOR_API
    const receiverMobile=`+91${mobile}`
    try {
        const response=await axios.get(`https://2factor.in/API/V1/${otpApi}/SMS/${receiverMobile}/${otp}/OTP1`)
        if(response.data.Status !== 'Success')
        {
            return res.status(400).json({message:'Failed to send otp'})
        }
        console.log("loginUser ",otp,mobile)
        await redis.set(`otp:${mobile}`,otp,'EX',300) // expire after 5 min
        return res.status(200).json({message:"OTP sent to you mobile number"})
    } catch (error) {
        console.log("Send OTP error ",error)
        return res.status(500).json({ message: 'Failed to send OTP' });
    }

}

module.exports.getCaptainProfile=async(req,res)=>{
    if (!req.captain) {
        return res.status(404).json({ message: 'Captain not found' });
    }
    res.status(200).json({captain:req.captain})
}

module.exports.logoutCaptain=async(req,res,next)=>{
    const token= req.cookies.token || req.headers?.authorization.split(' ')[1]
    await blackListTokenModel.create({token})
    res.clearCookie('token')
    res.status(200).json({message:'Logged Out'})
}