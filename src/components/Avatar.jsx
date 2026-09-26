import { useEffect, useState } from 'react'
import { getInitials } from '../UserContext.jsx'
import { API_BASE } from '../lib/api.js'

// Resolve avatar URLs: relative backend paths (e.g. /avatars/x.jpg) point at
// the API origin; data:/blob:/https: URLs pass through untouched.
const resolveSrc = (src) => {
  if (!src) return ''
  if (/^(https?:|data:|blob:)/.test(src)) return src
  if (src.startsWith('/')) return `${API_BASE}${src}`
  return src
}

const Avatar = ({ src, name, size = 36, className = '' }) => {
  const [broken, setBroken] = useState(false)
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }
  const initials = getInitials(name)
  const resolved = resolveSrc(src)

  useEffect(() => {
    setBroken(false)
  }, [src])

  if (resolved && !broken) {
    return (
      <img
        src={resolved}
        alt={name || 'avatar'}
        className={`avatar-img ${className}`}
        style={style}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <span className={`avatar-initials ${className}`} style={style}>
      {initials}
    </span>
  )
}

export default Avatar