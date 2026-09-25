import { useEffect, useState } from 'react'
import { LuPlay, LuClock, LuX } from 'react-icons/lu'
import '../App.css'

const pad = (n) => String(n).padStart(2, '0')

const formatTime = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h ${pad(m)}m in` : `${m}m ${pad(sec)}s in`
}

const formatExpiry = (ms) => {
  if (ms <= 0) return 'Expired'
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`
}

const ResumeWatchModal = ({ invite, onAccept, onDecline }) => {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const expiresAt = invite && invite.expiresAt ? new Date(invite.expiresAt).getTime() : 0
  const expired = !expiresAt || expiresAt - now <= 0
  const fromName = invite && invite.fromUser ? invite.fromUser.name : 'Your partner'
  const title = (invite && invite.sessionTitle) || 'Movie night'

  return (
    <div className="modal-overlay">
      <div className="resume-modal">
        <button className="resume-close" aria-label="Close" onClick={onDecline}>
          <LuX size={16} />
        </button>
        <div className="resume-poster">
          <LuPlay size={30} />
          <span>{invite && invite.sessionType === 'group' ? 'Group watch' : 'Movie night'}</span>
        </div>
        <h3>You&apos;ve been invited to keep watching</h3>
        <p className="resume-from">{fromName} invited you to continue watching</p>
        <strong className="resume-title">{title}</strong>
        <div className="resume-meta">
          <span>
            <LuClock size={14} /> {formatTime(invite ? invite.currentPlaybackTime : 0)}
          </span>
          <span className={expired ? 'resume-expired' : ''}>{formatExpiry(expiresAt - now)}</span>
        </div>
        <div className="resume-actions">
          <button className="btn-primary resume-accept" onClick={onAccept} disabled={expired}>
            {expired ? 'Invite expired' : 'Accept & resume'}
          </button>
          <button className="btn-secondary" onClick={onDecline}>
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResumeWatchModal