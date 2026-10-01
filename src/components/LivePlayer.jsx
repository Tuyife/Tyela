import { useEffect, useMemo, useRef, useState } from 'react'
import { LuCheck, LuLoader, LuVideo } from 'react-icons/lu'
import { useLiveSession } from '../live/LiveSessionContext.jsx'
import { toEmbedUrl } from '../utils/video.js'
import '../App.css'

let ytApiPromise = null
let vimeoApiPromise = null

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onerror = () => reject(new Error('YouTube API failed to load'))
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev()
      if (window.YT && window.YT.Player) resolve(window.YT)
      else reject(new Error('YouTube API not ready'))
    }
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

function loadVimeoApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Vimeo && window.Vimeo.Player) return Promise.resolve(window.Vimeo)
  if (vimeoApiPromise) return vimeoApiPromise
  vimeoApiPromise = new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://player.vimeo.com/api/player.js'
    tag.async = true
    tag.onload = () => {
      if (window.Vimeo && window.Vimeo.Player) resolve(window.Vimeo)
      else reject(new Error('Vimeo API not ready'))
    }
    tag.onerror = () => reject(new Error('Vimeo API failed to load'))
    document.head.appendChild(tag)
  })
  return vimeoApiPromise
}

function buildEmbedSrc(type, id) {
  if (!id) return null
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || 'https://tyela.vercel.app'
  if (type === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&autoplay=0&rel=0&playsinline=1&modestbranding=1&origin=${encodeURIComponent(origin)}`
  }
  if (type === 'vimeo') {
    return `https://player.vimeo.com/video/${id}?api=1&autoplay=0&title=0&byline=0&portrait=0`
  }
  return null
}

const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_BUFFERING = 3
const YT_ENDED = 0

const SUPPRESS_MS = 6000
const SEEK_THRESHOLD = 1.5
const POLL_SEEK_THRESHOLD = 2.5

