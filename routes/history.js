const express = require('express')
const { User, WatchSession } = require('../models/User.js')
const auth = require('../middleware/auth.js')

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

async function participantsFor(session) {
  const ids =
    session.sessionType === 'couple'
      ? [session.couple && session.couple.user1Id, session.couple && session.couple.user2Id].filter(Boolean)
      : [session.group && session.group.hostId, ...((session.group && session.group.participantIds) || [])].filter(Boolean)
  const users = await User.find({ _id: { $in: ids } }).select('displayName avatarUrl')
  const map = new Map(users.map((u) => [u._id.toString(), { id: u._id, name: u.displayName, avatarUrl: u.avatarUrl || '' }]))
  return ids.map((id) => map.get(id.toString()) || { id, name: 'User', avatarUrl: '' })
}

function toListItem(session, participants, currentUserId) {
  const s = session.toObject()
  const other =
    s.sessionType === 'couple'
      ? participants.find((p) => p.id && p.id.toString() !== String(currentUserId)) || null
      : null
  const started = s.startedAt ? new Date(s.startedAt).getTime() : Date.now()
  const ended = s.endedAt ? new Date(s.endedAt).getTime() : Date.now()
  const durationMinutes = Math.max(0, Math.round((ended - started) / 60000))
  return {
    id: s._id,
    sessionType: s.sessionType,
    video: s.video && s.video.url ? s.video : null,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMinutes,
    partner: other,
    participantCount: participants.length
  }
}

// List watch history for the current user (paginated, 10 per page)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const filter = {
      $or: [
        { 'couple.user1Id': req.userId },
        { 'couple.user2Id': req.userId },
        { 'group.hostId': req.userId },
        { 'group.participantIds': req.userId }
      ]
    }

    const total = await WatchSession.countDocuments(filter)
    const sessions = await WatchSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    const list = await Promise.all(
      sessions.map(async (session) => toListItem(session, await participantsFor(session), req.userId))
    )

    res.json({ sessions: list, page, hasMore: skip + list.length < total, total })
  } catch (error) {
    console.error('History list error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete a watch session (also removes all its messages)
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const session = await WatchSession.findById(req.params.sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    await WatchSession.findByIdAndDelete(session._id)
    res.json({ success: true, deleted: req.params.sessionId })
  } catch (error) {
    console.error('History delete error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router