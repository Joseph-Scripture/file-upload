import 'dotenv/config'
import express from 'express'
import authRoutes from './src/routes/authroutes.js'
import cookieParser from 'cookie-parser'



const app = express()

app.use(express.json())
app.use(cookieParser())
app.use('/auth', authRoutes)


app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})