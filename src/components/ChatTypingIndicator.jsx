import Avatar from './Avatar.jsx'
import '../App.css'

const ChatTypingIndicator = ({ isTyping, partnerName, partnerAvatar }) => {
  if (!isTyping) return null

  return (
    <div className="chat-typing-indicator">
      <Avatar src={partnerAvatar} name={partnerName || 'Partner'} size={24} />
      <span className="typing-text">
        <strong>{partnerName || 'Partner'}</strong> is typing
        <span className="typing-dots">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </span>
    </div>
  )
}

export default ChatTypingIndicator