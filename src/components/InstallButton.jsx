import { LuDownload, LuCheck, LuSmartphone } from 'react-icons/lu'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

// Compact install affordance shown only where the browser offers the
// installation prompt (Chromium desktop + Android). Hides itself once the
// app is installed or the browser doesn't support installation.
const InstallButton = ({ label = 'Install app', compact = false }) => {
  const { isInstallable, isInstalled, handleInstall } = useInstallPrompt()

  if (isInstalled) {
    return (
      <button type="button" className="install-btn installed" disabled>
        {compact ? <LuSmartphone size={15} /> : <LuCheck size={15} />}
        {!compact && <span>{label}</span>}
      </button>
    )
  }

  if (!isInstallable) return null

  return (
    <button type="button" className="install-btn" onClick={handleInstall}>
      <LuDownload size={15} />
      {!compact && <span>{label}</span>}
    </button>
  )
}

export default InstallButton