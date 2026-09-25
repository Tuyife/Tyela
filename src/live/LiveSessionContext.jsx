import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../UserContext.jsx'
import { connectSocket, getSocket } from '../socket.js'
import { apiGet, apiPost } from '../lib/api.js'

const LiveSessionContext = createContext(null)

function loadPersisted() {
  try {
    const raw = localStorage.getItem('tyelaLive')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const LiveSessionProvider = ({ children, navigate }) => {
  const { user, isLoggedIn } = useUser()
  const [session, setSession] = useState(loadPersisted)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [video, setVideo] = useState(null)
  const [playback, setPlayback] = useState({ isPlaying: false, currentTime: 0 })
  const [connected, setConnected] = useState(false)

  const sessionId = session ? session.sessionId : null

  const fetchSession = useCallback(async (id) => {
    if (!id) return
    try {
      const data = await apiGet(`/api/sessions/${id}`)
      const s = data.session
      setVideo(s && s.video && s.video.url ? s.video : null)
      setPlayback(s && s.playbackState ? s.playbackState : { isPlaying: false, currentTime: 0 })
      setMessages((s && s.messages) || [])
      setParticipants((s && s.participants) || [])
    } catch (error) {
      /* session may be gone - keep current state */
    }
  }, [])

  const openLiveSession = useCallback(
    (next) => {
      setSession(next)
      try {
        localStorage.setItem('tyelaLive', JSON.stringify(next))
      } catch (error) {
        /* ignore */
      }
      setMessages([])
      setVideo(null)
      setPlayback({ isPlaying: false, currentTime: 0 })
      fetchSession(next.sessionId)
    },
    [fetchSession]
  )

  const leaveSession = useCallback(() => {
    const s = getSocket()
    if (s && sessionId) s.emit('leave-session')
    setSession(null)
    setMessages([])
    setParticipants([])
    setVideo(null)
    setPlayback({ isPlaying: false, currentTime: 0 })
    try {
      localStorage.removeItem('tyelaLive')
    } catch (error) {
      /* ignore */
    }
  }, [sessionId])

  // Ensure a socket exists once logged in
  useEffect(() => {
    if (!isLoggedIn) return
    const token = localStorage.getItem('tyelaToken')
    if (token && !getSocket()) connectSocket(token)
  }, [isLoggedIn])

  // Clear live state when logged out
  useEffect(() => {
    if (!isLoggedIn && session) {
      setSession(null)
      setMessages([])
      setParticipants([])
      setVideo(null)
      try {
        localStorage.removeItem('tyelaLive')
      } catch (error) {
        /* ignore */
      }
    }
  }, [isLoggedIn, session])

  // Socket events
  useEffect(() => {
    const s = getSocket()
    if (!s) return undefined

    const onConnect = () => {
      setConnected(true)
      if (sessionId) s.emit('join-session', { sessionId })
    }
    const onDisconnect = () => setConnected(false)

    const handlers = {
      'presence-update': (list) => setParticipants(list || []),
      'message-received': (msg) => setMessages((prev) => [...prev, msg].slice(-200)),
      'session-video': (data) => setVideo(data && data.video ? data.video : null),
      'playback-update': (data) =>
        setPlayback((prev) => ({ ...prev, isPlaying: !!data.isPlaying, currentTime: data.currentTime || 0 })),
      'session-state': (data) => {
        if (!data) return
        if (data.video) setVideo(data.video)
        if (data.playback) setPlayback(data.playback)
        if (Array.isArray(data.messages)) setMessages(data.messages)
      }
    }
    Object.entries(handlers).forEach(([event, fn]) => s.on(event, fn))
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    if (s.connected && sessionId) s.emit('join-session', { sessionId })

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      Object.entries(handlers).forEach(([event, fn]) => s.off(event, fn))
    }
  }, [sessionId])

  // When paired (couple): the code generator gets notified and is auto-navigated
  const handledPairRef = useRef(null)
  useEffect(() => {
    const s = getSocket()
    if (!s || sessionId) return undefined
    const onPaired = (data) => {
      if (!data || !data.sessionId) return
      if (handledPairRef.current === data.sessionId) return
      handledPairRef.current = data.sessionId
      openLiveSession({
        sessionId: data.sessionId,
        mode: data.mode || 'couple',
        partner: data.partner
      })
      if (navigate) navigate('couple-watch')
    }
    s.on('paired', onPaired)
    return () => s.off('paired', onPaired)
  }, [sessionId, openLiveSession, navigate])

  const createGroupSession = useCallback(async () => {
    const data = await apiPost('/api/sessions/create', {})
    const next = { sessionId: data.sessionId, mode: 'group', code: data.code, role: 'host' }
    openLiveSession(next)
    return next
  }, [openLiveSession])

  const joinCouple = useCallback(
    async (code) => {
      const data = await apiPost('/api/connection/connect', { code })
      const next = {
        sessionId: data.sessionId,
        mode: 'couple',
        code,
        partner: data.partner
      }
      openLiveSession(next)
      return next
    },
    [openLiveSession]
  )

  const joinGroup = useCallback(
    async (code) => {
      const data = await apiPost('/api/sessions/join', { code })
      const next = {
        sessionId: data.sessionId,
        mode: 'group',
        code,
        host: data.host
      }
      openLiveSession(next)
      return next
    },
    [openLiveSession]
  )

  const setSessionVideo = useCallback(
    async (videoInfo) => {
      if (!sessionId) return null
      const data = await apiPost(`/api/sessions/${sessionId}/video`, videoInfo)
      setVideo(data.video)
      return data.video
    },
    [sessionId]
  )

  const sendMessage = useCallback(
    (content, movieTimestamp = null) => {
      const s = getSocket()
      if (!s || !sessionId || !content || !content.trim()) return
      s.emit('send-message', { content: content.trim(), movieTimestamp })
    },
    [sessionId]
  )

  const updatePlayback = useCallback(
    (kind, currentTime = 0) => {
      const s = getSocket()
      if (!s || !sessionId) return
      if (kind === 'play') {
        setPlayback((p) => ({ ...p, isPlaying: true, currentTime }))
        s.emit('play-video', { currentTime })
      } else if (kind === 'pause') {
        setPlayback((p) => ({ ...p, isPlaying: false, currentTime }))
        s.emit('pause-video', { currentTime })
      } else {
        setPlayback((p) => ({ ...p, isPlaying: false, currentTime }))
        s.emit('seek-video', { currentTime })
      }
    },
    [sessionId]
  )

  const value = useMemo(
    () => ({
      session,
      sessionId,
      mode: session ? session.mode : null,
      code: session ? session.code : null,
      partner: session ? session.partner : null,
      host: session ? session.host : null,
      messages,
      participants,
      video,
      playback,
      connected,
      openLiveSession,
      leaveSession,
      createGroupSession,
      joinCouple,
      joinGroup,
      setSessionVideo,
      sendMessage,
      updatePlayback
    }),
    [
      session,
      sessionId,
      messages,
      participants,
      video,
      playback,
      connected,
      openLiveSession,
      leaveSession,
      createGroupSession,
      joinCouple,
      joinGroup,
      setSessionVideo,
      sendMessage,
      updatePlayback
    ]
  )

  return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>
}

export const useLiveSession = () => useContext(LiveSessionContext)