import { useEffect, useMemo, useRef, useState } from 'react'
import { LuPlay, LuPause, LuArrowLeft, LuUpload, LuLink } from 'react-icons/lu'
import { getPendingVideo } from './videoStore.js'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { toEmbedUrl } from './utils/video.js'
import LivePlayer from './components/LivePlayer.jsx'
import LiveChat from './components/LiveChat.jsx'
import './App.css'

const WatchSession = ({ onNavigate }) => {
  const live = useLiveSession()
  const { file, title, url } = getPendingVideo()
  const [errorMsg, setErrorMsg] = useState('')
  const [video, setVideo] = useState(null)
  const videoRef = useRef(null)
  const convertedRef = useRef(false)

  const parsed = useMemo(() => (url ? toEmbedUrl(url) : null), [url])

  const isLive = Boolean(live.sessionId)
  const hubDest = isLive ? (live.mode === 'group' ? 'group-watch' : 'couple-watch') : 'movie-selection'
  const { setSessionVideo } = live

  // When entering this screen inside a live session with a pending link, share it with the session
  useEffect(() => {
    if (!isLive || convertedRef.current) return
    if (!url) return
    convertedRef.current = true
    setSessionVideo({
      title: title || 'Linked video',
      url,
      type: parsed ? parsed.type : 'media',
      duration: 0
    }).catch(() => {})
  }, [isLive, url, title, parsed, setSessionVideo])

  const handleMediaError = () => {
    setErrorMsg(
      "We couldn't play that link. Try a YouTube, Vimeo or direct MP4/WebM video URL - or upload a file instead."
    )
  }

  // Live session rendering: shared synced player + real chat
  if (isLive) {
    return (
      <div className="watch-session">
        <div className="watch-toolbar">
          <div className="video-controls">
            <button className="control-btn" onClick={() => onNavigate(hubDest)}>
              <LuArrowLeft size={14} /> {live.mode === 'group' ? 'Room' : 'Partner'}
            </button>
          </div>
          <div className="session-info">
            <span>{live.mode === 'group' ? 'Group watch' : 'Couple watch'}</span>
            <span>{live.video ? live.video.title : 'No movie selected'}</span>
          </div>
        </div>

        <LivePlayer onNavigate={onNavigate} />

        {live.video ? (
          <LiveChat placeholder="Type a message..." />
        ) : (
          <div className="no-video-actions" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={() => onNavigate('movie-selection')}>
              <LuLink size={14} /> Choose a movie
            </button>
          </div>
        )}
      </div>
    )
  }

  // Solo / non-connected rendering
  const isEmbed = Boolean(video && video.type !== 'media')

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setVideo({ type: 'media', src: objectUrl })
      setErrorMsg('')
      return () => URL.revokeObjectURL(objectUrl)
    }
    if (parsed) {
      setVideo(parsed)
      setErrorMsg('')
    }
    return undefined
  }, [file, parsed])

  const handlePlay = () => videoRef.current && videoRef.current.play()
  const handlePause = () => videoRef.current && videoRef.current.pause()
  const goToPaste = () => onNavigate('paste-link')

  return (
    <div className="watch-session">
      <div className="watch-toolbar">
        <div className="video-controls">
          <button className="control-btn" onClick={() => onNavigate('movie-selection')}>
            <LuArrowLeft size={14} /> Back
          </button>
          {video && !isEmbed && (
            <>
              <button className="control-btn" onClick={handlePlay}>
                <LuPlay size={14} /> Play
              </button>
              <button className="control-btn" onClick={handlePause}>
                <LuPause size={14} /> Pause
              </button>
            </>
          )}
        </div>
        <div className="session-info">
          <span>Watching</span>
          <span>{title || 'No video selected'}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="video-error">
          <p>{errorMsg}</p>
          <button className="btn-secondary" onClick={goToPaste}>
            <LuLink size={14} /> Paste a different link
          </button>
        </div>
      )}

      {video ? (
        <div className="video-player session-player">
          {isEmbed ? (
            <iframe
              src={video.src}
              title={title || 'Embedded video'}
              className="video-player-element"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={video.src}
              controls
              autoPlay
              className="video-player-element"
              onError={handleMediaError}
            />
          )}
          <div className="title-time">
            <span>{title}</span>
          </div>
        </div>
      ) : (
        <div className="no-video">
          <h3>No video selected</h3>
          <p>Pick a video to start your watch session</p>
          <div className="no-video-actions">
            <button className="btn-primary" onClick={() => onNavigate('upload')}>
              <LuUpload size={14} /> Upload a video
            </button>
            <button className="btn-secondary" onClick={goToPaste}>
              <LuLink size={14} /> Paste a link
            </button>
          </div>
        </div>
      )}

      <div className="chat-section session-chat">
        <div className="chat-messages">
          <p>Pair with a partner to chat live</p>
        </div>
      </div>
    </div>
  )
}

export default WatchSession