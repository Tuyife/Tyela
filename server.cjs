const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
const jwt = require('jsonwebtoken')
const { Server: SocketIOServer } = require('socket.io')
const authRoutes = require('./routes/auth.js')
const connectionRoutes = require('./routes/connection.js')
const sessionRoutes = require('./routes/sessions.js')
const profileRoutes = require('./routes/profile.js')
const inviteRoutes = require('./routes/invites.js')
const historyRoutes = require('./routes/history.js')
const tutorialRoutes = require('./routes/tutorial.js')
const notificationsRoutes = require('./routes/notifications.js')
const { sendPush } = require('./utils/push.js')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { WatchSession } = require('./models/User.js')
const Invite = require('./models/Invite.js')
const { setIO } = require('./utils/io.js')
const { markOnline, markOffline, sessionRooms, joinSessionRoom, leaveSessionRoom } = require('./utils/presence.js')

dotenv.config()

const app = express()
const server = http.createServer(app)

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
})
setIO(io)

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.set('trust proxy', true)

// Health check (works even while MongoDB is retrying)
app.get('/api/health', (req, res) => {
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting']
  res.json({
    ok: true,
    mongo: mongoStates[mongoose.connection.readyState] || 'unknown',
    time: new Date().toISOString()
  })
})

// Serve uploaded avatars
const avatarsPath = path.join(__dirname, 'public', 'avatars')
fs.mkdirSync(avatarsPath, { recursive: true })
app.use('/avatars', express.static(avatarsPath))

// Serve session video uploads
const uploadsPath = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsPath, { recursive: true })
app.use('/uploads', express.static(uploadsPath))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/connection', connectionRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/tutorial', tutorialRoutes)
app.use('/api/notifications', notificationsRoutes)

// Multer + file filter error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload size limit' : err.message
    return res.status(400).json({ error: message })
  }
  if (err) {
    return res.status(400).json({ error: err.message })
  }
  next()
})

// -------------------- Live layer: presence / chat / playback --------------------

// sessionId -> Map<userId, brief>
// Shared with utils/presence.js so route handlers can read live membership.
const sessionUsers = sessionRooms

function getBrief(sessionId, userId) {
  const room = sessionUsers.get(sessionId)
  if (!room) return { id: userId, name: 'User', avatarUrl: '' }
  return room.get(userId) || { id: userId, name: 'User', avatarUrl: '' }
}

function removePresence(sessionId, userId) {
  leaveSessionRoom(sessionId, userId)
}

function broadcastPresence(sessionId) {
  const room = sessionUsers.get(sessionId)
  const list = room ? Array.from(room.values()) : []
  io.to(`session:${sessionId}`).emit('presence-update', list)
}

function updateDb(sessionId, update) {
  return WatchSession.findByIdAndUpdate(sessionId, update).catch(() => {})
}

// Send a push notification to every member of a session except one user.
// Fire-and-forget: never blocks the socket flow when push is misconfigured.
function notifySessionMembers(sessionId, exceptUserId, payload) {
  return WatchSession.findById(sessionId)
    .select('sessionType couple group')
    .then((doc) => {
      if (!doc) return
      let ids = []
      if (doc.sessionType === 'couple') {
        ids = [doc.couple && doc.couple.user1Id, doc.couple && doc.couple.user2Id]
      } else if (doc.sessionType === 'group') {
        ids = [doc.group && doc.group.hostId, ...(doc.group && doc.group.participantIds) || []]
      }
      const except = String(exceptUserId || '')
      const unique = [
        ...new Set(ids.filter(Boolean).map((id) => String(id)).filter((id) => id !== except))
      ]
      unique.forEach((id) => sendPush(id, payload).catch(() => {}))
    })
    .catch(() => {})
}

