import { useState } from 'react'
import { LuArrowLeft, LuCopy, LuFilm } from 'react-icons/lu'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { useUser } from './UserContext.jsx'
import Avatar from './components/Avatar.jsx'
import LivePlayer from './components/LivePlayer.jsx'
import LiveChat from './components/LiveChat.jsx'
import './App.css'

const GroupWatch = ({ onNavigate }) => {
  const { user } = useUser()
  const { code, session, participants, video, connected, leaveSession } = useLiveSession()
  const [copied, setCopied] = useState(false)

  const isHost = session && session.role === 'host'
  const roomCode = code || (session ? session.code : '')

  const handleCopyCode = async () => {
    try {
      if (roomCode) {
        await navigator.clipboard.writeText(roomCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch (err) {
      console.error('Failed to copy room code')
    }
  }

  const handleLeave = () => {
    leaveSession()
    onNavigate('dashboard')
  }

  return (
    <div className="group-watch">
      <div className="watch-toolbar">
        <div className="video-controls">
          <button className="control-btn" onClick={handleLeave}>
            <LuArrowLeft size={14} /> Leave
          </button>
          {!video && (
            <button className="control-btn" onClick={() => onNavigate('movie-selection')}>
              <LuFilm size={14} /> Choose a movie
            </button>
          )}
        </div>
        <div className="session-info">
          <span>{connected ? 'Live' : 'Connecting...'}</span>
          <span>{video ? video.title : 'No movie yet'}</span>
        </div>
      </div>

      <div className="group-layout">
        <div className="main-area">
          {video ? (
            <LivePlayer onNavigate={onNavigate} />
          ) : (
            <div className="no-video">
              <h3>Waiting for a movie</h3>
              <p>{isHost ? "You're the host - pick a movie to start" : 'The host will pick a movie soon'}</p>
              {isHost && (
                <div className="no-video-actions">
                  <button className="btn-primary" onClick={() => onNavigate('movie-selection')}>
                    <LuFilm size={14} /> Choose a movie
                  </button>
                </div>
              )}
            </div>
          )}
          <LiveChat placeholder="Type a message..." />
        </div>

        <div className="participant-sidebar">
          <div className="participants-header">
            <h3>Participants</h3>
          </div>
          <div className="participant-list">
            {participants.map((p) => (
              <div className="participant-item" key={p.id}>
                <Avatar src={p.avatarUrl} name={p.name} size={32} className="participant-avatar" />
                <span>{p.name}</span>
                <span className={`status-dot ${p.id === user.id ? 'you-status' : ''}`} />
              </div>
            ))}
          </div>
          <div className="session-code">
            <span>Room code</span>
            <button className="code-value" onClick={handleCopyCode} title="Copy room code">
              {roomCode || '------'} {copied ? <LuCopy size={12} /> : null}
            </button>
            <p className="code-share-hint">Share this code so friends can join</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupWatch