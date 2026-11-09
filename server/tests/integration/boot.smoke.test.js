import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import inventorySeed from '../../config/inventory.seed.json' with { type: 'json' };
import menuSeed from '../../config/menu.seed.json' with { type: 'json' };
import { ROLE } from '../../src/constants/index.js';
import { connectTestDatabase, hasTestDatabase } from '../helpers/mongo.js';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATABASE_NAME = 'boot_smoke';
const BOOT_TIMEOUT_MS = 40_000;
const POLL_INTERVAL_MS = 250;
const SCRIPT_TIMEOUT_MS = 60_000;
const SUITE_TIMEOUT_MS = 240_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function databaseUri() {
  const uri = new URL(process.env.TEST_MONGODB_URI);
  uri.pathname = `/${DATABASE_NAME}`;
  return uri.toString();
}

const runScript = (script) =>
  spawnSync(process.execPath, [script], {
    cwd: SERVER_ROOT,
    env: { ...process.env, MONGODB_URI: databaseUri(), LOG_LEVEL: 'warn' },
    encoding: 'utf8',
    timeout: SCRIPT_TIMEOUT_MS,
  });

/**
 * Starts the real entrypoint, seed and admin scripts as separate processes. This is what
 * `pnpm start`, `pnpm seed` and `pnpm create-admin` do, so it catches wiring the unit
 * suites cannot (config -> driver options, scheduler start-up, script entrypoints).
 * Graceful signal handling is not asserted: Windows cannot deliver SIGTERM to a child.
 */
describe.skipIf(!hasTestDatabase)('real process boot', () => {
  let database;

  beforeAll(async () => {
    database = await connectTestDatabase(DATABASE_NAME);
  });

  afterAll(async () => {
    await database?.close();
  });

  it(
    'seeds idempotently and provisions the admin once',
    { timeout: SUITE_TIMEOUT_MS },
    async () => {
      for (let run = 0; run < 2; run += 1) {
        const seeded = runScript('src/scripts/seed.js');
        expect(seeded.status, seeded.stderr).toBe(0);
      }
      const items = mongoose.connection.collection('inventoryitems');
      const pizzas = mongoose.connection.collection('pizzas');
      expect(await items.countDocuments()).toBe(inventorySeed.items.length);
      expect(await pizzas.countDocuments()).toBe(menuSeed.pizzas.length);

      const first = runScript('src/scripts/createAdmin.js');
      const second = runScript('src/scripts/createAdmin.js');
      expect(first.status, first.stderr).toBe(0);
      expect(first.stdout).toContain('Admin created');
      expect(second.stdout).toContain('Admin already exists');
      expect(
        await mongoose.connection.collection('users').countDocuments({ role: ROLE.ADMIN }),
      ).toBe(1);
    },
  );

  it(
    'boots, schedules jobs, serves traffic and reports healthy',
    { timeout: SUITE_TIMEOUT_MS },
    async () => {
      const port = await freePort();
      let output = '';
      const child = spawn(process.execPath, ['src/server.js'], {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          MONGODB_URI: databaseUri(),
          PORT: String(port),
          LOG_LEVEL: 'info',
          LOG_PRETTY: 'false',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', (chunk) => (output += chunk));
      child.stderr.on('data', (chunk) => (output += chunk));

      try {
        const url = `http://127.0.0.1:${port}/api/v1`;
        const deadline = Date.now() + BOOT_TIMEOUT_MS;
        let health;
        while (Date.now() < deadline && !health) {
          try {
            const res = await fetch(`${url}/health`);
            if (res.ok) health = await res.json();
          } catch {
            await sleep(POLL_INTERVAL_MS);
          }
        }
        expect(health, `server never became healthy. Output:\n${output}`).toBeDefined();
        expect(health.checks.database).toBe('up');

        const meta = await (await fetch(`${url}/meta/client-config`)).json();
        expect(meta.orderStatus.labels.in_kitchen).toBe('In Kitchen');

        const menu = await (await fetch(`${url}/catalog/pizzas`)).json();
        expect(menu.pizzas).toHaveLength(menuSeed.pizzas.length);

        expect(output).toContain('job scheduled');
        expect(output).not.toMatch(/not supported|unknown option/i);
      } finally {
        child.kill();
      }
    },
  );
});
