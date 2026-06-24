import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

/** Sign a JWT for the given user */
function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// ─────────────────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' })
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' })
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    // Check if email already taken
    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    })

    const token = signToken(user)

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.color,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error('[register]', err)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

// ─────────────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    // Include password field (select: false by default)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = signToken(user)

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.color,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error('[login]', err)
    return res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// ─────────────────────────────────────────────────────────
//  GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found.' })
    }
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      color: user.color,
      createdAt: user.createdAt,
    })
  } catch (err) {
    console.error('[me]', err)
    return res.status(500).json({ error: 'Failed to fetch user data.' })
  }
})

export default router
