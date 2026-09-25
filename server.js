import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import authRoutes from './routes/auth.js'
import connectionRoutes from './routes/connection.js'
import sessionRoutes from './routes/sessions.js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const server = http.createServer(app)

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/connection', connectionRoutes)
app.use('/api/sessions', sessionRoutes)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-session', ({ sessionId, userId }) => {
    socket.join(sessionId)
    console.log(`User ${userId} joined session ${sessionId}`)
  })

  socket.on('play-video', ({ sessionId, currentTime }) => {
    socket.to(sessionId).emit('playback-update', { isPlaying: true, currentTime })
  })

  socket.on('pause-video', ({ sessionId, currentTime }) => {
    socket.to(sessionId).emit('playback-update', { isPlaying: false, currentTime })
  })

  socket.on('seek-video', ({ sessionId, currentTime }) => {
    socket.to(sessionId).emit('playback-update', { isPlaying: false, currentTime })
  })

  socket.on('send-message', ({ sessionId, userId, senderName, content }) => {
    socket.to(sessionId).emit('message-received', { senderId: userId, senderName, content, timestamp: new Date(), movieTimestamp: null })
  })

  socket.on('leave-session', ({ sessionId }) => {
    socket.leave(sessionId)
    console.log(`User left session ${sessionId}`)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`TYELA server running on port ${PORT}`)
})

export default io