const LivePlayer = ({ onNavigate }) => {
  const {
    video,
    playback,
    connected,
    peerBuffering,
    updatePlayback,
    emitSyncWait,
    emitSyncReady
  } = useLiveSession()
  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const remoteRef = useRef(false)
  const ytRef = useRef(null)
  const vimeoRef = useRef(null)
  const applyUntilRef = useRef(0)
  const waitingRef = useRef(false)
  const wasPlayingRef = useRef(false)
  const pollTimerRef = useRef(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [embedFailed, setEmbedFailed] = useState(false)

  const parsed = useMemo(() => (video && video.url ? toEmbedUrl(video.url) : null), [video])
  const isEmbed = Boolean(parsed && parsed.type !== 'media')
  const embedType = isEmbed && parsed ? parsed.type : null
  const embedId = isEmbed && parsed ? parsed.id : null
  const embedSrc = useMemo(() => (embedType && embedId ? buildEmbedSrc(embedType, embedId) : null), [embedType, embedId])

  const playbackRef = useRef(playback)
  useEffect(() => {
    playbackRef.current = playback
  }, [playback])

  const videoUrl = video && video.url
  useEffect(() => {
    const id = requestAnimationFrame(() => setEmbedFailed(false))
    return () => cancelAnimationFrame(id)
  }, [videoUrl])

  // Apply remote playback state to a local media element
  useEffect(() => {
    const el = videoRef.current
    if (isEmbed || !el || !video) return
    remoteRef.current = true
    try {
      if (peerBuffering) {
        el.pause()
      } else {
        if (playback.currentTime != null && Math.abs(el.currentTime - playback.currentTime) > 1.2) {
          el.currentTime = playback.currentTime
        }
        const p = playback.isPlaying ? el.play() : el.pause()
        if (p && p.catch) p.catch(() => {})
      }
    } catch {
      /* ignore playback control errors */
    }
    const timer = setTimeout(() => {
      remoteRef.current = false
    }, 700)
    return () => clearTimeout(timer)
  }, [playback, peerBuffering, isEmbed, video])

  // Build the embed controller (YouTube IFrame API / Vimeo Player API) for the current video
  useEffect(() => {
    if (!isEmbed || !embedType || !embedId) return undefined
    const frame = iframeRef.current
    if (!frame) return undefined
    let cancelled = false
    setPlayerReady(false)
    applyUntilRef.current = 0
    waitingRef.current = false
    wasPlayingRef.current = false

    const safeTime = async () => {
      try {
        if (embedType === 'youtube' && ytRef.current && ytRef.current.getCurrentTime) {
          return ytRef.current.getCurrentTime()
        }
        if (embedType === 'vimeo' && vimeoRef.current && vimeoRef.current.getCurrentTime) {
          return vimeoRef.current.getCurrentTime()
        }
        return null
      } catch {
        return null
      }
    }

    const consumeState = (kind) => {
      const now = Date.now()
      if (now < applyUntilRef.current) {
        if (kind === 'play') wasPlayingRef.current = true
        return
      }
      safeTime().then((t) => {
        const time = Math.max(0, t == null ? 0 : t)
        switch (kind) {
          case 'play':
            wasPlayingRef.current = true
            if (waitingRef.current) {
              waitingRef.current = false
              if (playbackRef.current.isPlaying) {
                updatePlayback('play', time)
                emitSyncReady(time)
              } else {
                emitSyncReady(time)
              }
            } else if (!playbackRef.current.isPlaying) {
              updatePlayback('play', time)
              emitSyncReady(time)
            }
            break
          case 'pause':
          case 'ended':
            if (playbackRef.current.isPlaying) updatePlayback('pause', time)
            break
          case 'buffering':
            if (playbackRef.current.isPlaying && wasPlayingRef.current) {
              emitSyncWait(time)
              waitingRef.current = true
            }
            break
          case 'seeked':
            if (!playbackRef.current.isPlaying && Math.abs(time - (playbackRef.current.currentTime || 0)) > POLL_SEEK_THRESHOLD) {
              updatePlayback('seek', time)
            }
            break
          default:
            break
        }
      }).catch(() => {})
    }

    if (embedType === 'youtube') {
      loadYouTubeApi()
        .then((YT) => {
          if (cancelled) return
          ytRef.current = new YT.Player(frame, {
            videoId: embedId,
            playerVars: { rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1 },
            events: {
              onReady: () => {
                if (!cancelled) setPlayerReady(true)
              },
              onStateChange: (e) => {
                if (cancelled) return
                if (e.data === YT_PLAYING) consumeState('play')
                else if (e.data === YT_PAUSED) consumeState('pause')
                else if (e.data === YT_ENDED) consumeState('ended')
                else if (e.data === YT_BUFFERING) consumeState('buffering')
              },
              onError: () => {
                if (!cancelled) setEmbedFailed(true)
              }
            }
          })
        })
        .catch(() => {
          if (!cancelled) setEmbedFailed(true)
        })
    } else if (embedType === 'vimeo') {
      loadVimeoApi()
        .then((Vimeo) => {
          if (cancelled) return
          const player = new Vimeo.Player(frame)
          vimeoRef.current = player
          player.ready().then(() => {
            if (!cancelled) setPlayerReady(true)
          }).catch(() => {
            if (!cancelled) setEmbedFailed(true)
          })
          player.on('play', () => {
            if (!cancelled) consumeState('play')
          })
          player.on('pause', () => {
            if (!cancelled) consumeState('pause')
          })
          player.on('ended', () => {
            if (!cancelled) consumeState('ended')
          })
          player.on('seeked', () => {
            if (!cancelled) consumeState('seeked')
          })
          player.on('bufferstart', () => {
            if (!cancelled) consumeState('buffering')
          })
          player.on('bufferend', () => {
            if (!cancelled && waitingRef.current) consumeState('play')
          })
          player.on('error', () => {
            if (!cancelled) setEmbedFailed(true)
          })
        })
        .catch(() => {
          if (!cancelled) setEmbedFailed(true)
        })
    }

    pollTimerRef.current = setInterval(() => {
      if (Date.now() < applyUntilRef.current) return
      if (playbackRef.current.isPlaying) return
      safeTime().then((t) => {
        if (t == null) return
        const drift = Math.abs(t - (playbackRef.current.currentTime || 0))
        if (drift > POLL_SEEK_THRESHOLD) updatePlayback('seek', t)
      }).catch(() => {})
    }, 1000)

    return () => {
      cancelled = true
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      try {
        if (ytRef.current && ytRef.current.destroy) ytRef.current.destroy()
      } catch {
        /* ignore destroy errors */
      }
      ytRef.current = null
      try {
        if (vimeoRef.current && vimeoRef.current.destroy) vimeoRef.current.destroy()
      } catch {
        /* ignore destroy errors */
      }
      vimeoRef.current = null
      applyUntilRef.current = 0
    }
  }, [isEmbed, embedType, embedId, updatePlayback, emitSyncWait, emitSyncReady, video])

// Apply remote playback state to the embed player (idempotent: only drive the
  // player when its real state differs, to avoid churning the video decoder)
  useEffect(() => {
    if (!isEmbed || !playerReady) return
    const apply = () => {
      const desired = playback
      const type = embedType
      const drive = async (t) => {
        if (peerBuffering) {
          if (ytRef.current) ytRef.current.pauseVideo()
          else if (vimeoRef.current) vimeoRef.current.pause().catch(() => {})
          return
        }
        applyUntilRef.current = Date.now() + SUPPRESS_MS
        const drift = t == null ? 0 : Math.abs(t - (desired.currentTime || 0))
        const shouldSeek = t != null && drift > SEEK_THRESHOLD
        if (type === 'youtube') {
          let state
          try {
            state = ytRef.current ? ytRef.current.getPlayerState() : -1
          } catch {
            state = -1
          }
          if (shouldSeek) ytRef.current.seekTo(desired.currentTime || 0, true)
          if (desired.isPlaying) {
            wasPlayingRef.current = true
            if (state !== YT_PLAYING) ytRef.current.playVideo()
          } else if (state === YT_PLAYING || state === YT_BUFFERING) {
            ytRef.current.pauseVideo()
          }
        } else if (vimeoRef.current) {
          let paused
          try {
            paused = await vimeoRef.current.getPaused().catch(() => true)
          } catch {
            paused = true
          }
          if (shouldSeek) vimeoRef.current.setCurrentTime(desired.currentTime || 0).catch(() => {})
          if (desired.isPlaying) {
            wasPlayingRef.current = true
            if (paused) vimeoRef.current.play().catch(() => {})
          } else if (!paused) {
            vimeoRef.current.pause().catch(() => {})
          }
        }
      }
      const getTime = () => {
        try {
          if (type === 'youtube' && ytRef.current) return Promise.resolve(ytRef.current.getCurrentTime())
          if (type === 'vimeo' && vimeoRef.current) return vimeoRef.current.getCurrentTime().catch(() => null)
          return Promise.resolve(null)
        } catch {
          return Promise.resolve(null)
        }
      }
      getTime().then((t) => drive(t)).catch(() => {})
    }
    apply()
  }, [playback, peerBuffering, playerReady, isEmbed, embedType])

  return (
    <div className="video-player session-player">
      {video ? (
        isEmbed ? (
          embedFailed ? (
            <div className="video-error">This provider can't be embedded. Try a YouTube or Vimeo link.</div>
          ) : (
            <iframe
              key={embedId || video.url}
              ref={iframeRef}
              src={embedSrc || ''}
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
            playsInline
            disableRemotePlayback
            className="video-player-element"
            onPlay={() => {
              if (!remoteRef.current && !peerBuffering)
                updatePlayback('play', videoRef.current ? videoRef.current.currentTime : 0)
            }}
            onPause={() => {
              if (!remoteRef.current && !peerBuffering)
                updatePlayback('pause', videoRef.current ? videoRef.current.currentTime : 0)
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
        <span className={`sync-badge ${peerBuffering ? 'waiting' : playback.isPlaying === false ? 'paused' : ''}`}>
          {peerBuffering ? <LuLoader size={12} className="sync-spin" /> : <LuCheck size={12} />}
          {peerBuffering
            ? `Waiting for ${peerBuffering.name || 'your partner'}...`
            : connected
              ? playback.isPlaying === false
                ? 'Paused'
                : 'Live'
              : 'Connecting...'}
        </span>
      )}
    </div>
  )
}

export default LivePlayer