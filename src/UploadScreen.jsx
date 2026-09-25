import { useState, useRef } from 'react'
import { LuUpload, LuFolderOpen, LuImages, LuX, LuArrowLeft } from 'react-icons/lu'
import { setPendingVideo } from './videoStore.js'
import './App.css'

const UploadScreen = ({ onNavigate }) => {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const fileInput = useRef(null)

  const openPicker = () => {
    setError('')
    setShowPicker(true)
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title) {
      setError('Please enter a video title')
      return
    }
    if (!selectedFile) {
      setError('Please choose a video file first')
      return
    }
    // Store the file so the watch session can play it
    setPendingVideo(selectedFile, title)
    onNavigate('watch-session')
  }

  return (
    <div className="upload-screen">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuArrowLeft size={14} /> Back to home
      </button>
      <h2>Upload a video</h2>
      <p>Pick a video from your files or gallery</p>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div
          className="drag-drop-area"
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openPicker()}
        >
          <LuUpload size={40} className="drag-icon" />
          <p>Click to choose a video</p>
          <p className="file-text">from files or gallery</p>
          {fileName && <span className="file-name">{fileName}</span>}
          <input type="file" ref={fileInput} onChange={handleFile} hidden />
        </div>

        <div className="input-group">
          <input
            type="text"
            placeholder="Video title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary">Upload and start</button>
      </form>

      <button className="btn-secondary" onClick={() => onNavigate('movie-selection')}>
        Back to movie selection
      </button>

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

export default UploadScreen