const express = require('express')
const auth = require('../middleware/auth.js')
const { sendPush, pushConfigured } = require('../utils/push.js')

const router = express.Router()

// Save (or refresh) a push subscription for the current user.
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'A valid push subscription is required' })
    }

    const endpoint = String(subscription.endpoint).slice(0, 2048)
    const keys = subscription.keys || {}

    // De-duplicate by endpoint, then re-add so the user has exactly one entry
    // per device even after re-subscribing many times.
    const { User } = require('../models/User.js')
    await User.updateOne(
      { _id: req.userId, 'pushSubscriptions.endpoint': endpoint },
      { $pull: { pushSubscriptions: { endpoint } } }
    )
    await User.updateOne(
      { _id: req.userId },
      {
        $push: {
          pushSubscriptions: {
            endpoint,
            keys: { p256dh: keys.p256dh || '', auth: keys.auth || '' }
          }
        }
      }
    )

    res.json({ success: true, userId: req.userId })
  } catch (error) {
    console.error('Push subscribe error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove a push subscription for the current user.
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { subscription, endpoint } = req.body
    const target = (endpoint || (subscription && subscription.endpoint) || '').slice(0, 2048)
    if (!target) {
      return res.status(400).json({ error: 'Subscription endpoint is required' })
    }

    const { User } = require('../models/User.js')
    await User.updateOne(
      { _id: req.userId },
      { $pull: { pushSubscriptions: { endpoint: target } } }
    )

    res.json({ success: true, userId: req.userId })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Push capability + a test-send endpoint (used for verification).
router.get('/status', auth, async (req, res) => {
  const { User } = require('../models/User.js')
  const user = await User.findById(req.userId).select('pushSubscriptions')
  res.json({
    supported: true,
    configured: pushConfigured,
    subscriptionCount: user && user.pushSubscriptions ? user.pushSubscriptions.length : 0
  })
})

module.exports = router