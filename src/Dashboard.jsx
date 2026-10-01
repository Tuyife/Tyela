import { useState, useEffect } from 'react'
import { LuHouse, LuUsers } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { useNotifications } from './context/NotificationContext.jsx'
import { apiGet, apiPost } from './lib/api.js'
import Avatar from './components/Avatar.jsx'
import WatchHistory from './components/WatchHistory.jsx'
import ConnectionCard from './components/ConnectionCard.jsx'
import OnboardingOverlay from './components/OnboardingTutorial/OnboardingOverlay.jsx'
import InstallButton from './components/InstallButton.jsx'
import useOnboarding from './hooks/useOnboarding.js'
import './App.css'

const Dashboard = ({ onNavigate }) => {
  const { user } = useUser()
  const { openLiveSession } = useLiveSession()
  const { notify } = useNotifications()
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
    } catch {
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

  const handleInvite = async (partner, kind = 'watch') => {
    try {
      await apiPost('/api/connection/invite', { partnerId: partner.userId, kind })
      return true
    } catch {
      notify(kind === 'join' ? "Couldn't ask to join" : "Couldn't send the invite", 'error')
      return false
    }
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
              <ConnectionCard
                key={String(p.userId)}
                partner={p}
                onWatch={(partner) => handleWatchTogether(partner)}
                onInvite={handleInvite}
              />
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