const mongoose = require('mongoose')
const { Schema, model } = mongoose

const InviteSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'WatchSession', required: true },
    sessionType: { type: String, enum: ['couple', 'group'], default: 'couple' },
    sessionTitle: { type: String, default: 'Movie night' },
    currentPlaybackTime: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

InviteSchema.index({ toUserId: 1, status: 1 })
InviteSchema.index({ expiresAt: 1 })

module.exports = model('Invite', InviteSchema)