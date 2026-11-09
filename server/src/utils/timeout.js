/** Rejects if `promise` has not settled within `ms`, so callers never wait on a dead network. */
export function withTimeout(promise, ms, message) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
