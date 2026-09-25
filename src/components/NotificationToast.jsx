import { LuX } from 'react-icons/lu'
import '../App.css'

const NotificationToast = ({ toast, onDismiss }) => {
  return (
    <div className={`toast-item toast-${toast.type}`} onClick={onDismiss}>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-dismiss"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
      >
        <LuX size={14} />
      </button>
    </div>
  )
}

export default NotificationToast