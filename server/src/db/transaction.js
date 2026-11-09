import mongoose from 'mongoose';

/**
 * Runs `work(session)` inside a MongoDB transaction and commits only if it resolves.
 * Retries transient conflicts automatically. Needs a replica set (Atlas always is one).
 */
export function createTransactionRunner() {
  return (work) => mongoose.connection.transaction((session) => work(session));
}
