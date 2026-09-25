import { useState } from 'react'
import { LuUsers, LuCheck } from 'react-icons/lu'
import './App.css'

const ModeSelection = ({ onNavigate }) => {
  const [selectedMode, setSelectedMode] = useState(null)

  const handleCoupleSelect = () => {
    setSelectedMode('couple')
  }

  const handleGroupSelect = () => {
    setSelectedMode('group')
  }

  return (
    <div className="mode-selection">
      <div className="mode-cards">
        <div 
          className="mode-card couple-card" 
          onClick={handleCoupleSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCoupleSelect()}
        >
          <div className="card-icon">
            <LuUsers size={32} className="couple-icon" />
          </div>
          <h3>With your partner</h3>
          <p>Private 1-to-1 connection</p>
          <div className="card-features">
            <span><LuCheck size={13} className="feature-check" /> Private session</span>
            <span><LuCheck size={13} className="feature-check" /> Just the two of you</span>
            <span><LuCheck size={13} className="feature-check" /> Personal code</span>
          </div>
        </div>

        <div 
          className="mode-card group-card" 
          onClick={handleGroupSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleGroupSelect()}
        >
          <div className="card-icon">
            <LuUsers size={32} className="group-icon" />
          </div>
          <h3>With friends & family</h3>
          <p>Group watch party</p>
          <div className="card-features">
            <span><LuCheck size={13} className="feature-check" /> Up to 10 participants</span>
            <span><LuCheck size={13} className="feature-check" /> Group chat</span>
            <span><LuCheck size={13} className="feature-check" /> Room code</span>
          </div>
        </div>
      </div>

      {selectedMode && (
        <div className="continue-container">
          <button 
            className="btn-primary continue-btn" 
            onClick={() => {
              localStorage.setItem('tyelaMode', selectedMode)
              onNavigate('connection-code')
            }}
          >
            Continue
          </button>
          <button className="btn-secondary" onClick={() => setSelectedMode(null)}>
            Back
          </button>
        </div>
      )}
    </div>
  )
}

export default ModeSelection