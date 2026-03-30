import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/db.js'


const ACCESS_TTL = '15m';
const REFRESH_TTL_SEC = 60 * 60 * 24 * 7;

export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function createJti() {
    return crypto.randomBytes(16).toString('hex');
}
export const signAccessToken = (user) => {
    const payload = {id: user.id, email: user.email}
    return jwt.sign(payload, process.env.JWT_SECRET_CODE, {expiresIn: ACCESS_TTL})
}
export function signRefreshToken(user, jti){
    const payload = {id:user.id, jti}
    const token = jwt.sign(payload, process.env.JWT_SECRET_CODE, {expiresIn: REFRESH_TTL_SEC})
    return token
}


export async function persistRefreshToken(user, jti,refreshToken, ip, userAgent){
    const tokenHash = hashToken(refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000)
    await prisma.refreshToken.create({
        data: {
            tokenHash,
            userId: user.id,
            expiresAt,
            ipAddress: ip,
            userAgent: userAgent
        }
    })
}

export function setRefreshCookie(res, refreshToken) {
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        maxAge: REFRESH_TTL_SEC * 1000
    })

}

export async function rotateRefreshToken(oldDoc, user, req, res) {
    oldDoc.revokedAt = new Date()
    const newJti = createJti()
    oldDoc.replacedBy = newJti
    await prisma.refreshToken.update({
        where: {id: oldDoc.id},
        data: oldDoc
    })
    const newAccessToken = signAccessToken(user)
    const newRefreshToken = signRefreshToken(user, newJti)
    await persistRefreshToken(user, newJti, newRefreshToken, req.ip, {jti:newJti, userAgent: req.headers('User-Agent') || ''})
    setRefreshCookie(res, newRefreshToken)
    return {accessToken: newAccessToken}
}

