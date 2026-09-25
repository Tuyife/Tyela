import { useState } from 'react'
import { LuMail, LuLock, LuArrowLeft } from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import './App.css'

const LoginScreen = ({ onNavigate }) => {
  const { signIn } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    setError('')
    setLoading(true)
    const result = await signIn(email, password)
    setLoading(false)
    if (result.ok) {
      onNavigate('dashboard')
    } else {
      setError(result.error || 'Could not sign in')
    }
  }

  return (
    <div className="auth-screen">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuArrowLeft size={14} /> Back to home
      </button>
      <div className="auth-card">
        <h2>Sign in</h2>
        <p>Continue watching with your partner</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <a onClick={() => onNavigate('signup')}>Sign up</a>
        </p>
      </div>
    </div>
  )
}

export default LoginScreen