const mongoose =require('mongoose')

const connectToDB=async()=>{
    await mongoose.connect(process.env.DB_CONNECT).then(()=>console.log('Connected to DB')).catch(err=>console.log(err))
}

module.exports=connectToDB