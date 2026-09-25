const express = require('express')
const { User, WatchSession } = require('../models/User.js')
const { generateCode } = require('../utils/codeGenerator.js')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const auth = require('../middleware/auth.js')
const { getIO } = require('../utils/io.js')

const router = express.Router()

const uploadsDir = path.join(__dirname, '..', 'uploads')
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true })
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4'
    cb(null, `${crypto.randomUUID()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^video\//.test(file.mimetype) || /\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only video files are supported'))
    }
  }
})

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

async function getUserBrief(id) {
  if (!id) return null
  try {
    const user = await User.findById(id).select('displayName avatarUrl')
    return user
      ? { id: user._id, name: user.displayName, avatarUrl: user.avatarUrl || '' }
      : { id, name: 'User', avatarUrl: '' }
  } catch (error) {
    return { id, name: 'User', avatarUrl: '' }
  }
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

// Create a group watch session (returns room code for inviting others)
router.post('/create', auth, async (req, res) => {
  try {
    const code = generateCode()
    const session = new WatchSession({
      sessionType: 'group',
      group: {
        hostId: req.userId,
        participantIds: [req.userId],
        roomCode: code
      },
      status: 'active'
    })
    await session.save()

    res.json({ sessionId: session._id, code })
  } catch (error) {
    console.error('Create session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Join a group watch session by room code
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ error: 'Room code required' })
    }

    const session = await WatchSession.findOne({
      'group.roomCode': code,
      status: { $ne: 'ended' }
    })
    if (!session) {
      return res.status(404).json({ error: 'Invalid room code' })
    }

    const alreadyIn = (session.group.participantIds || []).some((p) => p.toString() === req.userId)
    if (!alreadyIn) {
      session.group.participantIds.push(req.userId)
      await session.save()
    }

    const host = await getUserBrief(session.group.hostId)
    res.json({ sessionId: session._id, code, host })
  } catch (error) {
    console.error('Join session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Set the video for a session (host or any member starts sharing)
router.post('/:id/video', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { title, url, type, duration } = req.body
    if (!url || !type) {
      return res.status(400).json({ error: 'Video URL and type are required' })
    }

    const session = await WatchSession.findById(id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    session.video = {
      title: title || 'Shared video',
      url,
      type: ['youtube', 'vimeo', 'upload', 'media'].includes(type) ? type : 'media',
      duration: duration || 0
    }
    session.playbackState = { isPlaying: true, currentTime: 0, lastUpdated: new Date() }
    session.status = 'active'
    await session.save()

    const io = getIO()
    if (io) {
      io.to(`session:${id}`).emit('session-video', { video: session.video })
    }

    res.json({ video: session.video })
  } catch (error) {
    console.error('Set video error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Upload a video file for a live session (stored on the server so everyone can watch it together)
router.post('/:id/upload', auth, (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'Video file exceeds 500MB limit' : err.message
        return res.status(400).json({ error: message })
      }
      return res.status(400).json({ error: err.message })
    }

    try {
      const { id } = req.params
      const session = await WatchSession.findById(id)
      if (!session) {
        return res.status(404).json({ error: 'Session not found' })
      }
      if (!isMember(session, req.userId)) {
        return res.status(403).json({ error: 'Not a member of this session' })
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' })
      }

      const title = (req.body && req.body.title) || req.file.originalname.replace(/\.[^.]+$/, '') || 'Live video'
      const video = {
        title,
        url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
        type: 'upload',
        duration: 0
      }
      res.json({ video })
    } catch (error) {
      console.error('Upload video error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })
})

// Get most recent active session for the current user
router.get('/active', auth, async (req, res) => {
  try {
    const session = await WatchSession.findOne({
      status: 'active',
      $or: [
        { 'couple.user1Id': req.userId },
        { 'couple.user2Id': req.userId },
        { 'group.hostId': req.userId },
        { 'group.participantIds': req.userId }
      ]
    }).sort({ createdAt: -1 })

    if (!session) {
      return res.json({ session: null })
    }

    const data = session.toObject()
    data.participants = await participantsFor(session)
    res.json({ session: data })
  } catch (error) {
    console.error('Get active session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Pause a session (user or partner-offline)
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const { id } = req.params
    const reason = req.body && req.body.reason ? req.body.reason : 'user-pause'
    const session = await WatchSession.findById(id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    const pausedAt = new Date()
    session.status = 'paused'
    session.pausedAt = pausedAt
    session.playbackState = {
      isPlaying: false,
      currentTime: session.playbackState.currentTime || 0,
      lastUpdated: pausedAt
    }
    await session.save()

    const io = getIO()
    if (io) {
      io.to(`session:${id}`).emit('session-paused', { reason, sessionId: id, pausedAt })
    }

    res.json({ status: 'paused', sessionId: id, pausedAt })
  } catch (error) {
    console.error('Pause session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Resume a session at a playback position
router.post('/:id/resume', auth, async (req, res) => {
  try {
    const { id } = req.params
    const currentTime = (req.body && req.body.currentTime) || 0
    const session = await WatchSession.findById(id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    const resumedAt = new Date()
    session.status = 'active'
    session.resumedAt = resumedAt
    session.playbackState = { isPlaying: true, currentTime, lastUpdated: resumedAt }
    await session.save()

    const io = getIO()
    if (io) {
      io.to(`session:${id}`).emit('session-resumed', { sessionId: id, resumedAt, currentTime })
      io.to(`session:${id}`).emit('playback-update', { isPlaying: true, currentTime })
    }

    res.json({ status: 'resumed', sessionId: id, resumedAt, currentTime })
  } catch (error) {
    console.error('Resume session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// End a session
router.post('/:id/end', auth, async (req, res) => {
  try {
    const { id } = req.params
    const session = await WatchSession.findById(id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    const endedAt = new Date()
    session.status = 'ended'
    session.endedAt = endedAt
    session.playbackState = {
      isPlaying: false,
      currentTime: session.playbackState.currentTime || 0,
      lastUpdated: endedAt
    }
    await session.save()

    const io = getIO()
    if (io) {
      io.to(`session:${id}`).emit('session-ended', { sessionId: id, endedAt })
    }

    res.json({ status: 'ended', sessionId: id, endedAt })
  } catch (error) {
    console.error('End session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Watch history for the current user (couple + group), most recent first
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await WatchSession.find({
      $or: [
        { 'couple.user1Id': req.userId },
        { 'couple.user2Id': req.userId },
        { 'group.hostId': req.userId },
        { 'group.participantIds': req.userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)

    const history = await Promise.all(
      sessions.map(async (session) => {
        const s = session.toObject()
        const participants = await participantsFor(session)
        const other =
          s.sessionType === 'couple'
            ? participants.find((p) => p.id && p.id.toString() !== req.userId.toString()) || null
            : null
        return {
          id: s._id,
          sessionType: s.sessionType,
          video: s.video && s.video.url ? s.video : null,
          status: s.status,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          partner: other,
          participantCount: participants.length,
          lastChat: (s.messages && s.messages.length ? s.messages[s.messages.length - 1] : null) || null
        }
      })
    )

    res.json({ history })
  } catch (error) {
    console.error('History error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get a full session (video, playback, messages, participants)
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await WatchSession.findById(req.params.id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not a member of this session' })
    }

    const data = session.toObject()
    data.participants = await participantsFor(session)
    res.json({ session: data })
  } catch (error) {
    console.error('Get session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get session messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const session = await WatchSession.findById(req.params.id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    if (!isMember(session, req.userId)) {
      return res.status(403).json({ error: 'Not authorized to view messages' })
    }

    res.json({ messages: session.messages || [] })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router