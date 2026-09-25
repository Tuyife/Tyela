import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { connectSocket, disconnectSocket } from './socket.js'
import { API_BASE } from './lib/api.js'

const UserContext = createContext(null)

export const THEME_COLORS = ['purple', 'pink', 'teal', 'amber']

const DEFAULT_USER = {
  id: 'demo-user',
  email: 'you@tyela.app',
  displayName: 'You',
  bio: '',
  avatarUrl: '',
  themeColor: 'purple'
}

export function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function loadLocalUser() {
  try {
    const raw = localStorage.getItem('tyelaUser')
    if (raw) return { ...DEFAULT_USER, ...JSON.parse(raw) }
  } catch (error) {
    /* ignore corrupted storage */
  }
  return DEFAULT_USER
}

function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function postAuth(path, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${API_BASE}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timer)
    const json = await res.json().catch(() => ({}))
    if (res.ok) return json
    if (res.status >= 400 && res.status < 500 && json.error) {
      throw new Error(json.error)
    }
    return null
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      return null
    }
    throw error
  }
}

async function checkTokenValid(token) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const json = await res.json().catch(() => ({}))
    return json.valid === true
  } catch (error) {
    return null
  }
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(loadLocalUser)
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('tyelaLoggedIn') === 'true'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-user-theme', user.themeColor || 'purple')
  }, [user.themeColor])

  useEffect(() => {
    try {
      localStorage.setItem('tyelaUser', JSON.stringify(user))
    } catch (error) {
      /* storage quota hit (large data-URL avatar) - ignore, keep in memory */
    }
  }, [user])

  const completeAuth = useCallback((userData, token) => {
    const nextUser = { ...DEFAULT_USER, ...userData }
    setUser(nextUser)
    try {
      localStorage.setItem('tyelaUser', JSON.stringify(nextUser))
      if (token) localStorage.setItem('tyelaToken', token)
      localStorage.setItem('tyelaLoggedIn', 'true')
    } catch (error) {
      /* storage unavailable - keep in memory */
    }
    setIsLoggedIn(true)
    if (token) connectSocket(token)
  }, [])

  // Restore the socket on page reload when a token exists
  useEffect(() => {
    const token = localStorage.getItem('tyelaToken')
    if (localStorage.getItem('tyelaLoggedIn') === 'true' && token) {
      connectSocket(token)
    }
  }, [])

  const signIn = useCallback(
    async (email, password) => {
      let data
      try {
        data = await postAuth('login', { email, password })
      } catch (error) {
        return { ok: false, error: error.message || 'Could not sign in' }
      }
      if (data) {
        completeAuth(data.user, data.token)
        return { ok: true }
      }
      return { ok: false, error: 'Could not reach the server. Make sure the backend is running.' }
    },
    [completeAuth]
  )

  const signUp = useCallback(
    async ({ displayName, email, password }) => {
      let data
      try {
        data = await postAuth('register', { displayName, email, password })
      } catch (error) {
        return { ok: false, error: error.message || 'Could not create account' }
      }
      if (data) {
        completeAuth(data.user, data.token)
        return { ok: true }
      }
      return { ok: false, error: 'Could not reach the server. Make sure the backend is running.' }
    },
    [completeAuth]
  )

  const logout = useCallback(() => {
    disconnectSocket()
    try {
      ;['tyelaToken', 'tyelaLoggedIn', 'tyelaUser', 'tyelaLive', 'tyelaMode', 'tyelaFirstVisit'].forEach((k) =>
        localStorage.removeItem(k)
      )
    } catch (error) {
      /* ignore */
    }
    setUser(DEFAULT_USER)
    setIsLoggedIn(false)
  }, [])

  // On load: verify a stored session server-side. Invalid/expired tokens are
  // cleared so a stale login never sticks (e.g. after the secret rotates).
  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('tyelaToken')
    if (localStorage.getItem('tyelaLoggedIn') !== 'true' || !token) return undefined

    checkTokenValid(token).then((valid) => {
      if (cancelled || valid === null) return
      if (valid) {
        fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (cancelled || !json || !json.user) return
            const refreshed = { ...DEFAULT_USER, ...json.user }
            setUser(refreshed)
            try {
              localStorage.setItem('tyelaUser', JSON.stringify(refreshed))
            } catch (error) {
              /* ignore */
            }
          })
          .catch(() => {})
        return
      }
      disconnectSocket()
      try {
        ;['tyelaToken', 'tyelaLoggedIn', 'tyelaUser', 'tyelaLive', 'tyelaMode', 'tyelaFirstVisit'].forEach((k) =>
          localStorage.removeItem(k)
        )
      } catch (error) {
        /* ignore */
      }
      setUser(DEFAULT_USER)
      setIsLoggedIn(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const updateProfile = useCallback(
    async (data, avatarFile) => {
      let nextUser = { ...user, ...data }

      if (avatarFile) {
        try {
          nextUser.avatarUrl = await resizeImage(avatarFile, 200)
        } catch (error) {
          nextUser.avatarUrl = URL.createObjectURL(avatarFile)
        }
      }

      setUser(nextUser)

      const token = localStorage.getItem('tyelaToken')
      if (!token) {
        return { ok: true, demo: true }
      }

      try {
        const form = new FormData()
        form.append('displayName', nextUser.displayName || '')
        form.append('bio', nextUser.bio || '')
        form.append('themeColor', nextUser.themeColor || 'purple')
        if (avatarFile) form.append('avatar', avatarFile)
        const res = await fetch(`${API_BASE}/api/profile/update`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        })
        if (res.ok) {
          const json = await res.json()
          if (json.user) setUser((prev) => ({ ...prev, ...json.user }))
          return { ok: true }
        }
        return { ok: false, error: (await res.json()).error || 'Could not save profile' }
      } catch (error) {
        return { ok: true, demo: true }
      }
    },
    [user]
  )

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      signIn,
      signUp,
      logout,
      updateProfile,
      initials: getInitials(user.displayName)
    }),
    [user, isLoggedIn, signIn, signUp, logout, updateProfile]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)