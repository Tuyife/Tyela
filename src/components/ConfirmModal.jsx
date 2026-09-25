import { LuX } from 'react-icons/lu'
import '../App.css'

const ConfirmModal = ({ title, message, confirmLabel = 'Delete', danger = true, busy = false, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
          <button className="resume-close" aria-label="Close" onClick={onCancel}>
            <LuX size={16} />
          </button>
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting...' : confirmLabel}
          </button>
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal