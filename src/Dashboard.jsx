import { useState, useEffect } from 'react'
import { LuHouse, LuUsers, LuUnplug } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { apiGet, apiPost } from './lib/api.js'
import Avatar from './components/Avatar.jsx'
import WatchHistory from './components/WatchHistory.jsx'
import OnboardingOverlay from './components/OnboardingTutorial/OnboardingOverlay.jsx'
import InstallButton from './components/InstallButton.jsx'
import useOnboarding from './hooks/useOnboarding.js'
import './App.css'

const Dashboard = ({ onNavigate }) => {
  const { user } = useUser()
  const { openLiveSession } = useLiveSession()
  const onboarding = useOnboarding()
  const [partnerList, setPartnerList] = useState([])
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const tutorialOverlay = onboarding.visible ? (
    <OnboardingOverlay
      step={onboarding.step}
      index={onboarding.current}
      total={onboarding.total}
      onNext={onboarding.nextStep}
      onSkip={onboarding.skipTutorial}
      onComplete={onboarding.completeTutorial}
    />
  ) : null

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const partners = await apiGet('/api/connection/status').catch(() => ({ partners: [] }))
        const hist = await apiGet('/api/sessions/history').catch(() => ({ history: [] }))
        if (cancelled) return
        setPartnerList(partners.partners || [])
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

  // Refresh live online dots every few seconds.
  useEffect(() => {
    const timer = setInterval(async () => {
      const data = await apiGet('/api/connection/status').catch(() => null)
      if (data && data.partners) setPartnerList(data.partners)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const handleStartWatching = () => {
    onNavigate('mode-selection')
  }

  const handleManageConnection = () => {
    onNavigate('connection-code')
  }

  const handleWatchTogether = async (partner) => {
    try {
      const start = await apiPost('/api/connection/start', { partnerId: partner.userId })
      if (start && start.sessionId) {
        openLiveSession({ sessionId: start.sessionId, mode: 'couple', partner: start.partner })
        onNavigate('couple-watch')
        return
      }
    } catch (error) {
      /* fall through to code entry */
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

  const handleDisconnect = async (partner) => {
    await apiPost('/api/connection/disconnect', { partnerId: partner.userId }).catch(() => {})
    setPartnerList((prev) => prev.filter((p) => String(p.userId) !== String(partner.userId)))
  }

  if (isLoading) {
    return (
      <>
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
        {tutorialOverlay}
      </>
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
        {partnerList.length > 0 ? (
          <div className="partner-list">
            {partnerList.map((p) => (
              <div className="partner-card status-section" key={String(p.userId)}>
                <Avatar src={p.avatarUrl} name={p.displayName} size={58} />
                <div className="partner-card-meta">
                  <span className="partner-card-label">You&apos;re connected with</span>
                  <strong className="partner-card-name">{p.displayName}</strong>
                  <span className="partner-card-online">
                    <span className={`status-dot ${p.online ? '' : 'offline'}`} />
                    {p.online ? 'Online now' : 'Offline right now'}
                  </span>
                </div>
                <div className="partner-card-actions">
                  <button
                    className="btn-primary"
                    data-onboarding="watch-together"
                    onClick={() => handleWatchTogether(p)}
                  >
                    Watch together
                  </button>
                  <button
                    className="btn-secondary partner-disconnect"
                    onClick={() => handleDisconnect(p)}
                    title="Disconnect from this partner"
                  >
                    <LuUnplug size={14} /> Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="partner-card status-section partner-card-empty">
            <span className="partner-empty-icon"><LuUsers size={24} /></span>
            <div className="partner-card-meta">
              <strong className="partner-card-name">No partner connected yet</strong>
              <p className="partner-card-hint">
                Generate a code or join with a partner&apos;s code and your history
                will live here. You can connect with more than one partner.
              </p>
            </div>
            <button className="btn-primary" onClick={handleManageConnection}>
              Connect with a partner
            </button>
          </div>
        )}

        <section className="history-section dashboard-buttons">
          <WatchHistory sessions={history} onResume={handleResume} />
        </section>

        <div className="dashboard-actions">
          <button
            className="btn-primary"
            data-onboarding="start-watching"
            onClick={handleStartWatching}
          >
            Start watching
          </button>
          <button className="btn-secondary" onClick={handleManageConnection}>
            Manage connection
          </button>
          <InstallButton />
        </div>
      </main>
      {tutorialOverlay}
    </div>
  )
}

export default Dashboard