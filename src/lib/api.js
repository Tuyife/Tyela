const BASE = typeof import.meta !== 'undefined' ? (import.meta.env.VITE_API_URL || '') : ''

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('tyelaToken') || ''}`
  }
}

export async function apiGet(url) {
  const res = await fetch(BASE + url, { headers: authHeaders() })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export async function apiPost(url, body = {}) {
  const res = await fetch(BASE + url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export async function apiDelete(url) {
  const res = await fetch(BASE + url, {
    method: 'DELETE',
    headers: authHeaders()
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

// Upload a FormData body with real progress events. `fetch` gives no upload
// progress, so a large video looked frozen; this reports bytes sent, a smoothed
// transfer rate and an ETA, and supports cancellation via an AbortSignal.
export function uploadWithProgress(url, formData, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', BASE + url, true)

    const token = localStorage.getItem('tyelaToken') || ''
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    // Deliberately not setting Content-Type: the browser adds the multipart boundary.

    let lastLoaded = 0
    let lastTime = Date.now()
    let rate = 0 // bytes per millisecond, exponentially smoothed

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      const now = Date.now()
      const dt = now - lastTime
      if (dt >= 250) {
        const instant = (e.loaded - lastLoaded) / dt
        rate = rate > 0 ? rate * 0.7 + instant * 0.3 : instant
        lastLoaded = e.loaded
        lastTime = now
      }
      const remaining = Math.max(0, e.total - e.loaded)
      if (onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: e.total ? Math.round((e.loaded / e.total) * 100) : 0,
          bytesPerSecond: rate > 0 ? Math.round(rate * 1000) : 0,
          etaSeconds: rate > 0 ? Math.round(remaining / (rate * 1000)) : null
        })
      }
    }

    xhr.onload = () => {
      let json = {}
      try {
        json = JSON.parse(xhr.responseText || '{}')
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json)
      else reject(new Error(json.error || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(formData)
  })
}

export { BASE as API_BASE }