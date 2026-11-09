import { MongoMemoryReplSet } from 'mongodb-memory-server';

// mongod occasionally stalls in its first seconds (antivirus scanning the fresh data dir);
// a short timeout plus retries recovers faster than one long wait.
const DEFAULTS = Object.freeze({
  launchTimeoutMs: 30_000,
  attempts: 2,
  // create() can stall past launchTimeout (seen on Windows), so the whole startup gets a hard cap.
  deadlineMs: 75_000,
});

function withDeadline(promise, ms) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`mongod did not start within ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

async function startWithRetries({ launchTimeoutMs, attempts }) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await MongoMemoryReplSet.create({
        replSet: { count: 1 },
        instanceOpts: [{ launchTimeout: launchTimeoutMs }],
      });
    } catch (error) {
      lastError = error;
      process.stderr.write(`mongod start attempt ${attempt}/${attempts} failed\n`);
    }
  }
  throw lastError;
}

/**
 * Starts a throwaway single-node replica set. A replica set (not a standalone server) is
 * needed because the app relies on multi-document transactions for stock and payments.
 */
export function startMemoryReplSet(options = {}) {
  const settings = { ...DEFAULTS, ...options };
  return withDeadline(startWithRetries(settings), settings.deadlineMs);
}
