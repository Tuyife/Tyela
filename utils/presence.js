// Lightweight in-memory presence: tracks which users currently have
// a connected socket. Used for accurate "online" indicators.

const online = new Map() // userId (string) -> Set of socket ids

function markOnline(socket) {
  const id = socket.userId
  if (!id) return
  const key = String(id)
  const set = online.get(key) || new Set()
  set.add(socket.id)
  online.set(key, set)
}

function markOffline(socket) {
  const id = socket.userId
  if (!id) return
  const key = String(id)
  const set = online.get(key)
  if (!set) return
  set.delete(socket.id)
  if (set.size === 0) online.delete(key)
}

function isOnline(userId) {
  if (!userId) return false
  return online.has(String(userId))
}

// Live session membership: sessionId (string) -> Map<userId, brief>.
// Shared with the socket layer so route handlers can ask "is this partner
// actually watching right now?" instead of trusting a stale session status.
const sessionRooms = new Map()

function joinSessionRoom(sessionId, userId, brief) {
  if (!sessionId || !userId) return
  const key = String(sessionId)
  let room = sessionRooms.get(key)
  if (!room) {
    room = new Map()
    sessionRooms.set(key, room)
  }
  room.set(String(userId), brief || { id: String(userId), name: 'User', avatarUrl: '' })
}

function leaveSessionRoom(sessionId, userId) {
  const room = sessionRooms.get(String(sessionId))
  if (!room) return
  room.delete(String(userId))
  if (room.size === 0) sessionRooms.delete(String(sessionId))
}

function sessionMemberIds(sessionId) {
  const room = sessionRooms.get(String(sessionId))
  return room ? Array.from(room.keys()) : []
}

module.exports = {
  markOnline,
  markOffline,
  isOnline,
  sessionRooms,
  joinSessionRoom,
  leaveSessionRoom,
  sessionMemberIds
}