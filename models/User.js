const mongoose = require('mongoose')
const { Schema, model } = mongoose

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    partnerConnectionCode: { type: String },
    partnerConnectionCodeExpires: { type: Date },
    isConnectedWithPartner: { type: Boolean, default: false },
    profileImage: { type: String },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 100 },
    themeColor: { type: String, enum: ['purple', 'pink', 'teal', 'amber'], default: 'purple' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

const WatchSessionSchema = new Schema(
  {
    sessionType: { type: String, enum: ['couple', 'group'], required: true },
    couple: {
      user1Id: { type: Schema.Types.ObjectId, ref: 'User' },
      user2Id: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    group: {
      hostId: { type: Schema.Types.ObjectId, ref: 'User' },
      participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      roomCode: { type: String }
    },
    video: {
      title: { type: String, default: '' },
      url: { type: String, default: '' },
      type: { type: String, enum: ['youtube', 'vimeo', 'upload', 'media'], default: 'media' },
      duration: { type: Number, default: 0 },
      thumbnail: { type: String }
    },
    playbackState: {
      isPlaying: { type: Boolean, default: true },
      currentTime: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },
    status: { type: String, enum: ['active', 'paused', 'ended', 'cancelled'], default: 'active' },
    pausedAt: { type: Date },
    resumedAt: { type: Date },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    messages: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User' },
        senderName: { type: String, required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        movieTimestamp: { type: Number }
      }
    ],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date }
  },
  { timestamps: true }
)

module.exports = { User: model('User', UserSchema), WatchSession: model('WatchSession', WatchSessionSchema) }