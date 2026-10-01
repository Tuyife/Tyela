const express = require('express')
const { User, WatchSession } = require('../models/User.js')
const WatchRequest = require('../models/WatchRequest.js')
const { generateCode } = require('../utils/codeGenerator.js')
const auth = require('../middleware/auth.js')
const { getIO } = require('../utils/io.js')
const { isOnline, sessionMemberIds } = require('../utils/presence.js')
const { sendPush } = require('../utils/push.js')

const router = express.Router()

// A join request is only interesting while it's fresh; older ones are dropped
// on read so nobody accepts a request from an hour ago.
const REQUEST_TTL_MS = 15 * 60 * 1000

// Backstop only. A session can stay "active" in the database long after
// everyone has left (nobody ends it on disconnect), so liveness is decided by
// live socket presence in the session room — see activeSessionFor.
const BUSY_WINDOW_MS = 90 * 60 * 1000

// The brief for the session a user is watching *right now*, or null.
// A session only counts while that user still has a live socket in the room,
// so leaving the watch screen or closing the app clears "Watching ..." at once
// instead of lingering until the document goes stale.
async function activeSessionFor(userId) {
  const session = await WatchSession.findOne({
    status: 'active',
    updatedAt: { $gt: new Date(Date.now() - BUSY_WINDOW_MS) },
    $or: [
      { 'couple.user1Id': userId },
      { 'couple.user2Id': userId },
      { 'group.hostId': userId },
      { 'group.participantIds': userId }
    ]
  })
    .sort({ updatedAt: -1 })
    .select('sessionType video.title')
  if (!session) return null
  // Live membership wins over the stored status: if this user has no socket in
  // the room, they are not watching anything right now.
  if (!sessionMemberIds(session._id).includes(String(userId))) return null
  return {
    sessionId: session._id,
    sessionType: session.sessionType,
    sessionTitle: session.video && session.video.title ? session.video.title : ''
  }
}

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

