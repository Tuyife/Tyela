const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = auth