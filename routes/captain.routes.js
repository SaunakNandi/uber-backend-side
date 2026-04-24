const express=require('express')
const router=express.Router()
const {body}=require('express-validator')
const captainController=require('../controllers/captain.controller')
const authMiddleware=require('../middlewares/auth.middleware')

router.post('/register',[
    body('email').isEmail().withMessage('Invalid Email'),
    // if min length is not 3 then give the message
    body('fullname.firstname').isLength({min:3}).withMessage('First name must be atleast 3 characters long'),
    body('password').isLength({min:1}).withMessage('Password must be atleast 6 characters long captain'),
    // body('mobile').isLength({min:10,max:10}).withMessage('Mobile no. should be active one'),
    // if min length is not 3 then give the message
    body('vehicle.color').isLength({min:3}).withMessage('Color must be atleast 3 characters long'),
    body('vehicle.plate').isLength({min:10}).withMessage('Plate no. should be of length 10 only'),
    body('vehicle.capacity').isInt({min:1}).withMessage('This app is not for riding alone'),
    body('vehicle.vehicleType').isIn(['car','moto','auto']).withMessage('Select correctly'),
],
    captainController.registerCaptain
)
router.post('/login',[
        body('email').isEmail().withMessage('Invalid Email'),
        body('password').isLength({min:6}).withMessage('Password Invalid'),
    ],
    captainController.loginCaptain
)
router.post('/login-otp',captainController.verifyLoginOtp)
router.post('/verify-otp',captainController.verifyOTP)
router.post('/login',[body('mobile').isNumeric().withMessage('Invalid Phone Number')],captainController.loginCaptain)
router.get('/profile',authMiddleware.authCaptain,captainController.getCaptainProfile)
router.post('/logout',authMiddleware.authCaptain,captainController.logoutCaptain)

module.exports=router