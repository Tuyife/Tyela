const express = require('express')
const { User, WatchSession } = require('../models/User.js')
const { generateCode } = require('../utils/codeGenerator.js')
const auth = require('../middleware/auth.js')
const { getIO } = require('../utils/io.js')
const { isOnline } = require('../utils/presence.js')

const router = express.Router()

// Migrate legacy single-partner accounts (partnerId) into the partners array,
// so existing couples keep working alongside the new multi-partner support.
async function ensurePartners(user) {
  if ((!user.partners || user.partners.length === 0) && user.partnerId) {
    user.partners = [{ userId: user.partnerId, pairedAt: user.updatedAt || new Date() }]
    await user.save()
  }
  return user
}

// Resolve a user's partners array into { userId, displayName, avatarUrl }.
async function partnersOf(user) {
  await ensurePartners(user)
  const ids = (user.partners || []).map((p) => p.userId).filter(Boolean)
  if (ids.length === 0) return []
  const users = await User.find({ _id: { $in: ids } }).select('displayName avatarUrl')
  const map = new Map(users.map((u) => [String(u._id), u]))
  return (user.partners || [])
    .filter((p) => p.userId)
    .map((p) => {
      const u = map.get(String(p.userId))
      if (!u) return null
      return { userId: u._id, displayName: u.displayName, avatarUrl: u.avatarUrl || '' }
    })
    .filter(Boolean)
    .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))
}

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

// Connect with partner's code -> creates a couple watch session.
// Users can now have several partners at once (deduped per person).
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
    await ensurePartners(joiner)

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
    await ensurePartners(partner)

    const alreadyPaired = (joiner.partners || []).some(
      (p) => p.userId && p.userId.equals(partner._id)
    )
    if (alreadyPaired) {
      return res.status(400).json({ error: 'You are already connected with this partner' })
    }

    // Create the couple watch session
    const session = new WatchSession({
      sessionType: 'couple',
      couple: { user1Id: partner._id, user2Id: joiner._id },
      status: 'active'
    })
    await session.save()

    // Pair both users with each other (append - never overwrites other partners)
    await Promise.all([
      User.findByIdAndUpdate(joiner._id, {
        $addToSet: { partners: { userId: partner._id } },
        partnerConnectionCode: '',
        partnerConnectionCodeExpires: null
      }),
      User.findByIdAndUpdate(partner._id, {
        $addToSet: { partners: { userId: joiner._id } },
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

// Start (or resume) a couple session with one of your partners - no code needed
router.post('/start', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('partners partnerId')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    await ensurePartners(user)

    const list = user.partners || []
    if (list.length === 0) {
      return res
        .status(400)
        .json({ error: 'You are not connected to a partner yet. Ask for their code to pair first.' })
    }

    // Fall back to the most recently paired partner when none is specified
    const requested = req.body.partnerId || (list[list.length - 1].userId || '').toString()
    const entry = list.find((p) => p.userId && p.userId.toString() === String(requested))
    if (!entry) {
      return res.status(400).json({ error: 'You are not connected with that partner' })
    }

    const partnerId = entry.userId.toString()
    const selfId = req.userId.toString()
    const partner = await User.findById(partnerId).select('displayName avatarUrl')
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' })
    }

    const coupleMatch = {
      sessionType: 'couple',
      status: { $in: ['active', 'paused'] },
      $or: [
        { 'couple.user1Id': req.userId, 'couple.user2Id': entry.userId },
        { 'couple.user1Id': entry.userId, 'couple.user2Id': req.userId }
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

// Live connection status: every partner with their real-time online state
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('partners partnerId')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const partners = await partnersOf(user)
    res.json({
      connected: partners.length > 0,
      partners: partners.map((p) => ({ ...p, online: isOnline(p.userId) }))
    })
  } catch (error) {
    console.error('Connection status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get partner info (all partners)
router.get('/partner', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('partners partnerId')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const partners = await partnersOf(user)
    res.json({ connected: partners.length > 0, partners })
  } catch (error) {
    console.error('Get partner error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Disconnect from one specific partner
router.post('/disconnect', auth, async (req, res) => {
  try {
    const { partnerId } = req.body
    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId is required' })
    }
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    await Promise.all([
      User.findByIdAndUpdate(user._id, { $pull: { partners: { userId: partnerId } } }),
      User.findByIdAndUpdate(partnerId, { $pull: { partners: { userId: user._id } } })
    ])

    res.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router