import bcrypt from 'bcryptjs';

export function createPasswordService({ authConfig }) {
  const rounds = authConfig.password.bcryptRounds;

  return {
    hash: (plain) => bcrypt.hash(plain, rounds),
    compare: (plain, hash) => bcrypt.compare(plain, hash),
  };
}
