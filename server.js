const http=require('http')
const app=require('./app')
const port=process.env.PORT || 3000
const server = http.createServer(app)
const connectToDB=require('./db/db')
const {initializeSocket}=require('./socket')

initializeSocket(server)
connectToDB().then(()=>{
    console.log("Lets run the server from server.js")
    server.listen(port,()=>{
        console.log("Server is running on port "+port)
    })
}).catch(err=>console.log("Cannot connect to database ",err))

