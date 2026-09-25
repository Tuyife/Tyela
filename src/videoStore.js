let pendingFile = null
let pendingTitle = ''
let pendingUrl = ''

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