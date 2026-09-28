const express = require('express')
const { User } = require('../models/User.js')
const auth = require('../middleware/auth.js')

const router = express.Router()

// Start the tutorial (records when the user began it). Can be called
// every time the tutorial is opened, including from settings.
router.post('/start', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { tutorialStartedAt: new Date() },
      { new: true }
    )
    res.json({ success: true, userId: user._id, tutorialStartedAt: user.tutorialStartedAt })
  } catch (error) {
    console.error('Tutorial start error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark the tutorial as fully completed (also clears any skip flag).
router.post('/complete', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      tutorialCompleted: true,
      tutorialSkipped: false,
      tutorialSkippedAt: null,
      tutorialStartedAt: new Date()
    })
    res.json({ success: true, userId: req.userId, tutorialCompleted: true })
  } catch (error) {
    console.error('Tutorial complete error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Skip the tutorial (user can retake it anytime from settings).
router.post('/skip', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      tutorialSkipped: true,
      tutorialSkippedAt: new Date()
    })
    res.json({ success: true, userId: req.userId, tutorialSkipped: true })
  } catch (error) {
    console.error('Tutorial skip error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Should the tutorial show for this user right now?
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'tutorialCompleted tutorialSkipped tutorialStartedAt'
    )
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({
      tutorialCompleted: Boolean(user.tutorialCompleted),
      tutorialSkipped: Boolean(user.tutorialSkipped),
      tutorialStartedAt: user.tutorialStartedAt || null,
      canRetakeEverytime: true
    })
  } catch (error) {
    console.error('Tutorial status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router