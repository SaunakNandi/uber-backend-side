// service to interact with database

const userModel=require('../models/user.model')

module.exports.createUser=async({
    firstname,lastname,email,password,mobile
})=>{
    if(!firstname || !email || !password)
        throw new Error('All fields are required')
    const user=userModel.create({
            fullname:{
                firstname,
                lastname
            },
            mobile,
            email,
            password
        })
    return user
}