import { useEffect, useState } from 'react'

const BACKDROP_IMAGES = [
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1920&auto=format&fit=crop'
]

const SLIDE_INTERVAL_MS = 3000

const BackgroundSlideshow = () => {
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(() => new Set())
  const images = BACKDROP_IMAGES.filter((src) => !failed.has(src))

  useEffect(() => {
    BACKDROP_IMAGES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    if (images.length <= 1) return undefined
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [images.length])

  const markFailed = (src) =>
    setFailed((prev) => {
      if (prev.has(src)) return prev
      const next = new Set(prev)
      next.add(src)
      return next
    })

  if (images.length === 0) {
    return <div className="backdrop" aria-hidden="true" />
  }

  const activeSrc = images[index % images.length]

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-slides">
        {images.map((src) => (
          <div key={src} className={`backdrop-slide${src === activeSrc ? ' is-active' : ''}`}>
            <img src={src} alt="" onError={() => markFailed(src)} />
          </div>
        ))}
      </div>
      <div className="backdrop-scrim" />
      <div className="backdrop-glow" />
      <div className="backdrop-grain" />
    </div>
  )
}

export default BackgroundSlideshow