/**
 * One command for local development without Atlas: makes sure the persistent local MongoDB
 * is running, seeds the menu, creates the admin from .env, then starts the API in watch mode.
 * The database keeps running after you stop the API; stop it with `pnpm db:stop`.
 *
 * Usage: pnpm dev:local
 */
import { startLocalMongo } from './localMongo.js';
import { runNode, startNode } from './runNode.js';

const FAILURE_EXIT_CODE = 1;

async function main() {
  const uri = await startLocalMongo();
  const env = { ...process.env, MONGODB_URI: uri };

  if ((await runNode('src/scripts/seed.js', env)) !== 0) throw new Error('Seeding failed');
  if ((await runNode('src/scripts/createAdmin.js', env)) !== 0) {
    process.stderr.write(
      'Admin was not created. Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env to get one.\n',
    );
  }

  const server = startNode('src/server.js', env, { watch: true });
  const stop = () => server.kill();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.on('exit', (code) => process.exit(code ?? FAILURE_EXIT_CODE));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(FAILURE_EXIT_CODE);
});
