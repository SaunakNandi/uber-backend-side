const mongoose = require('mongoose')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const captainSchema=new mongoose.Schema({
    fullname:{
        firstname:{
            type:String,
            required:true,
            minLength:[3,"Firstname must be at least 3 characters long"]
        },lastname:{
            type:String,
            required:true,
            minLength:[3,"Lastname must be at least 3 characters long"]
        }
    },
    mobile:{
        type:String,
        // required:true,
        unique:true,
        // match:[mobileRegex,"Enter a valid mobile number"],
    },
    email:{
        type:String,
        required:true,
        unique:true,
        match:[emailRegex,"Please enter valid mailId"],
        lowercase:true
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    socketId:{
        type:String
    },
    status:{
        type:String,
        enum:['ative','inactive'],
        default:'inactive'
    },
    location:{
        ltd:{
            type:Number,
        },
        lng:{
            type:Number,
        }
    },
    vehicle:{
        color:{
            type:String,
            required:true,
            minLength:[3,"Firstname must be at least 3 characters long"]
        },
        plate:{
            type:String,
            required:true,
            minLength:[10,"Enter plate no. correctly"],
            uppercase:true,
        },
        // model:{
        //     type:String,
        // },
        capacity:{
            type:Number,
            required:true,
            min:[1,"This app is not for solo ride"]
        },
        vehicleType:{
            type:String,
            required:true,
            enum:['car','moto','auto']
        }
    }
})



captainSchema.methods.generateAuthToken=function(){
    const token=jwt.sign({_id:this._id},process.env.JWT_SECRET,{expiresIn:'1000h'})
    return token
}

captainSchema.methods.comparePassword=async function (password) {
    return await bcrypt.compare(password,this.password)
}
captainSchema.statics.hashPassword=async function(password){
    return await bcrypt.hash(password,10)
}

const captainModel=mongoose.model('captain',captainSchema)

module.exports=captainModel