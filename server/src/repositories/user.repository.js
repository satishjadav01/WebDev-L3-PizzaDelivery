import { User } from '../models/user.model.js';

export const userRepository = {
  create(fields) {
    return User.create(fields);
  },

  findById(id) {
    return User.findById(id);
  },

  findByEmail(email) {
    return User.findOne({ email });
  },

  /** passwordHash is excluded by default; only credential checks should ask for it. */
  findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+passwordHash');
  },

  listByRole(role) {
    return User.find({ role });
  },

  markEmailVerified(id) {
    return User.findByIdAndUpdate(id, { isEmailVerified: true }, { returnDocument: 'after' });
  },

  updatePasswordHash(id, passwordHash) {
    return User.findByIdAndUpdate(id, { passwordHash }, { returnDocument: 'after' });
  },
};