// Start (or resume) the couple session between two connected users. Shared by
// the "Watch" button and by accepting a join request, so both land in exactly
// the same session.
async function startOrResumeCoupleSession(selfId, partnerId) {
  const partner = await User.findById(partnerId).select('displayName avatarUrl')
  if (!partner) return null

  const coupleMatch = {
    sessionType: 'couple',
    status: { $in: ['active', 'paused'] },
    $or: [
      { 'couple.user1Id': selfId, 'couple.user2Id': partnerId },
      { 'couple.user1Id': partnerId, 'couple.user2Id': selfId }
    ]
  }
  let session = await WatchSession.findOne(coupleMatch).sort({ createdAt: -1 })

  if (!session) {
    const [u1, u2] = [String(selfId), String(partnerId)].sort()
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

  return {
    sessionId: session._id,
    partner: { id: partner._id, name: partner.displayName, avatarUrl: partner.avatarUrl || '' },
    mode: 'couple'
  }
}

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

    const started = await startOrResumeCoupleSession(
      req.userId.toString(),
      entry.userId.toString()
    )
    if (!started) {
      return res.status(404).json({ error: 'Partner not found' })
    }

    res.json(started)
  } catch (error) {
    console.error('Start couple session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Live connection status: every partner with their real-time online state,
// plus whether they are busy in an active watch session right now.
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('partners partnerId')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const partners = await partnersOf(user)
    const enriched = []
    for (const p of partners) {
      const online = isOnline(p.userId)
      let busy = false
      let sessionId
      let sessionType
      let sessionTitle
      if (online) {
        const active = await activeSessionFor(p.userId)
        if (active) {
          busy = true
          sessionId = active.sessionId
          sessionType = active.sessionType
          sessionTitle = active.sessionTitle
        }
      }
      enriched.push({ ...p, online, busy, sessionId, sessionType, sessionTitle })
    }
    res.json({
      connected: partners.length > 0,
      partners: enriched
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

// Ask a partner to join your watch, or invite an offline partner to watch
// together. Delivers a push notification (plus a live socket nudge when the
// partner has a device around). This is a "tap on the shoulder", distinct
// from the session-bound invite that `/api/invites/send` creates.
router.post('/invite', auth, async (req, res) => {
  try {
    const { partnerId } = req.body
    const kind = req.body.kind === 'join' ? 'join' : 'watch'
    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId required' })
    }

    const me = await User.findById(req.userId).select('displayName partners')
    const isPartner = (me.partners || []).some(
      (p) => p.userId && String(p.userId) === String(partnerId)
    )
    if (!isPartner) {
      return res.status(403).json({ error: 'Not connected with this user' })
    }

    const partner = await User.findById(partnerId).select('displayName')
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' })
    }

    const fromName = me.displayName
    const io = getIO()
    if (io) {
      io.to(`user:${String(partnerId)}`).emit('connection-invite', {
        fromUser: fromName,
        kind,
        url: '/dashboard'
      })
    }

    if (kind === 'join') {
      await sendPush(partnerId, {
        title: 'Wants to join 🍿',
        message: `${fromName} asked to join your watch. Tap to catch up.`,
        url: '/dashboard'
      })
    } else {
      await sendPush(partnerId, {
        title: 'Watch together? 🎬',
        message: `${fromName} is inviting you to grab a movie and watch together.`,
        url: '/dashboard'
      })
    }

    res.json({ sent: true })
  } catch (error) {
    console.error('Connection invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// -------------------- Join requests: ask, accept, decline --------------------

// "Can I watch with you?" - a request the recipient accepts or declines, rather
// than a fire-and-forget notification.
router.post('/join-request', auth, async (req, res) => {
  try {
    const { partnerId } = req.body
    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId is required' })
    }

    const me = await User.findById(req.userId).select('displayName avatarUrl partners partnerId')
    if (!me) {
      return res.status(404).json({ error: 'User not found' })
    }
    await ensurePartners(me)

    const isPartner = (me.partners || []).some((p) => p.userId && String(p.userId) === String(partnerId))
    if (!isPartner) {
      return res.status(403).json({ error: 'Not connected with this user' })
    }

    // One open request per pair: asking again replaces the old one.
    await WatchRequest.deleteMany({
      fromUserId: me._id,
      toUserId: partnerId,
      status: 'pending'
    })

    // Carry the session the asker was watching so the recipient sees context.
    const live = await activeSessionFor(me._id)
    const request = await WatchRequest.create({
      fromUserId: me._id,
      toUserId: partnerId,
      sessionId: live ? live.sessionId : null
    })

    const io = getIO()
    if (io) {
      io.to(`user:${String(partnerId)}`).emit('join-request', {
        requestId: request._id,
        fromUser: me.displayName,
        fromAvatarUrl: me.avatarUrl || '',
        at: request.createdAt
      })
    }
    sendPush(partnerId, {
      title: 'Wants to join \u{1F37F}',
      message: `${me.displayName} asked to watch with you.`,
      url: '/dashboard'
    }).catch(() => {})

    res.json({ sent: true, requestId: request._id })
  } catch (error) {
    console.error('Join request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Pending requests addressed to me.
router.get('/join-requests', auth, async (req, res) => {
  try {
    const fresh = { createdAt: { $gt: new Date(Date.now() - REQUEST_TTL_MS) } }
    // Opportunistic cleanup so stale requests don't pile up.
    WatchRequest.deleteMany({ status: 'pending', createdAt: { $lte: new Date(Date.now() - REQUEST_TTL_MS) } })
      .catch(() => {})

    const requests = await WatchRequest.find({ toUserId: req.userId, status: 'pending', ...fresh })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('fromUserId', 'displayName avatarUrl')

    res.json({
      requests: requests
        .filter((r) => r.fromUserId)
        .map((r) => ({
          id: r._id,
          from: {
            id: r.fromUserId._id,
            name: r.fromUserId.displayName,
            avatarUrl: r.fromUserId.avatarUrl || ''
          },
          sessionId: r.sessionId,
          createdAt: r.createdAt
        }))
    })
  } catch (error) {
    console.error('Join requests list error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Accept: start (or resume) our couple session and pull the asker in.
router.post('/join-request/:id/accept', auth, async (req, res) => {
  try {
    const request = await WatchRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (String(request.toUserId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Not your request' })
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'Request already handled' })
    }

    request.status = 'accepted'
    request.resolvedAt = new Date()
    await request.save()

    const started = await startOrResumeCoupleSession(
      req.userId.toString(),
      request.fromUserId.toString()
    )
    if (!started) {
      return res.status(404).json({ error: 'Partner not found' })
    }

    // Tell the asker they are in, so their client opens the same session.
    const asker = await User.findById(request.fromUserId).select('displayName')
    const io = getIO()
    if (io) {
      io.to(`user:${String(request.fromUserId)}`).emit('join-request-accepted', {
        requestId: request._id,
        sessionId: started.sessionId,
        partner: started.partner,
        mode: started.mode,
        fromUser: asker ? asker.displayName : 'Your partner'
      })
    }
    sendPush(request.fromUserId, {
      title: "You're in \u{1F3AC}",
      message: `${started.partner.name} pulled you in.`,
      url: '/couple-watch'
    }).catch(() => {})

    res.json(started)
  } catch (error) {
    console.error('Accept join request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Decline: close the request out and let the asker know.
router.post('/join-request/:id/decline', auth, async (req, res) => {
  try {
    const request = await WatchRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (String(request.toUserId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Not your request' })
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'Request already handled' })
    }

    request.status = 'declined'
    request.resolvedAt = new Date()
    await request.save()

    const me = await User.findById(req.userId).select('displayName')
    const io = getIO()
    if (io) {
      io.to(`user:${String(request.fromUserId)}`).emit('join-request-declined', {
        requestId: request._id,
        fromUser: me ? me.displayName : 'Your partner'
      })
    }

    res.json({ declined: true })
  } catch (error) {
    console.error('Decline join request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router