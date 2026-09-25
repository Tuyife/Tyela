import { useState } from 'react'
import { LuArrowLeft } from 'react-icons/lu'
import { setPendingLink } from './videoStore.js'
import './App.css'

const PasteLink = ({ onNavigate }) => {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!url) {
      setError('Please enter a video URL')
      return
    }
    setPendingLink(url, title || 'Linked video')
    onNavigate('watch-session')
  }

  return (
    <div className="paste-link">
      <button className="back-home" onClick={() => onNavigate('')}>
        <LuArrowLeft size={14} /> Back to home
      </button>
      <h2>Paste a video link</h2>
      <p>Enter the URL of the movie or video you want to watch</p>
      
      {error && <p className="error">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input 
            type="url" 
            placeholder="https://www.youtube.com/watch?v=..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="url"
          />
        </div>
        
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Movie title (optional)" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        
        <button type="submit" className="btn-primary">
          Start watching
        </button>
      </form>
      
      <button className="btn-secondary" onClick={() => onNavigate('movie-selection')}>
        Back to movie selection
      </button>
    </div>
  )
}

export default PasteLink