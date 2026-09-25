import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../lib/api.js'
import { useLiveSession } from '../live/LiveSessionContext.jsx'
import { useUser } from '../UserContext.jsx'
import ResumeWatchModal from '../components/ResumeWatchModal.jsx'

const ResumeInviteOverlay = ({ onNavigate }) => {
  const { isLoggedIn } = useUser()
  const { incomingInvite, clearInvite, openLiveSession } = useLiveSession()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return undefined
    let cancelled = false
    apiGet('/api/invites/pending')
      .then((data) => {
        if (!cancelled && data.invites && data.invites.length > 0) {
          setPending(data.invites[0])
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const invite = pending || incomingInvite

  const handleAccept = async () => {
    if (!invite) return
    setBusy(true)
    try {
      const data = await apiPost(`/api/invites/${invite.inviteId}/accept`, {})
      openLiveSession({
        sessionId: data.sessionId,
        mode: data.sessionType === 'group' ? 'group' : 'couple',
        partner: undefined
      })
      clearInvite()
      setPending(null)
      onNavigate(data.sessionType === 'group' ? 'group-watch' : 'couple-watch')
    } catch (error) {
      clearInvite()
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  const handleDecline = async () => {
    if (!invite) return
    try {
      if (invite.inviteId) {
        await apiPost(`/api/invites/${invite.inviteId}/decline`, {}).catch(() => {})
      }
    } catch (error) {
      /* ignore */
    }
    clearInvite()
    setPending(null)
  }

  if (!invite) return null

  return <ResumeWatchModal invite={invite} onAccept={handleAccept} onDecline={handleDecline} busy={busy} />
}

export default ResumeInviteOverlay