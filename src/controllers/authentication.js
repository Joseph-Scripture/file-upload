import prisma from "../config/db.js";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

import {createJti, signAccessToken, signRefreshToken, persistRefreshToken, setRefreshCookie, hashToken} from '../utils/token.js'

export const signup = async (req, res) => {
    try {
        const {name, email, password} = req.body

        if(!name || !email || !password) {
            return res.status(400).json({success:false, message: "All fields are required"})
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return res.status(400).json({success:false, message: "User with this email already exists"})
        }
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        })

        const token = jwt.sign({id: user.id, email: user.email}, process.env.JWT_SECRET_CODE, {expiresIn: "2s"})

        return res.status(201).json({success:true, name:user.name, message: "User created successfully", token})
    }
    catch (error) {
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}


export const login = async (req, res) => {
    try {
        const {email, password} = req.body
        if(!email || !password) {
            return res.status(400).json({success:false, message: "All fields are required"})
        }
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (!user){
            return res.status(404).json({success:false, message: "invalid user name or password"})
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return res.status(401).json({success:false, message: "invalid user name or password"})
        }

        const accessToken = signAccessToken(user)
        const jti = createJti()
        const refreshToken = signRefreshToken(user, jti)
        await persistRefreshToken(user, jti, refreshToken, req.ip, {jti:jti, userAgent: req.headers('User-Agent') || ''})
        setRefreshCookie(res, refreshToken)
        res.json({success:true, message: "User logged in successfully", accessToken})
        
    } catch (error) {
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}

export const logout = async (req, res) => {
    try {
        const token = req.cookies?.refresh_token;
        if(token){
            const tokenHash = hashToken(token);
            const doc = await prisma.refreshToken.findUnique({
                where: {
                    tokenHash
                }
            })
            if(doc && !doc.revokedAt){
                await prisma.refreshToken.update({
                    where: {
                        id: doc.id
                    },
                    data: {
                        revokedAt: new Date()
                    }
                })
            }
        }
        res.clearCookie("refresh_token", {path: "/auth/refresh-token"})
        return res.json({success:true, message: "User logged out successfully"})
    } catch (error) {
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }

}
export const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id
            }
        })
        if(!user) {
            return res.status(404).json({success:false, message: "User not found"})
        }
        return res.status(200).json({success:true, user})
    } catch (error) {
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}

export const refreshAccessToken = async (req, res) => {
    try {
        const token = req.cookies?.refresh_token;
        if(!token) {
            return res.status(401).json({success:false, message: "No token provided"})
        }
        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_TOKEN_SECRET)
        } catch (error) {
            console.error(error)
            return res.status(401).json({success:false, message: "Invalid token"})
        }
        const tokenHash = hashToken(token)
        const doc = await prisma.refreshToken.findUnique({
            where: {
                tokenHash,
                jti: decoded.jti,
                userId: decoded.id,
            }
        })
        if(!doc) {
            return res.status(401).json({success:false, message: "Invalid token"})
        }
        if(doc.revokedAt) {
            return res.status(401).json({success:false, message: "Token revoked"})
        }
        if(doc.expiresAt < new Date()) {
            return res.status(401).json({success:false, message: "Token expired"})
        }
        const result = await rotateRefreshToken(doc, doc.user, req, res);
        return res.json({success:true, message: "Token refreshed successfully", accessToken: result.accessToken})
    } catch (error) {
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}
            
        
        
