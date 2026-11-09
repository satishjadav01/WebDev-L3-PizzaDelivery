import { Token } from '../models/token.model.js';

export const tokenRepository = {
  create({ user, type, tokenHash, expiresAt }) {
    return Token.create({ user, type, tokenHash, expiresAt });
  },

  /** Atomically fetches and deletes an unexpired token, so a link works exactly once. */
  consume({ tokenHash, type, now }) {
    return Token.findOneAndDelete({ tokenHash, type, expiresAt: { $gt: now } });
  },

  findLatest({ user, type }) {
    return Token.findOne({ user, type }).sort({ createdAt: -1 });
  },

  deleteAllFor({ user, type }) {
    return Token.deleteMany({ user, type });
  },
};
