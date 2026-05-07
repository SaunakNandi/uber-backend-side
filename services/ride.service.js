const rideModel=require('../models/ride.model');
const { sendMessageToSocketId } = require('../socket');
const mapService=require('./maps.service')
const crypto = require('crypto');
async function getFare(pickup,destination){
    if(!pickup || !destination)
        throw new Error('Pickup and Destination are required')
    const distanceTime=await mapService.getDistance_and_Time(pickup,destination)
    const baseFare = {
        auto: 10,
        car: 50,
        moto: 20
    };

    const perKmRate = {
        auto: 10,
        car: 40,
        moto: 20
    };

    const fare = {
        auto: Math.round(baseFare.auto + ((distanceTime.distance.value / 1000) * perKmRate.auto)),
        car: Math.round(baseFare.car + ((distanceTime.distance.value / 1000) * perKmRate.car)),
        moto: Math.round(baseFare.moto + ((distanceTime.distance.value / 1000) * perKmRate.moto))
    };
    return fare
}

function getOTP(num){
    const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
    return otp;
}
module.exports.getFare=getFare
module.exports.createRide=async({user,pickup,destination,vehicleType})=>{
    if(!user || !pickup || !destination || !vehicleType)
        throw new Error('All fields are required')
    const fare=await getFare(pickup,destination)
    const {distance}=await mapService.getDistance(pickup,destination)
    console.log("distance",distance)
    const ride=rideModel.create({
        user,
        pickup,
        destination,
        distance,
        fare:fare[vehicleType],
        otp:getOTP(6)
    })
    return ride
}

module.exports.confirmRide=async({rideId,captain})=>{
    if(!rideId)
        throw new Error('Ride id is required')
    console.log("Ride id ",rideId)
    const updateride=await rideModel.findOneAndUpdate({_id:rideId},{status:'accepted',captain:captain._id},
        { returnDocument: 'after'})
    console.log("Update ride ",updateride)
    const ride=await rideModel.findOne({
        _id:rideId
    }).populate('captain').populate('user').select('+otp')
    console.log("Ride ",ride)
    if(!ride) throw new Error('Ride not found')
    return ride
}

module.exports.startRide=async({rideId,otp})=>{
    if(!rideId || !otp)
        throw new Error('Ride id and OTP is required')
    const ride=await rideModel.findOne({_id:rideId}).populate('user').populate('captain').select('+otp')

    if(!ride) throw new Error('Ride not found')
    if(ride.status!=='accepted') throw new Error('Ride not accepted yet')
    if(ride.otp!=otp) throw new Error('Invalid OTP')
    
    await rideModel.findOneAndUpdate({_id:rideId},{
        status:'ongoing',
    })
    return ride
}

module.exports.endRide=async({rideId,captain})=>{
    if(!rideId)
        throw new Error('Ride id and OTP is required')
    const ride=await rideModel.findOne({
        _id:rideId,
        captain:captain._id
    }).populate('user').populate('captain').select('+otp')

    if(!ride) throw new Error('Ride not found')
    if(ride.status!=='ongoing') throw new Error('Ride not ongoing')
    const dateNow=new Date()
    await rideModel.findOneAndUpdate({_id:rideId},{status:'completed',completedOn:dateNow})
    return ride
}

module.exports.getRideDetails=async(skip,userId)=>{
    const data=await rideModel.find({user:userId,status:"completed"}).populate('captain','fullname vehicle').skip(skip).limit(20).select('-otp').sort({"completedOn":-1}).lean()
    console.log("getRideDetails ",data)
    const count=await rideModel.countDocuments({user:userId})
    return {data,count}
}