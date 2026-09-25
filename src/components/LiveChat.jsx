import { useEffect, useRef, useState } from 'react'
import { LuSend } from 'react-icons/lu'
import { useLiveSession } from '../live/LiveSessionContext.jsx'
import { useUser } from '../UserContext.jsx'
import Avatar from './Avatar.jsx'
import '../App.css'

const LiveChat = ({ placeholder = 'Type a message...' }) => {
  const { user } = useUser()
  const { messages, sendMessage } = useLiveSession()
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    sendMessage(value)
    setText('')
  }

  return (
    <div className="chat-section">
      <div className="chat-messages chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="chat-empty">Say hi to everyone in the session</p>
        ) : (
          messages.map((m, i) => (
            <div key={m._id || i} className={`chat-message ${m.senderId === user.id ? 'own' : ''}`}>
              <Avatar name={m.senderName || 'User'} size={26} />
              <div className="message-bubble">
                <span className="bubble-sender">{m.senderName || 'User'}</span>
                <span className="bubble-text">{m.content}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <form className="message-input" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Message"
        />
        <button type="submit" aria-label="Send message">
          <LuSend size={15} />
        </button>
      </form>
    </div>
  )
}

export default LiveChat