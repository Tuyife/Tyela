import { getInitials } from '../UserContext.jsx'

const Avatar = ({ src, name, size = 36, className = '' }) => {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }
  const initials = getInitials(name)

  if (src) {
    return <img src={src} alt={name || 'avatar'} className={`avatar-img ${className}`} style={style} />
  }

  return (
    <span className={`avatar-initials ${className}`} style={style}>
      {initials}
    </span>
  )
}

export default Avatar