import { useState, useRef } from 'react'
import { LuLink, LuUpload, LuFolderOpen, LuImages, LuX, LuArrowLeft, LuCheck, LuUser, LuHeart, LuUsers } from 'react-icons/lu'
import { setPendingVideo, setPendingLink, setPendingSession } from './videoStore.js'
import { apiGet, apiPost, API_BASE } from './lib/api.js'
import { attachToSession } from './lib/attachVideo.js'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { getVideoType } from './utils/video.js'
import './App.css'

const MAX_UPLOAD_MB = 500
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|m4v|ogg|ogv|mkv|avi|wmv|3gp|flv)$/i

const validateVideo = (file) => {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `That file is larger than ${MAX_UPLOAD_MB}MB. Choose a smaller video file.`
  }
  const looksVideo = (file.type && /^video\//.test(file.type)) || (file.name && VIDEO_EXT_REGEX.test(file.name))
  if (!looksVideo) {
    return 'That doesn\u2019t look like a video file. Supported: MP4, WebM, MOV, MKV and more.'
  }
  return null
}

const friendlyError = (e) => {
  const message = e && e.message ? e.message : 'Something went wrong'
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Upload failed to start — check your internet connection and try again (files up to 500MB).'
  }
  return message
}

const MovieSelection = ({ onNavigate }) => {
  const { sessionId, mode: liveMode, openLiveSession, setSessionVideo } = useLiveSession()
  const isLive = Boolean(sessionId)
  const targetHub = isLive ? (liveMode === 'group' ? 'group-watch' : 'couple-watch') : null
  const [audience, setAudience] = useState('solo')
  const [mode, setMode] = useState('paste')
  const [showPicker, setShowPicker] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const fileInput = useRef(null)

  const handlePasteSelect = () => {
    setMode('paste')
    setError('')
  }

  const handleUploadSelect = () => {
    setMode('upload')
    setError('')
  }

  const pickFile = (fromGallery) => {
    setShowPicker(false)
    const input = fileInput.current
    if (input) {
      input.setAttribute('accept', fromGallery ? 'video/*,image/*' : '.mp4,.webm,.mov,video/*')
      input.value = ''
      input.click()
    }
  }

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setFileName(file.name)
      setError('')
    }
  }

  const goToAudience = async (payload) => {
    if (audience === 'solo') {
      if (payload.file) setPendingVideo(payload.file, payload.title)
      else if (payload.url) setPendingLink(payload.url, payload.title)
      onNavigate('watch-session')
      return
    }

    setStarting(true)
    setError('')
    try {
      if (audience === 'group') {
        const created = await apiPost('/api/sessions/create', {})
        const sessionId = created.sessionId
        await attachToSession(sessionId, payload)
        openLiveSession({ sessionId, mode: 'group', code: created.code, role: 'host' })
        onNavigate('group-watch')
        return
      }
      // partner
      const active = await apiGet('/api/sessions/active').catch(() => ({ session: null }))
      if (active.session && active.session.sessionType === 'couple') {
        const sessionId = active.session._id
        await attachToSession(sessionId, payload)
        openLiveSession({ sessionId, mode: 'couple' })
        onNavigate('couple-watch')
        return
      }
      setPendingSession({ ...payload, audience: 'partner' })
      localStorage.setItem('tyelaMode', 'couple')
      onNavigate('connection-code')
    } catch (e) {
      setError(friendlyError(e))
      setStarting(false)
    }
  }

  const handleStartPaste = async () => {
    if (!url) {
      setError('Please enter a video URL')
      return
    }
    const info = { title: title || 'Linked video', url, type: getVideoType(url), duration: 0 }
    if (isLive && setSessionVideo) {
      try {
        await setSessionVideo(info)
      } catch (e) {
        setError(e.message)
        return
      }
      onNavigate(targetHub)
      return
    }
    await goToAudience(info)
    if (audience !== 'solo') setStarting(false)
  }

  const handleStartUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a video file first')
      return
    }
    const uploadError = validateVideo(selectedFile)
    if (uploadError) {
      setError(uploadError)
      return
    }
    const theTitle = title || selectedFile.name
    if (isLive) {
      setError('')
      setStarting(true)
      try {
        const form = new FormData()
        form.append('video', selectedFile)
        form.append('title', theTitle)
        const upRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('tyelaToken') || ''}` },
          body: form
        })
        const json = await upRes.json().catch(() => ({}))
        if (!upRes.ok) throw new Error(json.error || 'Upload failed')
        if (setSessionVideo) {
          await setSessionVideo({ title: theTitle, url: json.video.url, type: 'upload', duration: 0 })
        }
        onNavigate(targetHub)
      } catch (e) {
        setError(friendlyError(e))
      } finally {
        setStarting(false)
      }
      return
    }
    await goToAudience({ title: theTitle, file: selectedFile, type: 'upload' })
    if (audience !== 'solo') setStarting(false)
  }

  const audienceOptions = [
    { id: 'solo', label: 'Just me', icon: LuUser, hint: 'Watch on my own screen' },
    { id: 'partner', label: 'My partner', icon: LuHeart, hint: 'Sync with your partner' },
    { id: 'group', label: 'Group', icon: LuUsers, hint: 'Host a watch party' }
  ]

  return (
    <div className="movie-selection">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuArrowLeft size={14} /> Back to home
      </button>

      {isLive ? (
        <p className="audience-hint">
          Watching in a {liveMode === 'group' ? 'group' : 'couple'} session — the movie plays for
          everyone in sync.
        </p>
      ) : (
        <div className="audience-picker">
          <h3>Who&apos;s watching?</h3>
          <div className="audience-options">
            {audienceOptions.map((opt) => {
              const Icon = opt.icon
              const active = audience === opt.id
              return (
                <div
                  key={opt.id}
                  className={`audience-opt ${active ? 'audience-opt-active' : ''}`}
                  onClick={() => setAudience(opt.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setAudience(opt.id)}
                >
                  <Icon size={22} />
                  <strong>{opt.label}</strong>
                  <small>{opt.hint}</small>
                </div>
              )
            })}
          </div>
          {audience === 'group' && (
            <button
              className="join-room-link"
              onClick={() => {
                localStorage.setItem('tyelaMode', 'group')
                onNavigate('connection-code?join=1')
              }}
            >
              <LuUsers size={14} /> Joining a friend&apos;s watch party? Enter their room code
            </button>
          )}
        </div>
      )}

      <div className="option-cards">
        <div
          className="option-card paste-card"
          onClick={handlePasteSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handlePasteSelect()}
        >
          <div className="card-icon">
            <LuLink size={32} className="paste-icon" />
          </div>
          <h3>Paste a link</h3>
          <p>YouTube, Vimeo or streaming links</p>
          <div className="card-features">
            <span><LuCheck size={13} className="feature-check" /> YouTube support</span>
            <span><LuCheck size={13} className="feature-check" /> Vimeo support</span>
            <span><LuCheck size={13} className="feature-check" /> Streaming URLs</span>
          </div>
        </div>

        <div
          className="option-card upload-card"
          onClick={handleUploadSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleUploadSelect()}
        >
          <div className="card-icon">
            <LuUpload size={32} className="upload-icon" />
          </div>
          <h3>Upload a file</h3>
          <p>MP4, WebM or other video files</p>
          <div className="card-features">
            <span><LuCheck size={13} className="feature-check" /> MP4 format</span>
            <span><LuCheck size={13} className="feature-check" /> WebM format</span>
            <span><LuCheck size={13} className="feature-check" /> Drag & drop</span>
          </div>
        </div>
      </div>

      {mode === 'paste' && (
        <div className="paste-link-screen">
          <h2>Paste a video link</h2>
          <p>Enter the URL of the movie or video you want to watch</p>

          {error && <p className="error">{error}</p>}

          <div className="input-group">
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              id="movie-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="url"
            />
            <button className="btn-primary" onClick={handleStartPaste} disabled={starting}>
              {starting ? 'Starting…' : 'Start watching'}
            </button>
          </div>

          <p className="optional">Optional: Movie title <input type="text" placeholder="Movie title" value={title} onChange={(e) => setTitle(e.target.value)} /></p>
        </div>
      )}

      {mode === 'upload' && (
        <div className="upload-screen">
          <h2>Upload a video</h2>
          <p>{isLive ? 'Upload a file and it will stream to everyone in the room' : 'Pick a video from your files or gallery'}</p>

          {error && <p className="error">{error}</p>}

          <div className="drag-drop-area">
            <div
              className="drag-drop-inner"
              onClick={() => setShowPicker(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowPicker(true)}
            >
              <LuUpload size={40} className="drag-icon" />
              <p>Click to choose a video</p>
              <p className="file-text">or browse</p>
              {fileName && <span className="file-name">{fileName}</span>}
              <input type="file" ref={fileInput} onChange={handleFile} hidden />
            </div>
          </div>

          <div className="input-group">
            <input type="text" placeholder="Video title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <button className="btn-primary" onClick={handleStartUpload} disabled={starting}>
            {starting ? 'Uploading…' : 'Upload and start'}
          </button>
          <button className="btn-secondary" onClick={() => setMode('paste')}>
            Use a link instead
          </button>
        </div>
      )}

      {showPicker && (
        <div className="source-picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="source-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>Choose source</h3>
              <button className="picker-close" onClick={() => setShowPicker(false)} aria-label="Close">
                <LuX size={18} />
              </button>
            </div>
            <p className="picker-sub">Where would you like to pick the video from?</p>
            <div className="picker-options">
              <button className="picker-option" onClick={() => pickFile(false)}>
                <LuFolderOpen size={22} className="picker-icon" />
                <span>File explorer</span>
                <small>Browse files on your device</small>
              </button>
              <button className="picker-option" onClick={() => pickFile(true)}>
                <LuImages size={22} className="picker-icon" />
                <span>Gallery</span>
                <small>Choose a video from your gallery</small>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MovieSelection