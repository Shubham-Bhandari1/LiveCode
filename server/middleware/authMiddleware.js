import jwt from 'jsonwebtoken'

/**
 * JWT authentication middleware.
 * Reads the Authorization: Bearer <token> header, verifies the token,
 * and attaches req.user = { id, name, email } to the request.
 */
export default function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
    }

    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' })
    }
    return res.status(401).json({ error: 'Authentication failed.' })
  }
}
