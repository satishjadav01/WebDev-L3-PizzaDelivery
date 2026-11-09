import { vi } from 'vitest';

/** Clock the test controls, so expiry and cooldown rules run without waiting. */
export function createFakeClock(start = new Date('2026-01-01T00:00:00Z')) {
  let current = start.getTime();
  return {
    now: () => new Date(current),
    advance(ms) {
      current += ms;
    },
  };
}

/** In-memory stand-in for user.repository.js with the same method names and semantics. */
export function createFakeUserRepository() {
  const users = [];
  let sequence = 0;

  return {
    users,
    async create(fields) {
      const user = {
        _id: `user-${(sequence += 1)}`,
        isEmailVerified: false,
        ...fields,
      };
      users.push(user);
      return user;
    },
    async findById(id) {
      return users.find((user) => user._id === String(id)) ?? null;
    },
    async findByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async findByEmailWithPassword(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async listByRole(role) {
      return users.filter((user) => user.role === role);
    },
    async markEmailVerified(id) {
      const user = users.find((candidate) => candidate._id === String(id));
      if (user) user.isEmailVerified = true;
      return user ?? null;
    },
    async updatePasswordHash(id, passwordHash) {
      const user = users.find((candidate) => candidate._id === String(id));
      if (user) user.passwordHash = passwordHash;
      return user ?? null;
    },
  };
}

/** In-memory stand-in for token.repository.js, including single-use consume semantics. */
export function createFakeTokenRepository(clock) {
  const tokens = [];

  return {
    tokens,
    async create({ user, type, tokenHash, expiresAt }) {
      const record = { user, type, tokenHash, expiresAt, createdAt: clock.now() };
      tokens.push(record);
      return record;
    },
    async consume({ tokenHash, type, now }) {
      const index = tokens.findIndex(
        (token) => token.tokenHash === tokenHash && token.type === type && token.expiresAt > now,
      );
      return index === -1 ? null : tokens.splice(index, 1)[0];
    },
    async findLatest({ user, type }) {
      const matches = tokens.filter((token) => token.user === user && token.type === type);
      return matches.at(-1) ?? null;
    },
    async deleteAllFor({ user, type }) {
      for (let i = tokens.length - 1; i >= 0; i -= 1) {
        if (tokens[i].user === user && tokens[i].type === type) tokens.splice(i, 1);
      }
    },
  };
}

/** Records outgoing mail instead of sending it. */
export function createFakeEmailProvider() {
  const outbox = [];
  return {
    outbox,
    sendMail: vi.fn(async (message) => {
      outbox.push(message);
      return { messageId: `fake-${outbox.length}` };
    }),
    /** Pulls the `token` query value out of the most recent message sent to an address. */
    lastTokenFor(address) {
      const message = [...outbox].reverse().find((mail) => mail.to === address);
      return message ? /token=([^&"\s]+)/.exec(message.text)?.[1] : undefined;
    },
  };
}