io.on('connection', (socket) => {
  // Authenticate socket with JWT
  const token = socket.handshake.auth && socket.handshake.auth.token
  let userId = null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    userId = decoded.userId
  } catch (error) {
    /* invalid token */
  }
  if (!userId) {
    socket.disconnect(true)
    return
  }
  socket.userId = userId
  socket.sessionId = null
  socket.join(`user:${userId}`)
  socket.userName = 'User'
  socket.avatarUrl = null
  markOnline(socket)
  UserProfile(userId)
    .then((user) => {
      socket.userName = user.name
      socket.avatarUrl = user.avatarUrl
    })
    .catch(() => {})

  socket.on('join-session', ({ sessionId }) => {
    if (!sessionId) return
    const room = `session:${sessionId}`
    socket.join(room)
    socket.sessionId = sessionId

    joinSessionRoom(sessionId, userId, { id: userId, name: socket.userName, avatarUrl: socket.avatarUrl })
    broadcastPresence(sessionId)

    socket.to(room).emit('user-joined', { userId, name: socket.userName })

    WatchSession.findById(sessionId)
      .select('video playbackState messages')
      .then((doc) => {
        if (doc) {
          socket.emit('session-state', {
            video: doc.video && doc.video.url ? doc.video : null,
            playback: doc.playbackState,
            messages: doc.messages || []
          })
        }
      })
      .catch(() => {})
  })

  socket.on('leave-session', () => {
    closeSession()
  })

  socket.on('play-video', ({ currentTime }) => {
    const sessionId = socket.sessionId
    if (!sessionId) return
    updateDb(sessionId, {
      playbackState: { isPlaying: true, currentTime: currentTime || 0, lastUpdated: new Date() }
    })
    io.to(`session:${sessionId}`).emit('playback-update', { isPlaying: true, currentTime: currentTime || 0 })
  })

  socket.on('pause-video', ({ currentTime }) => {
    const sessionId = socket.sessionId
    if (!sessionId) return
    updateDb(sessionId, {
      playbackState: { isPlaying: false, currentTime: currentTime || 0, lastUpdated: new Date() }
    })
    io.to(`session:${sessionId}`).emit('playback-update', { isPlaying: false, currentTime: currentTime || 0 })
  })

  socket.on('seek-video', ({ currentTime }) => {
    const sessionId = socket.sessionId
    if (!sessionId) return
    updateDb(sessionId, {
      playbackState: { isPlaying: false, currentTime: currentTime || 0, lastUpdated: new Date() }
    })
    io.to(`session:${sessionId}`).emit('playback-update', { isPlaying: false, currentTime: currentTime || 0 })
  })

  socket.on('sync-wait', ({ currentTime }) => {
    const sessionId = socket.sessionId
    const room = sessionId ? `session:${sessionId}` : null
    if (!room) return
    socket.to(room).emit('peer-waiting', {
      userId,
      name: socket.userName || 'Your partner',
      currentTime: currentTime || 0
    })
  })

  socket.on('sync-ready', ({ currentTime }) => {
    const sessionId = socket.sessionId
    const room = sessionId ? `session:${sessionId}` : null
    if (!room) return
    socket.to(room).emit('peer-ready', {
      userId,
      name: socket.userName || 'Your partner',
      currentTime: currentTime || 0
    })
  })

  socket.on('send-message', ({ content, movieTimestamp }) => {
    const sessionId = socket.sessionId
    if (!sessionId || !content || !content.trim()) return
    const msg = {
      _id: new mongoose.Types.ObjectId(),
      senderId: userId,
      senderName: socket.userName || 'User',
      content: content.trim(),
      movieTimestamp: movieTimestamp == null ? null : movieTimestamp,
      timestamp: new Date()
    }
    updateDb(sessionId, { $push: { messages: msg } })
    io.to(`session:${sessionId}`).emit('message-received', msg)
    notifySessionMembers(sessionId, userId, {
      title: `${socket.userName || 'Someone'} says…`,
      message: msg.content.slice(0, 120),
      url: '/dashboard',
      sessionId
    })
  })

  socket.on('user-typing', () => {
    const room = socket.sessionId ? `session:${socket.sessionId}` : null
    if (!room) return
    socket.to(room).emit('partner-typing', { userId, name: socket.userName, avatarUrl: socket.avatarUrl })
  })

  socket.on('user-stop-typing', () => {
    const room = socket.sessionId ? `session:${socket.sessionId}` : null
    if (!room) return
    socket.to(room).emit('partner-stopped-typing', { userId })
  })

  function closeSession() {
    const sessionId = socket.sessionId
    if (!sessionId) return
    socket.leave(`session:${sessionId}`)
    removePresence(sessionId, userId)
    broadcastPresence(sessionId)
    socket.sessionId = null
    if (sessionId) handlePartnerGone(sessionId, userId)
  }

  socket.on('disconnect', () => {
    markOffline(socket)
    closeSession()
  })
})

