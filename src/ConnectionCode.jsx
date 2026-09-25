import { useState, useRef, useEffect, useCallback } from 'react'
import { LuCopy, LuHouse, LuUserCheck, LuUsers } from 'react-icons/lu'
import { apiPost } from './lib/api.js'
import { attachToSession } from './lib/attachVideo.js'
import { consumePendingSession } from './videoStore.js'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import './App.css'

const CODE_TTL_SECONDS = 10 * 60

const ConnectionCode = ({ onNavigate }) => {
  const { createGroupSession, joinCouple, joinGroup } = useLiveSession()
  const mode = (typeof window !== 'undefined' && localStorage.getItem('tyelaMode')) || 'couple'
  const isGroup = mode === 'group'

  const [code, setCode] = useState('')
  const [codeExpired, setCodeExpired] = useState(false)
  const [timeLeft, setTimeLeft] = useState(CODE_TTL_SECONDS)
  const [copied, setCopied] = useState(false)
  const [enterCode, setEnterCode] = useState(
    () => typeof window !== 'undefined' && window.location.search.includes('join=1')
  )
  const [inputCode, setInputCode] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const codeEl = useRef(null)
  const timersRef = useRef([])
  const expiresAtRef = useRef(0)

  const clearTimers = () => {
    timersRef.current.forEach((t) => {
      clearInterval(t)
      clearTimeout(t)
    })
    timersRef.current = []
  }

  const generatePairingCode = useCallback(async () => {
    try {
      const data = await apiPost('/api/connection/generate-code', {})
      setCode(data.code)
      setCodeExpired(false)
      setCopied(false)
      setError('')
      setTimeLeft(CODE_TTL_SECONDS)
      expiresAtRef.current = Date.now() + (data.expiresIn || 10) * 60 * 1000
    } catch (e) {
      setError(e.message)
    }
  }, [])

  // Auto-generate a couple pairing code on mount
  useEffect(() => {
    if (!isGroup) {
      generatePairingCode()
      return clearTimers
    }
    return clearTimers
  }, [isGroup, generatePairingCode])

  // Countdown - when the code hits zero it expires
  useEffect(() => {
    if (!code || codeExpired) return undefined
    const tick = () => {
      const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000))
      setTimeLeft(left)
      if (left <= 0) {
        setCodeExpired(true)
        clearInterval(interval)
      }
    }
    const interval = setInterval(tick, 1000)
    tick()
    timersRef.current.push(interval)
    return () => clearInterval(interval)
  }, [code, codeExpired])

  // When expired, rotate to a fresh code
  useEffect(() => {
    if (!codeExpired || isGroup) return undefined
    const timeout = setTimeout(() => generatePairingCode(), 2000)
    timersRef.current.push(timeout)
    return () => clearTimeout(timeout)
  }, [codeExpired, isGroup, generatePairingCode])

  const handleCopyCode = async () => {
    try {
      if (codeEl.current && code) {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        const timer = setTimeout(() => setCopied(false), 2000)
        timersRef.current.push(timer)
      }
    } catch (err) {
      console.error('Failed to copy code')
    }
  }

  const handleCreateRoom = async () => {
    setLoading(true)
    setError('')
    try {
      const next = await createGroupSession()
      const pending = consumePendingSession()
      if (pending && pending.audience === 'group') {
        try {
          await attachToSession(next.sessionId, pending)
        } catch (e) {
          /* movie attached best-effort */
        }
      }
      onNavigate('group-watch')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnterCode = async () => {
    setError('')
    if (inputCode.trim().length < 6) {
      setError('Please enter the 6-character code')
      return
    }
    setLoading(true)
    try {
      const trimmed = inputCode.trim()
      const primary = isGroup ? joinGroup : joinCouple
      const fallback = isGroup ? joinCouple : joinGroup
      let joined
      try {
        joined = await primary(trimmed)
      } catch (err) {
        if (/invalid|expired|not found/i.test(err.message || '')) {
          joined = await fallback(trimmed)
        } else {
          throw err
        }
      }
      const joinedGroup = joined.mode === 'group'
      const pending = consumePendingSession()
      if (pending && ((joinedGroup && pending.audience === 'group') || (!joinedGroup && pending.audience === 'partner'))) {
        try {
          await attachToSession(joined.sessionId, pending)
        } catch (e) {
          /* movie attached best-effort */
        }
      }
      setSuccess(true)
      setTimeout(() => onNavigate(joinedGroup ? 'group-watch' : 'couple-watch'), 600)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const showHostFlow = isGroup && !success
  const minutes = Math.floor(timeLeft / 60)
  const seconds = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className="connection-code">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuHouse /> Home
      </button>
      <div className="code-header">
        <h2>{isGroup ? 'Host a watch party' : 'Connect with partner'}</h2>
        <p>
          {isGroup
            ? 'Create a room to share a code with friends'
            : 'Enter the 6-character code to pair with your partner'}
        </p>
      </div>

      {showHostFlow && (
        <div className="host-actions">
          <button className="btn-primary" onClick={handleCreateRoom} disabled={loading}>
            <LuUsers size={16} /> {loading ? 'Creating room...' : 'Create a room'}
          </button>
        </div>
      )}

      {!isGroup && (
        <div className="code-display">
          {codeExpired ? (
            <p>Code expired, generating new code...</p>
          ) : (
            <div ref={codeEl} className="code-box">
              {code || '······'}
            </div>
          )}
        </div>
      )}

      {!isGroup && (
        <div className="code-actions">
          <button className="btn-code-copy" onClick={handleCopyCode} aria-label="Copy code">
            {copied ? 'Copied!' : <span><LuCopy size={14} /> Copy</span>}
          </button>
          <div className="code-timer">
            {codeExpired ? 'Rotating code...' : `Expires in ${minutes}:${seconds}`}
          </div>
        </div>
      )}

      {success ? (
        <div className="connection-success">
          <LuUserCheck size={30} className="success-icon" />
          <h3>Connected!</h3>
          <p>{isGroup ? 'You joined the watch party' : "You're now synced with your partner"}</p>
          <button className="btn-primary" onClick={() => onNavigate(isGroup ? 'group-watch' : 'couple-watch')}>
            Join the session
          </button>
        </div>
      ) : (
        <div className="code-input-section">
          {enterCode ? (
            <div className="enter-code">
              <input
                type="text"
                id="partner-code"
                placeholder={isGroup ? 'Enter room code' : 'Enter partner code'}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                aria-label={isGroup ? 'Room code' : 'Partner connection code'}
              />
              <button className="btn-primary" onClick={handleEnterCode} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          ) : (
            <div>
              <p>
                {isGroup
                  ? 'Joining a room? Ask your friend for the 6-character code:'
                  : 'Ask your partner for their 6-character code, or share yours above:'}
              </p>
              <button className="btn-primary" onClick={() => setEnterCode(true)}>
                {isGroup ? 'I have a code' : 'I have a code'}
              </button>
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default ConnectionCode