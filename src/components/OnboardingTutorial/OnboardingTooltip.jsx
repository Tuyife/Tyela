import { forwardRef } from 'react'
import {
  LuPlay,
  LuHeart,
  LuUsers,
  LuZap,
  LuCheck
} from 'react-icons/lu'

const Visual = ({ visual }) => {
  switch (visual) {
    case 'hero':
      return (
        <div className="ob-hero">
          <LuHeart size={26} className="ob-hero-heart" style={{ top: 8, right: 16 }} />
          <LuHeart
            size={18}
            className="ob-hero-heart"
            style={{ top: 26, left: 18, animationDelay: '0.45s' }}
          />
          <div className="ob-hero-tile">
            <LuPlay size={30} />
          </div>
          <span className="ob-hero-pill">Movie night, anywhere</span>
        </div>
      )
    case 'couple':
      return (
        <div className="ob-chips">
          <div className="ob-chip">
            <span className="ob-chip-role">Y</span>
            You
          </div>
          <LuHeart size={18} className="ob-chip-sync" />
          <div className="ob-chip">
            <span
              className="ob-chip-role"
              style={{ background: 'linear-gradient(135deg,#ec4899,#f472b6)' }}
            >
              P
            </span>
            Partner
          </div>
        </div>
      )
    case 'group':
      return (
        <div className="ob-chips-group">
          <div className="ob-chip">
            <span className="ob-chip-role">Y</span>
            You
          </div>
          <div className="ob-chip">
            <span
              className="ob-chip-role"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' }}
            >
              A
            </span>
            Alex
          </div>
          <div className="ob-chip">
            <span
              className="ob-chip-role"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}
            >
              R
            </span>
            Ria
          </div>
          <LuUsers size={18} className="ob-chip-sync" />
        </div>
      )
    case 'sync':
      return (
        <div className="ob-sync-visual">
          <div className="ob-sync-frame" />
          <div className="ob-sync-frame" />
          <div className="ob-sync-frame" />
          <LuZap size={20} className="ob-sync-bolt" />
        </div>
      )
    case 'chat':
      return (
        <div className="ob-chat-visual">
          <div className="ob-bubble friend">this plot twist!! 🍿</div>
          <div className="ob-bubble own">I did NOT see that coming 🔥</div>
          <div className="ob-bubble friend typing">
            <span className="ob-typing-dot" />
            <span className="ob-typing-dot" />
            <span className="ob-typing-dot" />
          </div>
        </div>
      )
    default:
      return null
  }
}

const OnboardingTooltip = forwardRef(
  ({ step, index, total, position, measured, onNext, onSkip }, ref) => {
    const isLast = index === total - 1
    return (
      <div
        ref={ref}
        className="ob-tooltip"
        role="dialog"
        aria-modal="false"
        aria-live="polite"
        aria-label={`Step ${index + 1} of ${total}: ${step.title}`}
        style={measured ? position : { visibility: 'hidden', left: -9999, top: -9999 }}
      >
        <div className="ob-visual">
          <Visual visual={step.visual} />
        </div>
        <h3>{step.title}</h3>
        <p className="ob-sub">{step.subtitle}</p>
        <p className="ob-desc">{step.description}</p>
        <div className="ob-actions">
          <button type="button" className="ob-btn ob-btn-skip" onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="ob-btn ob-btn-primary" onClick={onNext} autoFocus>
            {isLast ? (
              <>
                Done!
                <LuCheck size={18} aria-hidden="true" />
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
        <div className="ob-progress">
          <span className="ob-progress-label">
            Step {index + 1} of {total}
          </span>
          <span className="ob-dots" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`ob-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}`}
              />
            ))}
          </span>
        </div>
      </div>
    )
  }
)

OnboardingTooltip.displayName = 'OnboardingTooltip'

export default OnboardingTooltip