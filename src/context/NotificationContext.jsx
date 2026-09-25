import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import NotificationToast from '../components/NotificationToast.jsx'
import '../App.css'

const NotificationContext = createContext(null)

const MAX_TOASTS = 3
const DEFAULT_DURATION = 4000

let toastId = 0

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const scheduleRemove = useCallback(
    (id, ms) => {
      const timer = setTimeout(() => dismiss(id), ms)
      timersRef.current.push(timer)
    },
    [dismiss]
  )

  const notify = useCallback(
    (message, type = 'info', duration = DEFAULT_DURATION) => {
      const id = ++toastId
      setToasts((prev) => {
        const next = [...prev, { id, message, type }]
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
      scheduleRemove(id, duration)
    },
    [scheduleRemove]
  )

  const value = useMemo(() => ({ notify, toasts, dismiss }), [notify, toasts, dismiss])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((t) => (
            <NotificationToast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)