// When a user leaves a session, close it out if nobody is left, pause it when
// a partner steps away, and let them know — a session that is never ended stays
// "active" in the database and makes the partner look busy forever.
async function handlePartnerGone(sessionId, goneUserId) {
  try {
    const session = await WatchSession.findById(sessionId).select(
      'sessionType couple group video playbackState status'
    )
    if (!session || session.status === 'ended' || session.status === 'cancelled') return
    const room = sessionUsers.get(sessionId)
    const remaining = room && room.size ? Array.from(room.values()).map((u) => u.id) : []

    // Group sessions end with their host; couple sessions end when empty.
    const groupHostGone =
      session.sessionType === 'group' &&
      session.group &&
      String(session.group.hostId) === String(goneUserId)

    if (remaining.length === 0 || groupHostGone) {
      const endedAt = new Date()
      session.status = 'ended'
      session.endedAt = endedAt
      if (session.playbackState) session.playbackState.isPlaying = false
      await session.save()
      io.to(`session:${sessionId}`).emit('session-ended', { sessionId, endedAt })
      return
    }

    if (session.sessionType !== 'couple' || remaining.length !== 1) return

    session.status = 'paused'
    session.pausedAt = new Date()
    if (session.playbackState) session.playbackState.isPlaying = false
    await session.save()

    io.to(`session:${sessionId}`).emit('session-paused', { reason: 'partner-disconnected', sessionId })
    io.to(`session:${sessionId}`).emit('partner-offline', { timeoutMinutes: 10 })

    if (session.video && session.video.url) {
      await Invite.create({
        fromUserId: goneUserId,
        toUserId: remaining[0],
        sessionId,
        sessionType: 'couple',
        sessionTitle: (session.video.title || 'Movie night with partner').slice(0, 80),
        currentPlaybackTime: session.playbackState ? session.playbackState.currentTime : 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      sendPush(remaining[0], {
        title: 'Your partner stepped away',
        message: 'The movie is paused — tap to rejoin whenever you\u2019re ready',
        url: '/dashboard',
        sessionId
      }).catch(() => {})
    }
  } catch (error) {
    /* ignore partner-gone errors */
  }
}

async function UserProfile(userId) {
  try {
    const { User } = require('./models/User.js')
    const u = await User.findById(userId).select('displayName avatarUrl')
    if (u) return { name: u.displayName, avatarUrl: u.avatarUrl || '' }
  } catch (error) {
    /* ignore */
  }
  return { name: 'User', avatarUrl: '' }
}

// -------------------- Start --------------------

const PORT = process.env.PORT || 5000

// Connect to MongoDB, retrying forever with a backoff so transient
// database hiccups self-heal instead of killing the API.
let mongoAttempts = 0
function connectWithRetry() {
  mongoAttempts += 1
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tyela', {
      serverSelectionTimeoutMS: 10000
    })
    .then(() => {
      console.log(`MongoDB connected (attempt ${mongoAttempts})`)
    })
    .catch((err) => {
      console.error(`MongoDB connection failed (attempt ${mongoAttempts}):`, err.message)
      console.error('Retrying in 5 seconds...')
      setTimeout(connectWithRetry, 5000)
    })
}
connectWithRetry()

server.listen(PORT, () => {
  console.log(`TYELA server running on port ${PORT}`)
})