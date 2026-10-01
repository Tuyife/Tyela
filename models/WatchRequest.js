const mongoose = require('mongoose')
const { Schema, model } = mongoose

// A pending "can I join you?" from one partner to another. Distinct from
// Invite (a resume invite for a specific session): this is a request to watch
// together that the recipient accepts or declines.
const WatchRequestSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The session the asker was watching, when there was one.
    sessionId: { type: Schema.Types.ObjectId, ref: 'WatchSession', default: null },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

WatchRequestSchema.index({ toUserId: 1, status: 1, createdAt: -1 })
WatchRequestSchema.index({ fromUserId: 1, toUserId: 1, status: 1 })

module.exports = model('WatchRequest', WatchRequestSchema)
