const mapService=require('../services/maps.service')
const {validationResult}=require('express-validator')
module.exports.getCoordinates=async(req,res,next)=>{
    const errors=validationResult(req)
    if(!errors.isEmpty())
        return res.status(400).json({errors:errors.array()})
    try{
        const {address}=req.query
        const coordinates=await mapService.getAddressCoordinate(address)
        res.status(200).json(coordinates)
    }
    catch(error){
        res.status(404).json({message:'Coordinate not found'})
    }
}
module.exports.getDistance=async(req,res)=>{
    try {
        const {origin,destination}=req.query
        const distance=await mapService.getDistance(origin,destination)
        return res.status(200).json(distance)
    } catch (error) {
        console.log("not able to fetch from getDistance",error)
        res.status(500).json({message:'not able to fetch from getDistance'})
    }
}
module.exports.getDistanceTime=async(req,res,next)=>{
    const errors=validationResult(req)
    if(!errors.isEmpty())
        return res.status(400).json({errors:errors.array()})
    try {
        const {origin,destination}=req.query
        const distanceTime=await mapService.getDistance_and_Time(origin,destination)
        res.status(200).json(distanceTime)
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'Internal Server Error'})
        throw error
    }
}

module.exports.getAutoCompleteSuggestions=async(req,res,next)=>{
    const errors=validationResult(req)
    if(!errors.isEmpty())
        return res.status(400).json({errors:errors.array()})
    try {
        const {input}=req.query
        const suggestions=await mapService.getSuggestions(input)
        res.status(200).json(suggestions)
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'Internal Server Error'})
        throw error
    }
}

module.exports.getLiveLocation=async(req,res)=>{
    const errors=validationResult(req)
    console.log("error is here from live location ",errors)
    if(!errors.isEmpty())
        return res.status(400).json({errors:errors.array()})
    try {
        console.log("Query for live location is ",req.query)
        const {pickup,destination}=req.query
        const pickupCoordinates=await mapService.MapCoords(pickup)
        const destinationCoordinates=await mapService.MapCoords(destination)
        console.log("pickup coordinates ",pickupCoordinates)
        console.log("destination coordinates ",destinationCoordinates)
        return res.status(200).json({pickupCoordinates,destinationCoordinates})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'Problem with live location'})
    }
}