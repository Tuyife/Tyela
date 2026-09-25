import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { useUser } from './UserContext.jsx'
import Landing from './Landing.jsx'
import SplashScreen from './SplashScreen.jsx'
import LoginScreen from './LoginScreen.jsx'
import SignupScreen from './SignupScreen.jsx'
import Dashboard from './Dashboard.jsx'
import ModeSelection from './ModeSelection.jsx'
import ConnectionCode from './ConnectionCode.jsx'
import MovieSelection from './MovieSelection.jsx'
import PasteLink from './PasteLink.jsx'
import UploadScreen from './UploadScreen.jsx'
import CoupleWatch from './CoupleWatch.jsx'
import GroupWatch from './GroupWatch.jsx'
import WatchSession from './WatchSession.jsx'
import Profile from './Profile.jsx'
import InfoPage from './InfoPage.jsx'
import BackgroundSlideshow from './components/BackgroundSlideshow.jsx'
import { LiveSessionProvider } from './live/LiveSessionContext.jsx'
import './App.css'

const App = () => {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const firstVisit = localStorage.getItem('tyelaFirstVisit')
    if (firstVisit === 'no') {
      setShowSplash(false)
    } else {
      const timer = setTimeout(() => {
        localStorage.setItem('tyelaFirstVisit', 'no')
        setShowSplash(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <Router>
      <div className="app">
        <BackgroundSlideshow />

        {showSplash && <SplashScreen />}

        <AppRoutes />
      </div>
    </Router>
  )
}

const AppRoutes = () => {
  const navigate = useNavigate()

  return (
    <LiveSessionProvider navigate={navigate}>
      <Routes>
      <Route path="/" element={<Landing onNavigate={(page) => navigate(`/${page}`)} />} />
      <Route path="login" element={<LoginScreen onNavigate={(page) => navigate(`/${page}`)} />} />
      <Route path="signup" element={<SignupScreen onNavigate={(page) => navigate(`/${page}`)} />} />
      <Route path="info/:topic" element={<InfoRoute onNavigate={(page) => navigate(`/${page}`)} />} />
      <Route
        path="dashboard"
        element={
          <RequireAuth>
            <Dashboard onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="mode-selection"
        element={
          <RequireAuth>
            <ModeSelection onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="connection-code"
        element={
          <RequireAuth>
            <ConnectionCode onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="movie-selection"
        element={
          <RequireAuth>
            <MovieSelection onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="paste-link"
        element={
          <RequireAuth>
            <PasteLink onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="upload"
        element={
          <RequireAuth>
            <UploadScreen onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="couple-watch"
        element={
          <RequireAuth>
            <CoupleWatch onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="group-watch"
        element={
          <RequireAuth>
            <GroupWatch onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="watch-session"
        element={
          <RequireAuth>
            <WatchSession onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      <Route
        path="profile"
        element={
          <RequireAuth>
            <Profile onNavigate={(page) => navigate(`/${page}`)} />
          </RequireAuth>
        }
      />
      </Routes>
    </LiveSessionProvider>
  )
}

const InfoRoute = ({ onNavigate }) => {
  const { topic } = useParams()
  return <InfoPage topic={topic} onNavigate={onNavigate} />
}

const RequireAuth = ({ children }) => {
  const { isLoggedIn } = useUser()
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default App