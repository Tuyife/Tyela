import {
  LuPlay,
  LuHeart,
  LuRefreshCw,
  LuChevronRight,
  LuMessageSquare,
  LuZap,
  LuLock,
  LuUsers,
  LuLaugh,
  LuInstagram,
  LuTwitter,
  LuYoutube,
} from 'react-icons/lu'
import { useUser } from './UserContext.jsx'
import Avatar from './components/Avatar.jsx'
import './App.css'

const Landing = ({ onNavigate }) => {
  const { user, isLoggedIn, logout } = useUser()

  const go = (page) => onNavigate(page)

  const handleLogout = () => {
    logout()
    go('')
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-logo" onClick={() => go(isLoggedIn ? 'dashboard' : 'signup')}>
          <span className="logo-mark"><LuPlay size={18} /></span>
          TYELA
        </div>
        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <>
              <button className="nav-link" onClick={handleLogout}>Sign out</button>
              <button className="btn-primary nav-cta landing-user-chip" onClick={() => go('dashboard')}>
                <Avatar src={user.avatarUrl} name={user.displayName} size={26} />
                <span className="landing-user-name">Open dashboard</span>
              </button>
            </>
          ) : (
            <>
              <button className="nav-link" onClick={() => go('login')}>Sign in</button>
              <button className="btn-primary nav-cta" onClick={() => go('signup')}>Get started</button>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span className="live-dot" />
            Synchronized watch parties
          </span>

          <h1 className="hero-title">
            Movie night, together.
            <span className="title-accent">Even when you're apart.</span>
          </h1>

          <p className="hero-sub">
            Press play once and everyone watches the same frame at the same time.
            Pause for popcorn, talk in the side chat, and never race ahead of
            each other again.
          </p>

          <div className="hero-actions">
            <button className="btn-primary hero-cta" onClick={() => go(isLoggedIn ? 'dashboard' : 'signup')}>
              {isLoggedIn ? 'Continue watching' : 'Start watching'} <LuChevronRight size={16} />
            </button>
            <button className="btn-secondary hero-ghost" onClick={() => go(isLoggedIn ? 'movie-selection' : 'login')}>
              {isLoggedIn ? 'Pick a movie' : 'I already have an account'}
            </button>
          </div>

          <div className="hero-proof">
            <div className="avatar-stack">
              <span className="avatar a1">M</span>
              <span className="avatar a2">J</span>
              <span className="avatar a3">K</span>
              <span className="avatar a4">A</span>
              <span className="avatar a5">+</span>
            </div>
            <p><strong>25,000+</strong> couples & friend groups watch together every night</p>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="blob blob-a" />
          <div className="blob blob-b" />

          <div className="together-frame">
            <div className="together-seam" />

            <div className="screen-card">
              <div className="screen-head">
                <span className="screen-avatar">Y</span>
                <span className="screen-name">You</span>
                <span className="screen-online" />
              </div>
              <div className="screen-film film-a">
                <span className="film-play"><LuPlay size={22} /></span>
              </div>
              <div className="screen-bar">
                <span className="bar-label">01:34:12</span>
                <div className="bar-track"><span className="bar-fill bar-fill-you" /></div>
                <span className="bar-label">02:11:00</span>
              </div>
            </div>

            <div className="screen-card screen-card-partner">
              <div className="screen-head">
                <span className="screen-avatar partner">P</span>
                <span className="screen-name">Partner</span>
                <span className="screen-online" />
              </div>
              <div className="screen-film film-b">
                <span className="film-play"><LuPlay size={22} /></span>
              </div>
              <div className="screen-bar">
                <span className="bar-label">01:34:12</span>
                <div className="bar-track"><span className="bar-fill bar-fill-partner" /></div>
                <span className="bar-label">02:11:00</span>
              </div>
            </div>

            <div className="sync-core">
              <LuRefreshCw size={16} />
              <span>Synced</span>
            </div>

            <div className="float-chip chip-heart">
              <LuHeart size={12} /> 12
            </div>
            <div className="float-chip chip-react">
              <LuLaugh size={16} />
            </div>
            <div className="float-chip chip-chat">
              <LuMessageSquare size={15} /> <span className="type-dot" /><span className="type-dot" /><span className="type-dot" />
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <div className="feature-item">
          <span className="feature-icon"><LuLock size={20} /></span>
          <div>
            <strong>Private codes</strong>
            <p>Only people with your code can join your watch party.</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon"><LuZap size={20} /></span>
          <div>
            <strong>Frame-perfect sync</strong>
            <p>Play, pause and seek happen for everyone at the same moment.</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon"><LuUsers size={20} /></span>
          <div>
            <strong>Reactions & chat</strong>
            <p>Laugh together with emoji reactions and a live side chat.</p>
          </div>
        </div>
      </section>

      <footer className="animated-footer">
        <div className="footer-glow glow-a" aria-hidden="true" />
        <div className="footer-glow glow-b" aria-hidden="true" />

        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">
              <span className="logo-mark"><LuPlay size={16} /></span>
              TYELA
            </span>
            <p className="footer-tagline">
              Press play once, watch together. Movie nights made for the people
              you love, wherever they are.
            </p>
            <div className="footer-socials">
              <button className="social-btn" aria-label="Instagram"><LuInstagram size={16} /></button>
              <button className="social-btn" aria-label="Twitter / X"><LuTwitter size={16} /></button>
              <button className="social-btn" aria-label="YouTube"><LuYoutube size={16} /></button>
              <button className="social-btn" aria-label="Community"><LuMessageSquare size={16} /></button>
            </div>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <a className="footer-link" href="/info/couple-watch" onClick={(e) => { e.preventDefault(); onNavigate('info/couple-watch') }}>Couple watch</a>
            <a className="footer-link" href="/info/group-watch" onClick={(e) => { e.preventDefault(); onNavigate('info/group-watch') }}>Group watch</a>
            <a className="footer-link" href="/info/sync-engine" onClick={(e) => { e.preventDefault(); onNavigate('info/sync-engine') }}>Sync engine</a>
            <a className="footer-link" href="/info/pricing" onClick={(e) => { e.preventDefault(); onNavigate('info/pricing') }}>Pricing</a>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <a className="footer-link" href="/info/about" onClick={(e) => { e.preventDefault(); onNavigate('info/about') }}>About</a>
            <a className="footer-link" href="/info/careers" onClick={(e) => { e.preventDefault(); onNavigate('info/careers') }}>Careers</a>
            <a className="footer-link" href="/info/press" onClick={(e) => { e.preventDefault(); onNavigate('info/press') }}>Press</a>
            <a className="footer-link" href="/info/contact" onClick={(e) => { e.preventDefault(); onNavigate('info/contact') }}>Contact</a>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <a className="footer-link" href="/info/privacy" onClick={(e) => { e.preventDefault(); onNavigate('info/privacy') }}>Privacy</a>
            <a className="footer-link" href="/info/terms" onClick={(e) => { e.preventDefault(); onNavigate('info/terms') }}>Terms</a>
            <a className="footer-link" href="/info/cookies" onClick={(e) => { e.preventDefault(); onNavigate('info/cookies') }}>Cookies</a>
            <a className="footer-link" href="/info/status" onClick={(e) => { e.preventDefault(); onNavigate('info/status') }}>Status</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} TYELA. All rights reserved.</span>
          <span className="made-with"><LuHeart size={13} /> Made for movie nights</span>
        </div>
      </footer>
    </div>
  )
}

export default Landing