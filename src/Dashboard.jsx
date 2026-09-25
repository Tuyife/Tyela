import { useState, useEffect } from 'react'
import { LuHouse } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import Avatar from './components/Avatar.jsx'
import './App.css'

const Dashboard = ({ onNavigate }) => {
  const { user } = useUser()
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      // TODO: Verify token with API
      // For now, simulate check after brief delay
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }
    checkAuth()
  }, [])

  const handleStartWatching = () => {
    onNavigate('mode-selection')
  }

  const handleManageConnection = () => {
    onNavigate('connection-code')
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
          <div className="partner-status status-section">
            <div className="status-indicator" />
            <span>{partnerInfo.displayName}</span>
            <span className="status-online">Online</span>
          </div>
        ) : (
          <div className="status-section">
            <p>No partner connected</p>
          </div>
        )}

        <div className="dashboard-actions dashboard-buttons">
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