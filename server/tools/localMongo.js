/**
 * A persistent local MongoDB for development, without Atlas and without the download-and-
 * wait of the in-memory database. It runs one detached `mongod` as a single-node replica set
 * (the app needs transactions), keeps its data in server/.cache/mongo-data, and survives
 * between runs until you stop it.
 *
 * Usage: node tools/localMongo.js [start|stop|status]   (see `pnpm db:start`, `pnpm db:stop`)
 *
 * It needs a `mongod` binary. It looks, in order, at $MONGOD_PATH, the copy that
 * mongodb-memory-server caches in ~/.cache/mongodb-binaries, then `mongod` on your PATH.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(SERVER_ROOT, '.cache');
const DATA_DIR = path.join(CACHE_DIR, 'mongo-data');
const LOG_FILE = path.join(CACHE_DIR, 'mongod.log');
const PID_FILE = path.join(CACHE_DIR, 'mongod.pid');

const LOCAL = Object.freeze({ port: 27018, replSet: 'rs0', database: 'pizza' });
export const LOCAL_MONGO_URI = `mongodb://127.0.0.1:${LOCAL.port}/${LOCAL.database}?replicaSet=${LOCAL.replSet}`;
const DIRECT_URI = `mongodb://127.0.0.1:${LOCAL.port}/?directConnection=true`;

const PROBE_TIMEOUT_MS = 1_500;
const CONNECT_TIMEOUT_MS = 20_000;
const START_TIMEOUT_MS = 90_000;
const PRIMARY_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;
const NOT_YET_INITIALIZED = 'NotYetInitialized';
const MEMORY_SERVER_CACHE = path.join(os.homedir(), '.cache', 'mongodb-binaries');
const SIDECAR_EXTENSIONS = ['.md5', '.lock'];

const log = (message) => process.stdout.write(`${message}\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function findMongodBinary() {
  if (process.env.MONGOD_PATH) return process.env.MONGOD_PATH;

  if (existsSync(MEMORY_SERVER_CACHE)) {
    // The cache also holds sidecar files (checksums, locks) next to each binary.
    const isExecutable = (name) =>
      process.platform === 'win32'
        ? name.endsWith('.exe')
        : !SIDECAR_EXTENSIONS.some((extension) => name.endsWith(extension));
    const cached = readdirSync(MEMORY_SERVER_CACHE)
      .filter((name) => name.startsWith('mongod') && isExecutable(name))
      .sort()
      .at(-1);
    if (cached) return path.join(MEMORY_SERVER_CACHE, cached);
  }
  return 'mongod';
}

async function withDirectConnection(timeoutMs, work) {
  const connection = await mongoose
    .createConnection(DIRECT_URI, { serverSelectionTimeoutMS: timeoutMs })
    .asPromise();
  try {
    return await work(connection.db.admin());
  } finally {
    await connection.close();
  }
}

async function isReachable() {
  try {
    await withDirectConnection(PROBE_TIMEOUT_MS, (admin) => admin.command({ ping: 1 }));
    return true;
  } catch {
    return false;
  }
}

async function ensureReplicaSet() {
  await withDirectConnection(CONNECT_TIMEOUT_MS, async (admin) => {
    try {
      await admin.command({ replSetGetStatus: 1 });
    } catch (error) {
      if (error.codeName !== NOT_YET_INITIALIZED) throw error;
      await admin.command({
        replSetInitiate: {
          _id: LOCAL.replSet,
          members: [{ _id: 0, host: `127.0.0.1:${LOCAL.port}` }],
        },
      });
    }
    await waitUntil(
      async () => (await admin.command({ hello: 1 })).isWritablePrimary,
      PRIMARY_TIMEOUT_MS,
      'the replica set primary',
    );
  });
}

function launchDetached(binary) {
  mkdirSync(DATA_DIR, { recursive: true });
  const args = [
    '--port',
    String(LOCAL.port),
    '--dbpath',
    DATA_DIR,
    '--replSet',
    LOCAL.replSet,
    '--bind_ip',
    '127.0.0.1',
    '--logpath',
    LOG_FILE,
    '--logappend',
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', (error) =>
      reject(
        new Error(
          `Could not start mongod (${binary}): ${error.message}. Install MongoDB Community, ` +
            'set MONGOD_PATH, or run `pnpm dev:memory` once so a copy is downloaded.',
        ),
      ),
    );
    child.once('spawn', () => {
      child.unref();
      writeFileSync(PID_FILE, String(child.pid));
      resolve();
    });
  });
}

/** Starts the local database if it is not already running; resolves to the connection URI. */
export async function startLocalMongo() {
  if (await isReachable()) {
    log(`Local MongoDB already running on port ${LOCAL.port}`);
  } else {
    log('Starting local MongoDB…');
    await launchDetached(findMongodBinary());
    await waitUntil(
      isReachable,
      START_TIMEOUT_MS,
      `mongod to accept connections (see ${LOG_FILE})`,
    );
  }
  await ensureReplicaSet();
  return LOCAL_MONGO_URI;
}

export async function stopLocalMongo() {
  if (await isReachable()) {
    try {
      await withDirectConnection(CONNECT_TIMEOUT_MS, (admin) =>
        admin.command({ shutdown: 1, force: true }),
      );
    } catch {
      // A successful shutdown drops the connection mid-command, which surfaces as an error.
    }
    await waitUntil(async () => !(await isReachable()), CONNECT_TIMEOUT_MS, 'mongod to stop');
    log('Local MongoDB stopped');
  } else if (existsSync(PID_FILE)) {
    try {
      process.kill(Number(readFileSync(PID_FILE, 'utf8')));
    } catch {
      // The process is already gone; only the stale pid file remains.
    }
    log('Local MongoDB was not responding; cleaned up');
  } else {
    log('Local MongoDB is not running');
  }
  rmSync(PID_FILE, { force: true });
}

const isDirectRun = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const [command = 'start'] = process.argv.slice(2);
  const actions = {
    start: async () => log(`Ready: ${await startLocalMongo()}`),
    stop: stopLocalMongo,
    status: async () =>
      log((await isReachable()) ? `Running on port ${LOCAL.port}` : 'Not running'),
  };
  if (!actions[command]) {
    process.stderr.write(`Unknown command "${command}". Use start, stop or status.\n`);
    process.exit(1);
  }
  actions[command]().then(
    () => process.exit(0),
    (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    },
  );
}
