import jwt from 'jsonwebtoken'

export const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'] || ''
    const [scheme, tokenFromHeader] = authHeader.split(' ')
    const tokenFromCookie = req.cookies?.access_token;

    const token = scheme === 'Bearer' && tokenFromHeader ? tokenFromHeader : tokenFromCookie;

    if(!token) {
        return res.status(401).json({success:false, message: "No token provided"})
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_CODE)
        req.user = {
            id: decodedToken.id,
            email: decodedToken.email
        }
        next()
    } catch (error) {
        if(error.name === 'TokenExpiredError') {
            return res.status(401).json({success:false, message: "Access Token expired"})
        
        }
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}
