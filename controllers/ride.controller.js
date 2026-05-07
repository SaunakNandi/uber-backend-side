const rideService=require('../services/ride.service')
const {validationResult}=require('express-validator')
const mapService=require('../services/maps.service')
const {sendMessageToSocketId}=require('../socket')
const rideModel = require('../models/ride.model')
module.exports.createRide=async(req,res)=>{
    const errors=validationResult(req)
    if(!errors.isEmpty())
        return res.status(400).json({errors:errors.array()})

    const {pickup,destination,vehicleType}=req.body
    // console.log("Getting called")
    try {
        
        const ride=await rideService.createRide({user:req.user._id,pickup,destination,vehicleType})
        // console.log("ride ",ride)
        res.status(201).json(ride)
        const pickupCoordinates=await mapService.getAddressCoordinate(pickup)
        // const destinationCoordinates=await mapService.getAddressCoordinate(destination)
        // console.log("pickup coordinates ",pickupCoordinates)
        const captainsInRadius=await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd,pickupCoordinates.lng,2)
        // console.log("Captains in radius ",captainsInRadius)
        ride.otp=""
        // sending notification to all the captains
        const rideWithUser=await rideModel.findOne({_id:ride._id}).populate('user')
        console.log("captainsInRadius ",captainsInRadius)
        captainsInRadius.map((captain)=>{
            console.log("captain available ",captain,vehicleType)
            // console.log("Ride details ",ride)
            if(captain.vehicle.vehicleType==vehicleType){
                sendMessageToSocketId(captain.socketId,{
                    event:"new-ride",
                    data:rideWithUser
                })
            }
        })
        // console.log("Captain Radius is ",captainsInRadius)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message:error.message})
    }
}
module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide=async(req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } 
    const { rideId } = req.body;
    try {
        const ride=await rideService.confirmRide({rideId, captain:req.captain})
        sendMessageToSocketId(ride.user.socketId,{
            event:'ride-confirmed',
            data:ride
        })
        return res.status(200).json(ride)
    } catch (error) {
        return res.status(500).json({ message: err.message });
    }
}   

module.exports.startRide=async(req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } 
    // console.log("Start ride ",req)
    const {rideId,otp}=req.body
    try {
        const ride=await rideService.startRide({rideId,otp})
        sendMessageToSocketId(ride.user.socketId,{
            event:'ride-started',
            data:ride
        })
        return res.status(200).json(ride)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: error.message });
    } 
}

module.exports.endRide=async(req,res)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } 
    const {rideId}=req.body
    try {
        const ride=await rideService.endRide({rideId,captain:req.captain})
        console.log("end ride ",ride)
        sendMessageToSocketId(ride.user.socketId,{
            event:'ride-ended',
            data:ride
        })
        return res.status(200).json(ride)
    } catch (error) {
        console.log(error)
        return res.status(500).json({message:error.message})
    }
}

module.exports.getDetails=async(req,res)=>{
    try {
        const page=req.query.page;
        console.log("getDetails ",page)
        const userId=req.user._id
        const skip=(page-1)*10
        const {data,count}=await rideService.getRideDetails(skip,userId) 
        console.log("getDetails data => ",data)
        return res.status(200).json({data,hasMore:skip+data.length<count})
    } catch (error) {
        console.log('Ride History ',error)
    }
}

module.exports.getOtherPartyLocation=async(req,res)=>{
    try {
        const rideId=req.query.rideId;
        const ride=await rideModel.findById(rideId).populate("user captain")
        const currentUserId=req.currentUser?._id
        let otherSocketId
        if(ride.user._id.equals(currentUserId))
            otherSocketId=ride.user?.socketId
        else if(ride.captain._id.equals(currentUserId))
            otherSocketId=ride.captain?.socketId
        else
            return res.status(403).json({ message: 'Not authorized for this ride' })

        if(otherSocketId)
        {
            sendMessageToSocketId(otherSocketId,{
                event:'send-my-location',
                data:{rideId}
            })
        }
        return res.status(200).json({message: 'Requested location update from other party'})
    } catch (error) {
        console.log("Error from getotherpartylocation ",error)
    }
}