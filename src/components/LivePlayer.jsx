import { useEffect, useMemo, useRef, useState } from 'react'
import { LuCheck, LuVideo } from 'react-icons/lu'
import { useLiveSession } from '../live/LiveSessionContext.jsx'
import { toEmbedUrl } from '../utils/video.js'
import '../App.css'

const LivePlayer = ({ onNavigate }) => {
  const { video, playback, updatePlayback, connected } = useLiveSession()
  const videoRef = useRef(null)
  const remoteRef = useRef(false)
  const [embedFailed, setEmbedFailed] = useState(false)

  const parsed = useMemo(() => (video && video.url ? toEmbedUrl(video.url) : null), [video])
  const isEmbed = Boolean(parsed && parsed.type !== 'media')

  useEffect(() => {
    setEmbedFailed(false)
  }, [video && video.url])

  // Apply remote playback state to a local media element
  useEffect(() => {
    const el = videoRef.current
    if (isEmbed || !el || !video) return
    remoteRef.current = true
    try {
      if (playback.currentTime != null && Math.abs(el.currentTime - playback.currentTime) > 1.2) {
        el.currentTime = playback.currentTime
      }
      const p = playback.isPlaying ? el.play() : el.pause()
      if (p && p.catch) p.catch(() => {})
    } catch (error) {
      /* ignore playback control errors */
    }
    const timer = setTimeout(() => {
      remoteRef.current = false
    }, 500)
    return () => clearTimeout(timer)
  }, [playback, isEmbed, video])

  return (
    <div className="video-player session-player">
      {video ? (
        isEmbed ? (
          embedFailed ? (
            <div className="video-error">This provider can't be embedded. Try a YouTube or Vimeo link.</div>
          ) : (
            <iframe
              src={parsed.src}
              title={video.title || 'Shared video'}
              className="video-player-element"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onError={() => setEmbedFailed(true)}
            />
          )
        ) : (
          <video
            ref={videoRef}
            src={video.url}
            controls
            autoPlay={playback.isPlaying}
            className="video-player-element"
            onPlay={() => {
              if (!remoteRef.current) updatePlayback('play', videoRef.current ? videoRef.current.currentTime : 0)
            }}
            onPause={() => {
              if (!remoteRef.current) updatePlayback('pause', videoRef.current ? videoRef.current.currentTime : 0)
            }}
            onSeeked={() => {
              if (!remoteRef.current) updatePlayback('seek', videoRef.current ? videoRef.current.currentTime : 0)
            }}
            onError={null}
          />
        )
      ) : (
        <div className="no-video">
          <h3>No movie selected yet</h3>
          <p>Pick a movie and it will play for everyone in sync</p>
          {onNavigate && (
            <button className="btn-primary" onClick={() => onNavigate('movie-selection')}>
              <LuVideo size={14} /> Choose a movie
            </button>
          )}
        </div>
      )}
      {video && (
        <span className={`sync-badge ${playback.isPlaying === false ? 'paused' : ''}`}>
          <LuCheck size={12} /> {connected ? (playback.isPlaying === false ? 'Paused' : 'Live') : 'Connecting...'}
        </span>
      )}
    </div>
  )
}

export default LivePlayer