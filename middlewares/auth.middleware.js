const userModel=require('../models/user.model')
const captainModel=require('../models/captain.model')
const jwt=require('jsonwebtoken')
const blackListTokenModel=require('../models/blackListToken.model')

module.exports.authUser=async (req,res,next)=>{
    // console.log("Header Auth ", req.headers.authorization)
    const token= req.cookies.token || req.headers?.authorization?.split(' ')[1]
    if(!token)
        return res.status(401).json({message:'Unauthorized'})

    // if suppose the user has stored the token somewhere and try to login after the token got expired so we will check if the token present with him blacklisted or not
    const isBlackListed=await blackListTokenModel.findOne({token})
    if(isBlackListed)
        return res.status(401).json({message:'Unauthorized'})
    try {
        const decoded=jwt.verify(token,process.env.JWT_SECRET)  // needed to check how this happens?
        const user=await userModel.findById(decoded._id)
        if(user===null)
            req.user=null
        else
            req.user=user
        return next()
    } catch (error) {
        console.log('Problem in auth.middleware authUser',error)
    }
}

module.exports.authCaptain=async (req,res,next)=>{
    // console.log(req.headers.authorization)
    const token= req.cookies.token || req.headers?.authorization?.split(' ')[1]
    if(!token)
        return res.status(401).json({message:'Unauthorized'})

    // if suppose the user has stored the token somewhere and try to login after the token got expired so we will check if the token present with him blacklisted or not
    const isBlackListed=await blackListTokenModel.findOne({token})
    if(isBlackListed)
        return res.status(401).json({message:'Unauthorized'})
    try {
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        const captain=await captainModel.findById(decoded._id)
        console.log("Problem in authCaptain ",captain)
        if (!captain) {
            req.captain = null;
        } else {
            req.captain = captain;
        }
        return next()
    } catch (error) {
        coconsole.log('Problem in auth.middleware authUser', error.message);
        
        // This is the key: tell the frontend this token is garbage
        return res.status(401).json({ 
            message: 'Unauthorized', 
            error: error.message 
        });
    }
}

module.exports.anyUser=async(req,res,next)=>{
    const token=req.cookies.token || req.headers?.authorization?.split(' ')[1];
    if(!token) return res.status(401).json({message:"Unauthorized"})
    const isBlackListed=await blackListTokenModel.findOne({token})
    if(isBlackListed) return res.status(401).json({message:'Unauthorized'})
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        const captain=await captainModel.findById(decoded._id)
        if(captain)
        {
            req.currentUser=captain
            req.role='captain'
            return next()
        }
        const user=await userModel.findById(decoded._id)
        if(user)
        {
            req.currentUser=user
            req.role='captain'
            return next()
        }
        return res.status(401).json({ message: 'Unauthorized: Invalid user/captain' });
    }
    catch(error){
        console.log("Error at anyUser",error)
    }
}