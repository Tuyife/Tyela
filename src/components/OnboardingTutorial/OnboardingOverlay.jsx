import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import OnboardingSpotlight from './OnboardingSpotlight.jsx'
import OnboardingTooltip from './OnboardingTooltip.jsx'
import { getCenteredPosition, getTooltipPosition } from '../../utils/tooltipPosition.js'
import '../../styles/onboarding.css'

const OnboardingOverlay = ({ step, index, total, onNext, onSkip, onComplete }) => {
  const tooltipRef = useRef(null)
  const [rect, setRect] = useState(null)
  const [pos, setPos] = useState(null)
  const [measured, setMeasured] = useState(false)

  const findTarget = useCallback(() => {
    if (!step || !step.highlight) return null
    const el = document.querySelector(`[data-onboarding="${step.highlight}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) return null
    return r
  }, [step])

  const layout = useCallback(() => {
    const node = tooltipRef.current
    if (!node) return
    const nw = node.offsetWidth
    const nh = node.offsetHeight
    const nextRect = findTarget()
    setRect(nextRect)
    setPos(nextRect ? getTooltipPosition(nextRect, nw, nh) : getCenteredPosition(nw, nh))
    setMeasured(true)
  }, [findTarget])

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => layout())
    return () => cancelAnimationFrame(raf)
  }, [layout, step.index])

  useEffect(() => {
    const refresh = () => layout()
    window.addEventListener('resize', refresh, { passive: true })
    window.addEventListener('scroll', refresh, { passive: true })
    return () => {
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', refresh)
    }
  }, [layout])

  const handleNext = useCallback(() => {
    if (index < total - 1) onNext()
    else onComplete()
  }, [index, total, onNext, onComplete])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onSkip()
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target && e.target.tagName) || ''
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNext, onSkip])

  return (
    <div className="onboarding-overlay" role="presentation">
      <div className="ob-dim" />
      <OnboardingSpotlight rect={rect} />
      {rect ? (
        <div
          className="ob-spotlight-focus"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      ) : null}
      <OnboardingTooltip
        ref={tooltipRef}
        step={step}
        index={index}
        total={total}
        position={pos || undefined}
        measured={measured}
        onNext={handleNext}
        onSkip={onSkip}
      />
    </div>
  )
}

export default OnboardingOverlay