import { useEffect, useState } from 'react'
import { LuFilm, LuHeart, LuUsers, LuRefreshCw, LuTrash2 } from 'react-icons/lu'
import { apiDelete } from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import '../App.css'

const formatWhen = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDuration = (mins) => {
  if (!mins) return ''
  return ` · ${mins}m`
}

const WatchHistory = ({ sessions, onResume }) => {
  const { notify } = useNotifications()
  const [items, setItems] = useState(sessions)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setItems(sessions)
  }, [sessions])

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await apiDelete(`/api/history/${toDelete.id}`)
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id))
      notify('Session deleted', 'success')
    } catch (e) {
      notify(e.message || 'Could not delete session', 'error')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="wrapper">
        <div className="history-head">
          <h2>Watch history</h2>
          <span className="history-count">{items.length}</span>
        </div>
        <div className="history-empty">
          <LuFilm size={22} />
          <p>No watch history yet. Start one and your movies together will show up here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="wrapper">
      <div className="history-head">
        <h2>Watch history</h2>
        <span className="history-count">{items.length}</span>
      </div>

      <ul className="history-list">
        {items.map((item) => (
          <li className="history-item" key={item.id}>
            <span className="history-icon">
              {item.sessionType === 'couple' ? <LuHeart size={15} /> : <LuUsers size={15} />}
            </span>
            <div className="history-meta">
              <strong className="history-title">
                {item.video && item.video.title
                  ? item.video.title
                  : item.sessionType === 'couple'
                    ? 'Movie night with partner'
                    : 'Group watch'}
              </strong>
              <span className="history-sub">
                {item.sessionType === 'couple' && item.partner
                  ? `With ${item.partner.name}`
                  : `${item.participantCount || 1} in room`}
                {formatDuration(item.durationMinutes)}
                {'  ·  '}
                {formatWhen(item.startedAt)}
              </span>
            </div>
            <div className="history-actions">
              <span className={`history-badge history-badge-${item.status}`}>{item.status}</span>
              <button className="control-btn history-resume" onClick={() => onResume && onResume(item)}>
                <LuRefreshCw size={13} /> Reopen
              </button>
              <button
                className="history-delete"
                aria-label="Delete history"
                title="Delete this session"
                onClick={() => setToDelete(item)}
              >
                <LuTrash2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {toDelete && (
        <ConfirmModal
          title="Delete this session?"
          message="This removes the session and all its messages from your watch history. This can't be undone."
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

export default WatchHistory