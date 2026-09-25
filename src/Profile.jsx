import { useRef, useState } from 'react'
import { LuArrowLeft, LuCamera, LuCheck, LuX } from 'react-icons/lu'
import { useUser, THEME_COLORS } from './UserContext.jsx'
import Avatar from './components/Avatar.jsx'
import { isMuted, toggleMute } from './utils/notificationSound.js'
import './App.css'

const THEME_LABEL = {
  purple: 'Purple',
  pink: 'Pink',
  teal: 'Teal',
  amber: 'Amber'
}

const Profile = ({ onNavigate }) => {
  const { user, updateProfile } = useUser()
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [bio, setBio] = useState(user.bio || '')
  const [themeColor, setThemeColor] = useState(user.themeColor || 'purple')
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [muted, setMuted] = useState(() => isMuted())
  const fileInputRef = useRef(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 2600)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return

    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      setError('Only JPG and PNG images are allowed')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar must be under 2MB')
      return
    }

    setError('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    setError('')
    setSaving(true)
    const result = await updateProfile(
      { displayName: displayName.trim(), bio: bio.trim(), themeColor },
      avatarFile
    )
    setSaving(false)

    if (result.ok) {
      showToast('Profile saved')
    } else {
      setError(result.error || 'Could not save profile')
    }
  }

  return (
    <div className="profile-screen">
      <button className="back-home" onClick={() => onNavigate('dashboard')}>
        <LuArrowLeft size={14} /> Back to dashboard
      </button>

      <div className="profile-card">
        <h2>Edit profile</h2>
        <p className="profile-subtitle">Make TYELA feel like yours</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSave}>
          <div className="profile-avatar-wrap">
            <Avatar src={avatarPreview} name={displayName || user.displayName} size={96} />
            <button
              type="button"
              className="avatar-edit"
              aria-label="Change avatar"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <LuCamera size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              onChange={handleAvatarChange}
            />
          </div>
          <p className="avatar-hint">JPG or PNG, up to 2MB</p>

          <div className="form-group">
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              maxLength={50}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="bio-wrap">
            <textarea
              placeholder="Bio (optional)"
              value={bio}
              maxLength={100}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
            />
            <span className="bio-counter">{bio.length}/100</span>
          </div>

          <div className="theme-section">
            <label>Theme color</label>
            <div className="color-options">
              {THEME_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch swatch-${color} ${themeColor === color ? 'swatch-selected' : ''}`}
                  aria-label={THEME_LABEL[color]}
                  title={THEME_LABEL[color]}
                  onClick={() => setThemeColor(color)}
                >
                  {themeColor === color && <LuCheck size={13} />}
                </button>
              ))}
            </div>
            <p className="theme-hint">Applies to buttons, accents and highlights</p>
          </div>

          <div className="theme-section notif-section">
            <label>Notifications</label>
            <div className="notif-row">
              <div className="notif-copy">
                <strong>Message sounds</strong>
                <p className="theme-hint">Play a short beep when a new message arrives</p>
              </div>
              <button
                type="button"
                className={`toggle ${muted ? '' : 'toggle-on'}`}
                aria-pressed={!muted}
                aria-label="Toggle message sounds"
                onClick={() => setMuted(toggleMute())}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <span className="btn-progress">
                <span className="loading-spinner mini" /> Saving…
              </span>
            ) : (
              <>
                Save changes <LuCheck size={16} className="btn-check" />
              </>
            )}
          </button>
        </form>

        {avatarFile && (
          <button
            type="button"
            className="avatar-remove"
            onClick={() => {
              setAvatarFile(null)
              setAvatarPreview(user.avatarUrl || '')
            }}
          >
            <LuX size={14} /> Remove new avatar
          </button>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default Profile