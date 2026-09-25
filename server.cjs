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
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { WatchSession } = require('./models/User.js')
const { setIO } = require('./utils/io.js')

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
const sessionUsers = new Map()

function getBrief(sessionId, userId) {
  const room = sessionUsers.get(sessionId)
  if (!room) return { id: userId, name: 'User', avatarUrl: '' }
  return room.get(userId) || { id: userId, name: 'User', avatarUrl: '' }
}

function removePresence(sessionId, userId) {
  const room = sessionUsers.get(sessionId)
  if (!room) return
  room.delete(userId)
  if (room.size === 0) sessionUsers.delete(sessionId)
}

function broadcastPresence(sessionId) {
  const room = sessionUsers.get(sessionId)
  const list = room ? Array.from(room.values()) : []
  io.to(`session:${sessionId}`).emit('presence-update', list)
}

function updateDb(sessionId, update) {
  return WatchSession.findByIdAndUpdate(sessionId, update).catch(() => {})
}

io.on('connection', async (socket) => {
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

  const user = await UserProfile(userId)
  socket.userName = user.name
  socket.avatarUrl = user.avatarUrl

  socket.on('join-session', ({ sessionId }) => {
    if (!sessionId) return
    const room = `session:${sessionId}`
    socket.join(room)
    socket.sessionId = sessionId

    let users = sessionUsers.get(sessionId)
    if (!users) {
      users = new Map()
      sessionUsers.set(sessionId, users)
    }
    users.set(userId, { id: userId, name: socket.userName, avatarUrl: socket.avatarUrl })
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
  })

  function closeSession() {
    if (socket.sessionId) {
      const sessionId = socket.sessionId
      socket.leave(`session:${sessionId}`)
      removePresence(sessionId, userId)
      broadcastPresence(sessionId)
      socket.sessionId = null
    }
  }

  socket.on('disconnect', () => {
    closeSession()
  })
})

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

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tyela', {
    serverSelectionTimeoutMS: 8000
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    console.error('Start MongoDB (or set MONGODB_URI in .env) for auth and sessions to work.')
  })

server.listen(PORT, () => {
  console.log(`TYELA server running on port ${PORT}`)
})