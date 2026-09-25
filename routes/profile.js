const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { User } = require('../models/User.js')
const auth = require('../middleware/auth.js')

const router = express.Router()

const THEME_COLORS = ['purple', 'pink', 'teal', 'amber']
const avatarsDir = path.join(__dirname, '..', 'public', 'avatars')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(avatarsDir, { recursive: true })
    cb(null, avatarsDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `avatar-${req.userId}-${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png)$/.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPG and PNG images are allowed'))
    }
  }
})

function toPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    themeColor: user.themeColor || 'purple'
  }
}

// Get profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user: toPublicUser(user) })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update profile (multipart: displayName, bio, themeColor, avatar file)
router.post('/update', auth, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'Avatar file exceeds 2MB limit' : err.message
        return res.status(400).json({ error: message })
      }
      return res.status(400).json({ error: err.message })
    }

    try {
      const userId = req.userId
      const { displayName, bio, themeColor } = req.body
      const update = {}

      if (displayName && typeof displayName === 'string' && displayName.trim()) {
        update.displayName = displayName.trim().slice(0, 50)
      }
      if (typeof bio === 'string') {
        update.bio = bio.slice(0, 100)
      }
      if (themeColor && THEME_COLORS.includes(themeColor)) {
        update.themeColor = themeColor
      }
      if (req.file) {
        update.avatarUrl = `/avatars/${req.file.filename}`
      }

      const user = await User.findByIdAndUpdate(userId, update, { new: true })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json({ success: true, user: toPublicUser(user) })
    } catch (error) {
      console.error('Update profile error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })
})

module.exports = router