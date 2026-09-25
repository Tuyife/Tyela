import { useState, useRef } from 'react'
import { LuLink, LuUpload, LuFolderOpen, LuImages, LuX, LuArrowLeft, LuCheck } from 'react-icons/lu'
import { setPendingVideo, setPendingLink } from './videoStore.js'
import { useLiveSession } from './live/LiveSessionContext.jsx'
import { getVideoType } from './utils/video.js'
import './App.css'

const MovieSelection = ({ onNavigate }) => {
  const { sessionId, mode: liveMode, setSessionVideo } = useLiveSession()
  const isLive = Boolean(sessionId)
  const targetHub = isLive ? (liveMode === 'group' ? 'group-watch' : 'couple-watch') : null
  const [mode, setMode] = useState('paste')
  const [showPicker, setShowPicker] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef(null)

  const handlePasteSelect = () => {
    setMode('paste')
    setError('')
  }

  const handleUploadSelect = () => {
    setMode('upload')
    setError(isLive ? 'In a live session, uploads only play on your own screen. Paste a link so everyone can watch together.' : '')
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
    setPendingLink(url, title || 'Linked video')
    onNavigate('watch-session')
  }

  const handleStartUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a video file first')
      return
    }
    if (isLive) {
      setError('Uploaded files can only be watched by you. Paste a link to watch together.')
      return
    }
    setPendingVideo(selectedFile, title || selectedFile.name)
    onNavigate('watch-session')
  }

  return (
    <div className="movie-selection">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuArrowLeft size={14} /> Back to home
      </button>
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
            <button className="btn-primary" onClick={handleStartPaste}>
              Start watching
            </button>
          </div>

          <p className="optional">Optional: Movie title <input type="text" placeholder="Movie title" value={title} onChange={(e) => setTitle(e.target.value)} /></p>
        </div>
      )}

      {mode === 'upload' && (
        <div className="upload-screen">
          <h2>Upload a video</h2>
          <p>Pick a video from your files or gallery</p>

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

          <button className="btn-primary" onClick={handleStartUpload}>Upload and start</button>
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