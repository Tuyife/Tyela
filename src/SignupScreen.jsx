import { useState } from 'react'
import { LuUser, LuMail, LuLock, LuLockOpen, LuArrowLeft } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import './App.css'

const SignupScreen = ({ onNavigate }) => {
  const { signUp } = useUser()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!displayName || !email || !password || !confirmPassword) {
      setError('All fields are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setLoading(true)
    const result = await signUp({ displayName, email, password })
    setLoading(false)
    if (result.ok) {
      onNavigate('dashboard')
    } else {
      setError(result.error || 'Could not create account')
    }
  }

  return (
    <div className="auth-screen">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuArrowLeft size={14} /> Back to home
      </button>
      <div className="auth-card">
        <h2>Create account</h2>
        <p>Join TYELA and start sharing moments</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <LuUser className="form-icon" />
            <input
              type="text"
              placeholder="display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <LuMail className="form-icon" />
            <input
              type="email"
              placeholder="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <LuLock className="form-icon" />
            <input
              type="password"
              placeholder="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <LuLockOpen className="form-icon" />
            <input
              type="password"
              placeholder="confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <a onClick={() => onNavigate('login')}>Sign in</a>
        </p>
      </div>
    </div>
  )
}

export default SignupScreen