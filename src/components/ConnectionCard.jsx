import { useState } from 'react'
import Avatar from './Avatar.jsx'
import '../App.css'

// Compact single-row connection card for the mobile dashboard.
// One action per state: Watch (online) / Ask to join (busy) / Send invite
// (offline, flips to a green "✓ Sent" once delivered).
const ConnectionCard = ({ partner, onWatch, onInvite, resetSignal }) => {
  const [sent, setSent] = useState(false)
  // A declined request puts the button back so it can be asked again.
  const [lastReset, setLastReset] = useState(resetSignal)
  if (resetSignal !== lastReset) {
    setLastReset(resetSignal)
    setSent(false)
  }

  const state = !partner.online ? 'offline' : partner.busy ? 'busy' : 'online'

  const statusLabel =
    state === 'online'
      ? 'Online now'
      : state === 'busy'
        ? `Watching ${partner.sessionTitle || 'a movie'}`
        : 'Offline'

  const label =
    sent
      ? state === 'offline' ? '✓ Sent' : '✓ Asked'
      : state === 'online' ? 'Watch' : state === 'busy' ? 'Ask to join' : 'Send invite'

  const handleAction = async () => {
    if (state === 'online') {
      if (onWatch) onWatch(partner)
      return
    }
    if (sent) return
    const ok = await onInvite(partner, state === 'busy' ? 'join' : 'watch')
    if (ok !== false) setSent(true)
  }

  return (
    <div className={`connection-card is-${state}${sent ? ' is-sent' : ''}`}>
      <div className="connection-card-avatar">
        <Avatar src={partner.avatarUrl} name={partner.displayName} size={40} />
        <span className="connection-card-dot" aria-hidden="true" />
      </div>
      <div className="connection-card-meta">
        <strong className="connection-card-name">{partner.displayName}</strong>
        <span className="connection-card-status">{statusLabel}</span>
      </div>
      <button
        type="button"
        className="connection-card-action"
        data-onboarding={state === 'online' ? 'watch-together' : undefined}
        onClick={handleAction}
        disabled={sent}
      >
        {label}
      </button>
    </div>
  )
}

export default ConnectionCard