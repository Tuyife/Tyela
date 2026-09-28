const OnboardingSpotlight = ({ rect }) => {
  if (!rect) return null
  const style = {
    '--x': `${rect.left + rect.width / 2}px`,
    '--y': `${rect.top + rect.height / 2}px`,
    '--rw': `${Math.max(rect.width, 80)}px`,
    '--rh': `${Math.max(rect.height, 60)}px`
  }
  return <div className="ob-spotlight" style={style} aria-hidden="true" />
}

export default OnboardingSpotlight