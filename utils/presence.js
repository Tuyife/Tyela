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

module.exports = { markOnline, markOffline, isOnline }