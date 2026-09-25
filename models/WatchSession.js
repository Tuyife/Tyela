import mongoose, { Schema, model } from 'mongoose'

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
      title: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ['youtube', 'vimeo', 'upload'], required: true },
      duration: { type: Number, required: true },
      thumbnail: { type: String }
    },
    playbackState: {
      isPlaying: { type: Boolean, default: true },
      currentTime: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },
    status: { type: String, enum: ['active', 'paused', 'ended', 'cancelled'], default: 'active' },
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

export const User = model('User', UserSchema)
export const WatchSession = model('WatchSession', WatchSessionSchema)