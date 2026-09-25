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

export { BASE as API_BASE }