import { spawn } from 'node:child_process';

/**
 * Runs a Node script with inherited output and resolves to its exit code. Asynchronous on
 * purpose: callers may host a database in this process, and blocking its event loop while a
 * child talks to it can stall the database.
 */
export function runNode(script, env, { watch = false } = {}) {
  const flags = [...(watch ? ['--watch'] : []), '--env-file-if-exists=.env'];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...flags, script], { env, stdio: 'inherit' });
    child.on('exit', (status) => resolve(status));
  });
}

/** Starts a long-running Node script and returns the child so the caller can stop it. */
export function startNode(script, env, { watch = false } = {}) {
  const flags = [...(watch ? ['--watch'] : []), '--env-file-if-exists=.env'];
  return spawn(process.execPath, [...flags, script], { env, stdio: 'inherit' });
}
