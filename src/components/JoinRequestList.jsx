import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useLiveSession } from '../live/LiveSessionContext.jsx'
import useSocketEvent from '../hooks/useSocketEvent.js'
import Avatar from './Avatar.jsx'
import '../App.css'

// Incoming "wants to watch with you" requests, with the accept / decline
// choice. Accepting starts the couple session and drops both of us into it.
// `inline` sits in the dashboard layout; `float` is a card pinned to the top of
// the screen so a request still reaches you while you're inside a session.
const JoinRequestList = ({ onAccepted, variant = 'inline' }) => {
  const [requests, setRequests] = useState([])
  const { notify } = useNotifications()
  const { openLiveSession } = useLiveSession()
  const location = useLocation()
  // The dashboard shows its own inline copy, so the floating one stands down
  // there - that also keeps us from polling the same list twice.
  const standsDown = variant === 'float' && location.pathname === '/dashboard'
  const loadRef = useRef(() => {})

  useEffect(() => {
    if (standsDown) return undefined
    let cancelled = false
    const load = () => {
      apiGet('/api/connection/join-requests')
        .then((data) => {
          if (!cancelled) setRequests(data.requests || [])
        })
        .catch(() => {})
    }

    loadRef.current = load
    load()
    // Poll as a safety net; the socket event is the fast path.
    const timer = setInterval(load, 10000)
    return () => {
      cancelled = true
      clearInterval(timer)
      loadRef.current = () => {}
    }
  }, [standsDown])

  // A new request refreshes the list, wherever we are.
  useSocketEvent('join-request', () => loadRef.current())

  const handleAccept = async (request) => {
    try {
      const started = await apiPost(`/api/connection/join-request/${request.id}/accept`, {})
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
      openLiveSession({
        sessionId: started.sessionId,
        mode: started.mode || 'couple',
        partner: started.partner
      })
      if (onAccepted) onAccepted()
    } catch (error) {
      notify(error.message || "Couldn't join in", 'error')
    }
  }

  const handleDecline = async (request) => {
    try {
      await apiPost(`/api/connection/join-request/${request.id}/decline`, {})
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
    } catch (error) {
      notify(error.message || "Couldn't decline", 'error')
    }
  }

  if (standsDown || requests.length === 0) return null

  return (
    <div className={`join-requests is-${variant}`}>
      {requests.map((request) => (
        <div className="join-request" key={request.id}>
          <div className="join-request-avatar">
            <Avatar src={request.from.avatarUrl} name={request.from.name} size={40} />
            <span className="join-request-dot" aria-hidden="true" />
          </div>
          <div className="join-request-meta">
            <strong className="join-request-name">{request.from.name}</strong>
            <span className="join-request-hint">Wants to watch with you</span>
          </div>
          <div className="join-request-actions">
            <button
              type="button"
              className="join-request-btn is-decline"
              onClick={() => handleDecline(request)}
            >
              Decline
            </button>
            <button
              type="button"
              className="join-request-btn is-accept"
              onClick={() => handleAccept(request)}
            >
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default JoinRequestList
