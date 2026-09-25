const express = require('express')
const { User, WatchSession } = require('../models/User.js')
const Invite = require('../models/Invite.js')
const auth = require('../middleware/auth.js')
const { getIO } = require('../utils/io.js')

const router = express.Router()

function isMember(session, userId) {
  if (session.sessionType === 'couple') {
    const couple = session.couple || {}
    return Boolean(
      (couple.user1Id && couple.user1Id.toString() === userId) ||
        (couple.user2Id && couple.user2Id.toString() === userId)
    )
  }
  const group = session.group || {}
  return Boolean(
    (group.hostId && group.hostId.toString() === userId) ||
      (group.participantIds || []).some((p) => p.toString() === userId)
  )
}

async function fromBrief(userId) {
  try {
    const user = await User.findById(userId).select('displayName avatarUrl')
    return user
      ? { name: user.displayName, avatarUrl: user.avatarUrl || '' }
      : { name: 'Friend', avatarUrl: '' }
  } catch (error) {
    return { name: 'Friend', avatarUrl: '' }
  }
}

const EXPIRY_MS = 24 * 60 * 60 * 1000

// Send a "continue watching" invite to another user in the session
router.post('/send', auth, async (req, res) => {
  try {
    const { toUserId, sessionId, currentPlaybackTime } = req.body
    if (!toUserId || !sessionId) {
      return res.status(400).json({ error: 'toUserId and sessionId are required' })
    }

    const session = await WatchSession.findById(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    const title =
      session.video && session.video.title
        ? session.video.title
        : session.sessionType === 'couple'
          ? 'Movie night with partner'
          : 'Group watch'

    const invite = await Invite.create({
      fromUserId: req.userId,
      toUserId,
      sessionId,
      sessionType: session.sessionType,
      sessionTitle: String(title).slice(0, 80),
      currentPlaybackTime: currentPlaybackTime || 0,
      expiresAt: new Date(Date.now() + EXPIRY_MS)
    })

    const from = await fromBrief(req.userId)
    const io = getIO()
    if (io) {
      io.to(`user:${toUserId}`).emit('invite-to-watch', {
        inviteId: invite._id,
        fromUser: from,
        sessionType: invite.sessionType,
        sessionTitle: invite.sessionTitle,
        currentPlaybackTime: invite.currentPlaybackTime,
        expiresAt: invite.expiresAt
      })
    }

    res.json({ inviteId: invite._id, expiresAt: invite.expiresAt })
  } catch (error) {
    console.error('Send invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Pending invites for the current user (expired ones are cleaned up)
router.get('/pending', auth, async (req, res) => {
  try {
    const now = new Date()
    await Invite.updateMany(
      { toUserId: req.userId, status: 'pending', expiresAt: { $lte: now } },
      { status: 'expired' }
    )

    const invites = await Invite.find({ toUserId: req.userId, status: 'pending', expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .limit(5)

    const list = await Promise.all(
      invites.map(async (invite) => ({
        inviteId: invite._id,
        sessionId: invite.sessionId,
        fromUser: await fromBrief(invite.fromUserId),
        sessionType: invite.sessionType,
        sessionTitle: invite.sessionTitle,
        currentPlaybackTime: invite.currentPlaybackTime,
        expiresAt: invite.expiresAt
      }))
    )

    res.json({ invites: list })
  } catch (error) {
    console.error('Pending invites error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Accept an invite: reopen the session and resume playback at the saved position
router.post('/:inviteId/accept', auth, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.inviteId)
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }
    if (invite.toUserId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }
    if (new Date(invite.expiresAt) < new Date()) {
      invite.status = 'expired'
      await invite.save()
      return res.status(400).json({ error: 'Invite expired' })
    }

    invite.status = 'accepted'
    await invite.save()

    const session = await WatchSession.findById(invite.sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    session.status = 'active'
    session.resumedAt = new Date()
    session.playbackState = {
      isPlaying: true,
      currentTime: invite.currentPlaybackTime || session.playbackState?.currentTime || 0,
      lastUpdated: new Date()
    }
    await session.save()

    const data = session.toObject()
    res.json({
      success: true,
      sessionId: data._id,
      sessionType: data.sessionType,
      currentPlaybackTime: session.playbackState.currentTime,
      video: data.video && data.video.url ? data.video : null,
      playback: data.playbackState
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Decline an invite
router.post('/:inviteId/decline', auth, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.inviteId)
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }
    if (invite.toUserId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }
    invite.status = 'declined'
    await invite.save()
    res.json({ success: true, inviteId: invite._id })
  } catch (error) {
    console.error('Decline invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router