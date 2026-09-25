import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../UserContext.jsx'
import { connectSocket, getSocket } from '../socket.js'
import { apiGet, apiPost } from '../lib/api.js'
import { attachToSession } from '../lib/attachVideo.js'
import { consumePendingSession } from '../videoStore.js'
import { playMessageBeep } from '../utils/notificationSound.js'
import { useNotifications } from '../context/NotificationContext.jsx'

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
  const { notify } = useNotifications()
  const [session, setSession] = useState(loadPersisted)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [video, setVideo] = useState(null)
  const [playback, setPlayback] = useState({ isPlaying: false, currentTime: 0 })
  const [connected, setConnected] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerOnline, setPartnerOnline] = useState(true)
  const [offlineDeadline, setOfflineDeadline] = useState(null)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [incomingInvite, setIncomingInvite] = useState(null)
  const typingTimerRef = useRef(null)
  const playbackRef = useRef(playback)

  useEffect(() => {
    playbackRef.current = playback
  }, [playback])

  const sessionId = session ? session.sessionId : null
  const mode = session ? session.mode : null

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
      setPartnerTyping(false)
      setPartnerOnline(true)
      setOfflineDeadline(null)
      setSessionPaused(false)
      setIncomingInvite(null)
      fetchSession(next.sessionId)
    },
    [fetchSession]
  )

  const leaveSession = useCallback(() => {
    const s = getSocket()
    if (s && sessionId) {
      s.emit('user-stop-typing')
      s.emit('leave-session')
    }
    setSession(null)
    setMessages([])
    setParticipants([])
    setVideo(null)
    setPlayback({ isPlaying: false, currentTime: 0 })
    setPartnerTyping(false)
    setPartnerOnline(true)
    setOfflineDeadline(null)
    setSessionPaused(false)
    setIncomingInvite(null)
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
      'message-received': (msg) => {
        setMessages((prev) => [...prev, msg].slice(-200))
        if (msg && msg.senderName && msg.senderId !== user.id) {
          playMessageBeep()
          notify(`New message from ${msg.senderName}`, 'info')
        }
      },
      'session-video': (data) => setVideo(data && data.video ? data.video : null),
      'playback-update': (data) =>
        setPlayback((prev) => ({ ...prev, isPlaying: !!data.isPlaying, currentTime: data.currentTime || 0 })),
      'session-state': (data) => {
        if (!data) return
        if (data.video) setVideo(data.video)
        if (data.playback) setPlayback(data.playback)
        if (Array.isArray(data.messages)) setMessages(data.messages)
      },
      'partner-typing': () => {
        setPartnerTyping(true)
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setPartnerTyping(false), 3000)
      },
      'partner-stopped-typing': () => {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        setPartnerTyping(false)
      },
      'session-paused': (data) => {
        setSessionPaused(true)
        if (data && data.reason === 'partner-disconnected') {
          setPartnerOnline(false)
          setOfflineDeadline(Date.now() + 10 * 60 * 1000)
          notify('Partner disconnected — waiting to reconnect...', 'warning', 6000)
        }
      },
      'session-resumed': () => setSessionPaused(false),
      'session-ended': () => {
        setSessionPaused(false)
        setOfflineDeadline(null)
      },
      'partner-offline': (data) => {
        setPartnerOnline(false)
        setOfflineDeadline(Date.now() + (data && data.timeoutMinutes ? data.timeoutMinutes : 10) * 60 * 1000)
        setSessionPaused(true)
        notify('Partner disconnected — pausing the movie', 'warning', 6000)
        const s = getSocket()
        if (s && sessionId) {
          s.emit('pause-video', { currentTime: playbackRef.current ? playbackRef.current.currentTime || 0 : 0 })
        }
      },
      'invite-to-watch': (data) => {
        if (data) setIncomingInvite(data)
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
    const onPaired = async (data) => {
      if (!data || !data.sessionId) return
      if (handledPairRef.current === data.sessionId) return
      handledPairRef.current = data.sessionId
      openLiveSession({
        sessionId: data.sessionId,
        mode: data.mode || 'couple',
        partner: data.partner
      })
      const pending = consumePendingSession()
      if (pending && pending.audience === 'partner') {
        try {
          await attachToSession(data.sessionId, pending)
        } catch (e) {
          /* movie attached best-effort */
        }
      }
      if (navigate) navigate('couple-watch')
    }
    s.on('paired', onPaired)
    return () => s.off('paired', onPaired)
  }, [sessionId, openLiveSession, navigate])

  // Partner back online: auto-resume the shared playback
  useEffect(() => {
    if (!sessionId || mode !== 'couple') return
    const partnerId = session && session.partner ? session.partner.id : null
    const online = partnerId ? participants.some((p) => p.id === partnerId) : partnerOnline

    if (online && !partnerOnline) {
      setPartnerOnline(true)
      setOfflineDeadline(null)
      setSessionPaused(false)
      clearTimeout(typingTimerRef.current)
      notify('Partner is back — resuming the movie', 'success')
      const cur = playbackRef.current ? playbackRef.current.currentTime || 0 : 0
      apiPost(`/api/sessions/${sessionId}/resume`, { currentTime: cur }).catch(() => {})
      const s = getSocket()
      if (s) s.emit('play-video', { currentTime: cur })
    }
  }, [participants, sessionId, mode, session, partnerOnline, notify])

  // Offline countdown: end the session if the partner doesn't return in time
  useEffect(() => {
    if (!offlineDeadline) return undefined
    const timer = setInterval(() => {
      if (Date.now() >= offlineDeadline) {
        setOfflineDeadline(null)
        setSessionPaused(false)
        notify("Session expired — your partner didn't return in time", 'warning', 5000)
        const sid = sessionId
        if (sid) apiPost(`/api/sessions/${sid}/end`, {}).catch(() => {})
        leaveSession()
        if (navigate) navigate('dashboard')
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [offlineDeadline, notify, leaveSession, sessionId, navigate])

  const emitTypingStart = useCallback(() => {
    const s = getSocket()
    if (!s || !sessionId) return
    s.emit('user-typing')
  }, [sessionId])

  const emitTypingStop = useCallback(() => {
    const s = getSocket()
    if (!s || !sessionId) return
    s.emit('user-stop-typing')
  }, [sessionId])

  const clearInvite = useCallback(() => setIncomingInvite(null), [])

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
      mode,
      code: session ? session.code : null,
      partner: session ? session.partner : null,
      host: session ? session.host : null,
      messages,
      participants,
      video,
      playback,
      connected,
      partnerTyping,
      partnerOnline,
      offlineDeadline,
      sessionPaused,
      incomingInvite,
      openLiveSession,
      leaveSession,
      createGroupSession,
      joinCouple,
      joinGroup,
      setSessionVideo,
      sendMessage,
      updatePlayback,
      emitTypingStart,
      emitTypingStop,
      clearInvite
    }),
    [
      session,
      sessionId,
      messages,
      participants,
      video,
      playback,
      connected,
      partnerTyping,
      partnerOnline,
      offlineDeadline,
      sessionPaused,
      incomingInvite,
      openLiveSession,
      leaveSession,
      createGroupSession,
      joinCouple,
      joinGroup,
      setSessionVideo,
      sendMessage,
      updatePlayback,
      emitTypingStart,
      emitTypingStop,
      clearInvite
    ]
  )

  return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>
}

export const useLiveSession = () => useContext(LiveSessionContext)