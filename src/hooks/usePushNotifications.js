import { useState } from 'react'
import { apiPost } from '../lib/api.js'

// The VAPID public key is public by design; the private half lives in the
// backend env. Allows the env override on Vercel and a safe default for dev.
const VAPID_PUBLIC_KEY =
  (import.meta.env && import.meta.env.VITE_VAPID_PUBLIC_KEY) ||
  'BOOiIJt8J6oKeEL7Xp10J4XMm5DB02CEwEWBrkeezuIgbqRMhVQeaj5jBhBL7DQ7YnKgdWK_C61Iu97fExIvZzk'

const LS_PUSH = 'tyelaPushEnabled'

export function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64url)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    typeof Notification.requestPermission === 'function'
  )
}

async function subscribeDevice() {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }))
  await apiPost('/api/notifications/subscribe', { subscription: subscription.toJSON() })
  return true
}

// Silent re-sync: never prompts, just makes sure an already-granted
// permission has a live subscription saved server-side (e.g. after an
// app update or device migration).
export async function resyncPushSubscription() {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false
  try {
    return await subscribeDevice()
  } catch {
    return false
  }
}

// Push permission + subscription manager. The permission prompt is only ever
// triggered from a user gesture (enable()), never while the app loads.
export default function usePushNotifications() {
  const [supported] = useState(() => isPushSupported())
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(LS_PUSH) === 'true'
    } catch {
      return false
    }
  })
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const enable = async () => {
    if (!supported) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return false
      await subscribeDevice()
      setEnabled(true)
      try {
        localStorage.setItem(LS_PUSH, 'true')
      } catch {
        /* ignore */
      }
      return true
    } catch {
      return false
    }
  }

  const disable = async () => {
    try {
      if (supported && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        if (sub) {
          const endpoint = sub.endpoint
          await sub.unsubscribe().catch(() => {})
          apiPost('/api/notifications/unsubscribe', { endpoint }).catch(() => {})
        }
      }
    } catch {
      /* ignore */
    }
    setEnabled(false)
    try {
      localStorage.removeItem(LS_PUSH)
    } catch {
      /* ignore */
    }
  }

  return { supported, enabled, permission, enable, disable }
}