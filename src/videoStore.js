let pendingFile = null
let pendingTitle = ''
let pendingUrl = ''
let pendingSession = null

export function setPendingVideo(file, title) {
  pendingFile = file
  pendingTitle = title || (file && file.name) || ''
  pendingUrl = ''
}

export function setPendingLink(url, title) {
  pendingUrl = url
  pendingTitle = title || ''
  pendingFile = null
}

export function getPendingVideo() {
  return { file: pendingFile, title: pendingTitle, url: pendingUrl }
}

export function setPendingSession(info) {
  pendingSession = { ...info }
}

export function getPendingSession() {
  return pendingSession
}

export function consumePendingSession() {
  const p = pendingSession
  pendingSession = null
  return p
}