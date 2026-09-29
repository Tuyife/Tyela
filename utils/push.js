const webpush = require('web-push')
const { User } = require('../models/User.js')

// VAPID support is optional: if the keys are missing (e.g. a dev box),
// push sending is disabled while the rest of the API keeps working.
const pushConfigured = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
)

if (pushConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@tyela.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

function buildUrl(path) {
  if (!path) return CLIENT_URL + '/dashboard'
  if (/^https?:\/\//.test(path)) return path
  return CLIENT_URL + (path.startsWith('/') ? path : '/' + path)
}

// Send a push notification to every saved subscription for a user.
// Expired (410) subscriptions are pruned as they are discovered.
async function sendPush(userId, { title, message, url, sessionId, tag } = {}) {
  if (!pushConfigured || !userId) return { sent: 0, configured: false }
  try {
    const user = await User.findById(userId).select('pushSubscriptions')
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return { sent: 0, configured: true, skipped: 'no-subscriptions' }
    }

    const payload = JSON.stringify({
      title: title || 'TYELA',
      message: message || '',
      url: buildUrl(url || '/dashboard'),
      sessionId: sessionId || null,
      tag: tag || 'tyela-notification'
    })

    const subs = [...user.pushSubscriptions]
    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload)
        sent += 1
      } catch (error) {
        // 404/410 = subscription no longer valid (device unsubscribed / app uninstalled)
        if (error.statusCode === 404 || error.statusCode === 410) {
          user.pushSubscriptions.pull({ _id: sub._id })
        }
      }
    }
    if (user.isModified('pushSubscriptions')) {
      await user.save().catch(() => {})
    }
    return { sent, configured: true }
  } catch (error) {
    console.error('Push send error:', error)
    return { sent: 0, configured: true, error: error.message }
  }
}

module.exports = { sendPush, pushConfigured }