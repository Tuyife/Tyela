import { useState, useEffect, useCallback } from 'react'

// Detect the native browser "Add to home screen / Install" prompt and expose
// a trigger. Chrome/Edge (desktop + Android) fire `beforeinstallprompt`;
// Safari/iOS relies on the Share menu instead and reports nothing here.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false
  )

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    const onAppInstalled = () => {
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      setIsInstallable(false)
      return true
    }
    return false
  }, [deferredPrompt])

  return { isInstallable, isInstalled, handleInstall }
}