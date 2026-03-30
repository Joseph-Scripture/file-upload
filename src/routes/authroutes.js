import { signup, login, getProfile, logout, refreshAccessToken } from "../controllers/authentication.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import { Router } from 'express'


const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/profile', authMiddleware, getProfile)
router.post('/refresh-token', refreshAccessToken)
router.post('/logout', logout)

export default router