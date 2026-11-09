/**
 * Zero-setup demo: runs the API against a throwaway in-memory MongoDB, so you can try the
 * whole app without an Atlas account. Data disappears when this process stops.
 *
 * It seeds the catalog, creates an admin, then starts the real server with the same
 * entrypoint as `pnpm start`. Variables already set in your shell win over these defaults;
 * a .env file does not, because Node's --env-file never overrides existing variables.
 *
 * Usage: pnpm dev:memory
 */
import { randomBytes } from 'node:crypto';
import { startMemoryReplSet } from './memoryReplSet.js';
import { runNode, startNode } from './runNode.js';

const FAILURE_EXIT_CODE = 1;
const SECRET_BYTES = 32;
const DEMO_DATABASE = 'pizza_demo';
// Interactive use can afford to wait: a cold mongod on Windows sometimes needs a few tries.
const STARTUP = { launchTimeoutMs: 45_000, attempts: 4, deadlineMs: 240_000 };
const DEMO = {
  ADMIN_EMAIL: 'admin@pizza.test',
  ADMIN_PASSWORD: 'Admin-demo-pass-1',
  DEMO_CUSTOMER_EMAIL: 'customer@pizza.test',
  DEMO_CUSTOMER_PASSWORD: 'Customer-demo-pass-1',
};

async function main() {
  const replSet = await startMemoryReplSet(STARTUP);
  const uri = new URL(replSet.getUri());
  uri.pathname = `/${DEMO_DATABASE}`;

  const env = {
    NODE_ENV: 'development',
    LOG_PRETTY: 'true',
    JWT_SECRET: randomBytes(SECRET_BYTES).toString('hex'),
    MOCK_PAYMENT_SECRET: randomBytes(SECRET_BYTES).toString('hex'),
    CLIENT_ORIGIN: 'http://localhost:5173',
    CLIENT_BASE_URL: 'http://localhost:5173',
    ...DEMO,
    ...process.env,
    MONGODB_URI: uri.toString(),
  };

  for (const script of [
    'src/scripts/seed.js',
    'src/scripts/createAdmin.js',
    'tools/seedDemoCustomer.js',
  ]) {
    if ((await runNode(script, env)) !== 0) throw new Error(`${script} failed`);
  }
  process.stdout.write(
    `\nDemo admin: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD} (open /admin/login)\n\n`,
  );

  const server = startNode('src/server.js', env);

  const stop = async () => {
    server.kill();
    await replSet.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.on('exit', async (code) => {
    await replSet.stop();
    process.exit(code ?? FAILURE_EXIT_CODE);
  });
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(FAILURE_EXIT_CODE);
});
