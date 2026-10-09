import { API_BASE, uploadWithProgress } from './api.js'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('tyelaToken') || ''}`
  }
}

export async function buildVideoInfo(sessionId, payload, opts = {}) {
  let url = payload.url
  if (payload.file) {
    const form = new FormData()
    form.append('video', payload.file)
    if (payload.title) form.append('title', payload.title)
    const json = await uploadWithProgress(`/api/sessions/${sessionId}/upload`, form, opts)
    if (!json.video || !json.video.url) throw new Error('Upload failed')
    url = json.video.url
  }
  return {
    title: payload.title || 'Shared video',
    url,
    type: payload.type || 'media',
    duration: 0
  }
}

export async function attachToSession(sessionId, payload, opts = {}) {
  if (!sessionId) throw new Error('No active session')
  const info = await buildVideoInfo(sessionId, payload, opts)
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/video`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(info)
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to set the movie')
  return json.video
}