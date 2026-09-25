import { io } from 'socket.io-client'

const BASE = typeof import.meta !== 'undefined' ? (import.meta.env.VITE_API_URL || '') : ''
let socket = null

export function connectSocket(token) {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  if (!token) return null
  socket = io(BASE, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 10000
  })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}