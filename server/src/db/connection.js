import mongoose from 'mongoose';
import { DB_READY_STATE } from '../constants/index.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connects with a bounded number of attempts; throws the last error when all fail. */
export async function connectDatabase({ uri, options, logger }) {
  const { connectAttempts, retryDelayMs, ...mongooseOptions } = options;
  let lastError;

  for (let attempt = 1; attempt <= connectAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, mongooseOptions);
      logger.info({ attempt }, 'database connected');
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      logger.warn({ attempt, connectAttempts, err: error }, 'database connection failed');
      if (attempt < connectAttempts) await sleep(retryDelayMs);
    }
  }
  throw lastError;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === DB_READY_STATE.CONNECTED;
}
