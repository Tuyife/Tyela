import { LuPlay, LuHeart } from 'react-icons/lu'
import './App.css'

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">
          <LuPlay size={44} className="play-icon" />
        </div>
        <h1>TYELA</h1>
        <p>Where lovers share moments</p>

        <div className="pair-animation" aria-hidden="true">
          <div className="pair-person">
            <span className="pair-ring" />
            <span className="pair-avatar you-avatar">Y</span>
            <span className="pair-label">You</span>
          </div>

          <div className="pair-link">
            <span className="pair-beam beam-left" />
            <LuHeart size={22} className="pair-heart" />
            <span className="pair-beam beam-right" />
          </div>

          <div className="pair-person">
            <span className="pair-ring ring-partner" />
            <span className="pair-avatar partner-avatar">P</span>
            <span className="pair-label">Partner</span>
          </div>
        </div>

        <div className="splash-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen