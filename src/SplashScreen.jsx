import { LuPlay, LuHeart } from 'react-icons/lu'
import './App.css'

const FLOATERS = ['🍿', '🎬', '❤️', '✨', '🎥', '💜', '🍿', '🎬', '❤️', '✨']

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-floaters" aria-hidden="true">
        {FLOATERS.map((emoji, i) => (
          <span
            key={i}
            className="floater"
            style={{
              left: `${(i * 9 + 4) % 92}%`,
              animationDelay: `${i * 0.7}s`,
              fontSize: `${18 + (i % 4) * 6}px`
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <div className="splash-content">
        <div className="splash-logo">
          <div className="splash-logo-tile">
            <LuPlay size={46} className="play-icon" />
          </div>
          <LuHeart size={22} className="splash-heart heart-pop" />
        </div>
        <h1>TYELA</h1>
        <div className="splash-tag">Movies are better together</div>

        <div className="splash-dots">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen