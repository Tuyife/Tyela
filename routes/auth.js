const express = require('express')
const { User } = require('../models/User.js')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { generateCode } = require('../utils/codeGenerator.js')

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = new User({
      email,
      password: hashedPassword,
      displayName
    })

    await user.save()

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        themeColor: user.themeColor
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        themeColor: user.themeColor
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) {
      return res.status(401).json({ valid: false })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(404).json({ valid: false })
    }

    res.json({ valid: true, user: { id: user._id, email: user.email, displayName: user.displayName } })
  } catch (error) {
    res.status(401).json({ valid: false })
  }
})

// Generate connection code (couple mode)
router.post('/generate-code', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await User.findByIdAndUpdate(userId, {
      partnerConnectionCode: code,
      partnerConnectionCodeExpires: expiresAt
    })

    res.json({ code, expiresIn: 10 })
  } catch (error) {
    console.error('Generate code error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Connect with partner's code
router.post('/connect', async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.partnerConnectionCode !== code) {
      return res.status(400).json({ error: 'Invalid connection code' })
    }

    if (user.partnerConnectionCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Connection code expired' })
    }

    // Find partner by code - we need to look up the user who generated this code
    // For now, we'll mark this user as connected and return partner info
    await User.findByIdAndUpdate(user._id, {
      isConnectedWithPartner: true,
      partnerConnectionCode: '',
      partnerConnectionCodeExpires: null
    })

    res.json({
      success: true,
      partnerId: user._id,
      partnerName: user.displayName,
      mode: 'couple'
    })
  } catch (error) {
    console.error('Connect error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get partner info
router.get('/partner', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' })
    }

    const user = await User.findById(userId).select('partnerId isConnectedWithPartner')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!user.isConnectedWithPartner || !user.partnerId) {
      return res.json({ partner: null })
    }

    const partner = await User.findById(user.partnerId).select('displayName online status')
    res.json({ partner })
  } catch (error) {
    console.error('Get partner error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Disconnect from partner
router.post('/disconnect', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' })
    }

    await User.findByIdAndUpdate(userId, {
      isConnectedWithPartner: false,
      partnerId: null,
      partnerConnectionCode: null,
      partnerConnectionCodeExpires: null
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router