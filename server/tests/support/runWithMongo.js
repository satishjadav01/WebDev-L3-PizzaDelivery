/**
 * Test entry point: provides a MongoDB replica set, then runs vitest against it.
 *
 * Why outside vitest: starting mongodb-memory-server from inside vitest proved unreliable
 * on Windows. A replica set (not a standalone server) is required because the app uses
 * multi-document transactions for stock and payments.
 *
 * Set TEST_MONGODB_URI to reuse an existing replica set (CI service, local cluster) and
 * skip the in-memory one.
 *
 * If no replica set can be started, suites that need a database are skipped (not failed)
 * and a warning explains how to supply one.
 *
 * Usage: node tests/support/runWithMongo.js [vitest args]   (defaults to `run`)
 */
import { spawn } from 'node:child_process';
import { startMemoryReplSet } from '../../tools/memoryReplSet.js';

const FAILURE_EXIT_CODE = 1;

function runVitest(args, env) {
  const vitestArgs = args.length > 0 ? args : ['run'];
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['exec', 'vitest', ...vitestArgs], {
      stdio: 'inherit',
      shell: true,
      env,
    });
    child.on('exit', (code) => resolve(code ?? FAILURE_EXIT_CODE));
  });
}

async function main() {
  const args = process.argv.slice(2);
  let replSet;
  const env = { ...process.env };

  if (!env.TEST_MONGODB_URI) {
    try {
      replSet = await startMemoryReplSet();
      env.TEST_MONGODB_URI = replSet.getUri();
    } catch (error) {
      process.stderr.write(
        [
          '',
          `WARNING: no test database available (${error.message}).`,
          'Database suites will be skipped. Set TEST_MONGODB_URI to a replica set or an',
          'Atlas test cluster to run them.',
          '',
        ].join('\n'),
      );
    }
  }

  try {
    return await runVitest(args, env);
  } finally {
    await replSet?.stop();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(FAILURE_EXIT_CODE);
  },
);
