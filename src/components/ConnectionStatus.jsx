import { useEffect, useState } from 'react'
import { LuWifiOff, LuWifi } from 'react-icons/lu'
import '../App.css'

const pad = (n) => String(n).padStart(2, '0')

const formatCountdown = (ms) => {
  if (ms <= 0) return '0:00'
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${pad(s)}`
}

const ConnectionStatus = ({ isOnline, partnerName, deadline }) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (isOnline) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isOnline])

  if (isOnline) return null

  // No countdown means the partner simply isn't here yet - not an expired
  // session. Only a deadline that has actually run out counts as expired.
  const left = deadline ? deadline - now : null
  const expired = left !== null && left <= 0

  return (
    <div className={`connection-status ${expired ? 'connection-status-expired' : ''}`}>
      <LuWifiOff size={20} />
      <div className="connection-status-text">
        <strong>
          {expired
            ? 'Session expired'
            : deadline
              ? 'Waiting for partner...'
              : 'Partner not here yet'}
        </strong>
        <span>
          {expired
            ? `${partnerName || 'Your partner'} didn't return in time, the session has ended.`
            : deadline
              ? `${partnerName || 'Your partner'} disconnected. Auto-ending the session in ${formatCountdown(left)}...`
              : `${partnerName || 'Your partner'} isn't in the session yet. The movie is paused until they join.`}
        </span>
      </div>
      {!expired && (
        <span className="connection-status-icon-ok">
          <LuWifi size={15} />
        </span>
      )}
    </div>
  )
}

export default ConnectionStatus