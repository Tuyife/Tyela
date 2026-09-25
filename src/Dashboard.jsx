import { useState, useEffect } from 'react'
import { LuHouse, LuFilm, LuUsers, LuUnplug, LuRefreshCw, LuHeart } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { apiGet, apiPost } from './lib/api.js'
import Avatar from './components/Avatar.jsx'
import './App.css'

const formatWhen = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const Dashboard = ({ onNavigate }) => {
  const { user } = useUser()
  const { openLiveSession, leaveSession } = useLiveSession()
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const partner = await apiGet('/api/connection/partner').catch(() => ({ partner: null }))
        const hist = await apiGet('/api/sessions/history').catch(() => ({ history: [] }))
        if (cancelled) return
        setPartnerInfo(partner.partner || null)
        setHistory(hist.history || [])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleStartWatching = () => {
    onNavigate('mode-selection')
  }

  const handleManageConnection = () => {
    onNavigate('connection-code')
  }

  const handleWatchTogether = async () => {
    try {
      const data = await apiGet('/api/sessions/active')
      if (data.session) {
        const s = data.session
        openLiveSession({
          sessionId: s._id,
          mode: 'couple',
          partner: partnerInfo
            ? { id: partnerInfo._id, name: partnerInfo.displayName, avatarUrl: partnerInfo.avatarUrl || '' }
            : undefined
        })
        onNavigate('couple-watch')
        return
      }
    } catch (error) {
      /* fall through to get a new code */
    }
    onNavigate('connection-code')
  }

  const handleResume = async (item) => {
    const isCouple = item.sessionType === 'couple'
    openLiveSession({
      sessionId: item.id,
      mode: isCouple ? 'couple' : 'group',
      partner: item.partner ? { id: item.partner.id, name: item.partner.name, avatarUrl: item.partner.avatarUrl || '' } : undefined
    })
    onNavigate(isCouple ? 'couple-watch' : 'group-watch')
  }

  const handleDisconnect = async () => {
    leaveSession()
    setPartnerInfo(null)
    try {
      await apiPost('/api/connection/disconnect', {})
    } catch (error) {
      /* ignore */
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="dashboard dashboard-container">
      <div className="dashboard-blobs" aria-hidden="true">
        <div className="dashboard-blob dashboard-blob-1" />
        <div className="dashboard-blob dashboard-blob-2" />
        <div className="dashboard-blob dashboard-blob-3" />
      </div>

      <header className="dashboard-header">
        <div className="header-left">
          <LuHouse className="header-icon" />
          <span>TYELA</span>
        </div>
        <div className="header-right">
          <button className="home-chip" onClick={() => onNavigate('')}>
            <LuHouse className="header-icon" />
            <span>Home</span>
          </button>
          <button className="profile-chip" onClick={() => onNavigate('profile')}>
            <Avatar src={user.avatarUrl} name={user.displayName} size={34} />
            <span className="profile-chip-name">{user.displayName}</span>
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {partnerInfo ? (
          <div className="partner-card status-section">
            <Avatar
              src={partnerInfo.avatarUrl}
              name={partnerInfo.displayName}
              size={58}
            />
            <div className="partner-card-meta">
              <span className="partner-card-label">You&apos;re connected with</span>
              <strong className="partner-card-name">{partnerInfo.displayName}</strong>
              <span className="partner-card-online">
                <span className="status-dot" /> Connected partner
              </span>
            </div>
            <div className="partner-card-actions">
              <button className="btn-primary" onClick={handleWatchTogether}>
                Watch together
              </button>
              <button
                className="btn-secondary partner-disconnect"
                onClick={handleDisconnect}
                title="Disconnect from this partner"
              >
                <LuUnplug size={14} /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="partner-card status-section partner-card-empty">
            <span className="partner-empty-icon"><LuUsers size={24} /></span>
            <div className="partner-card-meta">
              <strong className="partner-card-name">No partner connected yet</strong>
              <p className="partner-card-hint">
                Generate a code or join with a partner&apos;s code and your history
                will live here.
              </p>
            </div>
            <button className="btn-primary" onClick={handleManageConnection}>
              Connect with a partner
            </button>
          </div>
        )}

        <section className="history-section dashboard-buttons">
          <div className="history-head">
            <h2>Watch history</h2>
            <span className="history-count">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              <LuFilm size={22} />
              <p>No watch nights yet. Start one and your movies together will show up here.</p>
            </div>
          ) : (
            <ul className="history-list">
              {history.map((item) => (
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
                      {item.video && item.video.title ? `  ·  ${item.video.type}` : ''}
                      {'  ·  '}
                      {formatWhen(item.startedAt)}
                    </span>
                  </div>
                  <div className="history-actions">
                    <span className={`history-badge history-badge-${item.status}`}>{item.status}</span>
                    <button
                      className="control-btn history-resume"
                      onClick={() => handleResume(item)}
                    >
                      <LuRefreshCw size={13} /> Reopen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="dashboard-actions">
          <button className="btn-primary" onClick={handleStartWatching}>
            Start watching
          </button>
          <button className="btn-secondary" onClick={handleManageConnection}>
            Manage connection
          </button>
        </div>
      </main>
    </div>
  )
}

export default Dashboard