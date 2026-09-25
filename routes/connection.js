const express = require('express')
const { User, WatchSession } = require('../models/User.js')
const { generateCode } = require('../utils/codeGenerator.js')
const auth = require('../middleware/auth.js')
const { getIO } = require('../utils/io.js')

const router = express.Router()

// Generate connection code (couple mode)
router.post('/generate-code', auth, async (req, res) => {
  try {
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await User.findByIdAndUpdate(req.userId, {
      partnerConnectionCode: code,
      partnerConnectionCodeExpires: expiresAt
    })

    res.json({ code, expiresIn: 10 })
  } catch (error) {
    console.error('Generate code error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Connect with partner's code -> creates a couple watch session
router.post('/connect', auth, async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase()
    if (!code) {
      return res.status(400).json({ error: 'Connection code required' })
    }

    const joiner = await User.findById(req.userId)
    if (!joiner) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (joiner.isConnectedWithPartner) {
      return res.status(400).json({ error: 'You are already connected to a partner' })
    }

    const partner = await User.findOne({
      partnerConnectionCode: code,
      partnerConnectionCodeExpires: { $gt: new Date() }
    })
    if (!partner) {
      return res.status(400).json({ error: 'Invalid or expired connection code' })
    }
    if (partner._id.equals(joiner._id)) {
      return res.status(400).json({ error: 'You cannot pair with yourself' })
    }
    if (partner.isConnectedWithPartner) {
      return res.status(400).json({ error: 'That partner is already connected' })
    }

    // Create the couple watch session
    const session = new WatchSession({
      sessionType: 'couple',
      couple: { user1Id: partner._id, user2Id: joiner._id },
      status: 'active'
    })
    await session.save()

    // Pair both users with each other
    await Promise.all([
      User.findByIdAndUpdate(joiner._id, {
        partnerId: partner._id,
        isConnectedWithPartner: true,
        partnerConnectionCode: '',
        partnerConnectionCodeExpires: null
      }),
      User.findByIdAndUpdate(partner._id, {
        partnerId: joiner._id,
        isConnectedWithPartner: true,
        partnerConnectionCode: '',
        partnerConnectionCodeExpires: null
      })
    ])

    // Notify the user who generated the code that they've been paired
    const io = getIO()
    if (io) {
      io.to(`user:${partner._id}`).emit('paired', {
        sessionId: session._id,
        partner: { id: joiner._id, name: joiner.displayName, avatarUrl: joiner.avatarUrl || '' },
        mode: 'couple'
      })
    }

    res.json({
      success: true,
      sessionId: session._id,
      partner: { id: partner._id, name: partner.displayName, avatarUrl: partner.avatarUrl || '' },
      mode: 'couple'
    })
  } catch (error) {
    console.error('Connect error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start (or resume) a couple session with an already-connected partner - no code needed
router.post('/start', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('partnerId isConnectedWithPartner')
    if (!user || !user.isConnectedWithPartner || !user.partnerId) {
      return res
        .status(400)
        .json({ error: 'You are not connected to a partner yet. Ask for their code to pair first.' })
    }

    const partnerId = user.partnerId.toString()
    const selfId = req.userId.toString()
    const partner = await User.findById(partnerId).select('displayName avatarUrl')
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' })
    }

    const coupleMatch = {
      sessionType: 'couple',
      status: { $in: ['active', 'paused'] },
      $or: [
        { 'couple.user1Id': req.userId, 'couple.user2Id': user.partnerId },
        { 'couple.user1Id': user.partnerId, 'couple.user2Id': req.userId }
      ]
    }
    let session = await WatchSession.findOne(coupleMatch).sort({ createdAt: -1 })

    if (!session) {
      const [u1, u2] = [selfId, partnerId].sort()
      session = new WatchSession({
        sessionType: 'couple',
        couple: { user1Id: u1, user2Id: u2 },
        status: 'active',
        playbackState: { isPlaying: false, currentTime: 0, lastUpdated: new Date() }
      })
      await session.save()
    } else if (session.status === 'paused') {
      session.status = 'active'
      await session.save()
    }

    res.json({
      sessionId: session._id,
      partner: { id: partner._id, name: partner.displayName, avatarUrl: partner.avatarUrl || '' },
      mode: 'couple'
    })
  } catch (error) {
    console.error('Start couple session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get partner info
router.get('/partner', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('partnerId isConnectedWithPartner')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!user.isConnectedWithPartner || !user.partnerId) {
      return res.json({ partner: null })
    }

    const partner = await User.findById(user.partnerId).select('displayName avatarUrl')
    res.json({ partner })
  } catch (error) {
    console.error('Get partner error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Disconnect from partner
router.post('/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const partnerId = user.partnerId
    await Promise.all([
      User.findByIdAndUpdate(user._id, {
        isConnectedWithPartner: false,
        partnerId: null,
        partnerConnectionCode: null,
        partnerConnectionCodeExpires: null
      }),
      partnerId &&
        User.findByIdAndUpdate(partnerId, {
          isConnectedWithPartner: false,
          partnerId: null,
          partnerConnectionCode: null,
          partnerConnectionCodeExpires: null
        })
    ])

    res.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router