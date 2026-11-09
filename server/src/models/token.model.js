import mongoose from 'mongoose';
import { TOKEN_TYPE } from '../constants/index.js';

// Only the hash is stored, so a leaked collection cannot be replayed as live links.
const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(TOKEN_TYPE), required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// MongoDB removes the document shortly after `expiresAt`.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Token = mongoose.model('Token', tokenSchema);
