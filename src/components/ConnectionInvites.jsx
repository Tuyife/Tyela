import { useEffect } from 'react'
import { useUser } from '../UserContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import { getSocket } from '../socket.js'

// Global listener for "asked to join" / "watch together?" pings. These arrive
// over the socket while the recipient is anywhere in the app (usually not in a
// session), so they can't live in the in-session handler map — and a web push
// is invisible on an already-open tab, which is exactly the online case.
const ConnectionInvites = () => {
  const { user } = useUser()
  const { notify } = useNotifications()

  useEffect(() => {
    if (!user) return undefined
    const socket = getSocket()
    if (!socket) return undefined

    const onInvite = (data) => {
      if (!data) return
      const from = data.fromUser || 'Your partner'
      notify(
        data.kind === 'join' ? `${from} asked to join your watch` : `${from} invited you to watch together`,
        'info',
        6000
      )
    }

    socket.on('connection-invite', onInvite)
    return () => {
      socket.off('connection-invite', onInvite)
    }
  }, [user, notify])

  return null
}

export default ConnectionInvites