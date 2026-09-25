import { LuArrowLeft, LuFilm, LuSend } from 'react-icons/lu'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { useUser } from './UserContext.jsx'
import { apiPost } from './lib/api.js'
import Avatar from './components/Avatar.jsx'
import LivePlayer from './components/LivePlayer.jsx'
import LiveChat from './components/LiveChat.jsx'
import ConnectionStatus from './components/ConnectionStatus.jsx'
import { useNotifications } from './context/NotificationContext.jsx'
import './App.css'

const CoupleWatch = ({ onNavigate }) => {
  const { user } = useUser()
  const { notify } = useNotifications()
  const {
    session,
    partner,
    participants,
    video,
    connected,
    playback,
    offlineDeadline,
    leaveSession
  } = useLiveSession()

  const partnerId = partner ? partner.id : null
  const partnerOnline = partnerId ? participants.some((p) => p.id === partnerId) : connected

  const handleLeave = () => {
    leaveSession()
    onNavigate('dashboard')
  }

  const handleInvite = async () => {
    if (!session || !session.sessionId || !partner || !partner.id) return
    try {
      await apiPost('/api/invites/send', {
        toUserId: partner.id,
        sessionId: session.sessionId,
        currentPlaybackTime: playback && playback.currentTime ? playback.currentTime : 0,
        title: video ? video.title : undefined
      })
      notify(`Resume invite sent to ${partner.name}`, 'success')
    } catch (e) {
      notify(e.message || 'Could not send invite', 'error')
    }
  }

  const partnerOnlineEffective = partnerOnline

  return (
    <div className="couple-watch">
      <ConnectionStatus
        isOnline={partnerOnlineEffective}
        partnerName={partner ? partner.name : 'Your partner'}
        deadline={offlineDeadline}
      />
      <div className="watch-header">
        <div className="partner-info">
          <Avatar src={user.avatarUrl} name={user.displayName} size={34} />
          <span>{user.displayName}</span>
          <span className="status-dot" />
        </div>
        <div className="watch-header-actions">
          <span className="conn-hint">
            {connected ? 'Connected' : 'Connecting...'}
          </span>
          {video && partner && (
            <button className="control-btn" onClick={handleInvite} title="Send a resume invite to your partner">
              <LuSend size={14} /> Invite to resume
            </button>
          )}
          <button className="control-btn" onClick={handleLeave}>
            <LuArrowLeft size={14} /> Leave
          </button>
        </div>
        <div className="partner-info partner-side">
          <Avatar src={partner ? partner.avatarUrl : ''} name={partner ? partner.name : '?'} size={34} />
          <span>{partner ? partner.name : 'Waiting for the code...'}</span>
          <span className={`status-dot ${partnerOnline && connected ? '' : 'offline'}`} />
        </div>
      </div>

      <div className="couple-main">
        {video ? (
          <LivePlayer onNavigate={onNavigate} />
        ) : (
          <div className="no-video">
            <h3>No movie yet</h3>
            <p>Pick a movie and it will play for both of you in sync</p>
            <div className="no-video-actions">
              <button className="btn-primary" onClick={() => onNavigate('movie-selection')}>
                <LuFilm size={14} /> Choose a movie
              </button>
            </div>
          </div>
        )}
        <LiveChat placeholder="Message your partner..." />
      </div>
    </div>
  )
}

export default CoupleWatch