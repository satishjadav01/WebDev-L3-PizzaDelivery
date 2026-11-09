import { describe, expect, it, vi } from 'vitest';
import { createScheduler } from '../../src/jobs/scheduler.js';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function fakeCron({ valid = true } = {}) {
  const tasks = [];
  return {
    tasks,
    validate: vi.fn(() => valid),
    schedule: vi.fn((expression, tick) => {
      const task = { expression, tick, stop: vi.fn() };
      tasks.push(task);
      return task;
    }),
  };
}

const setting = { enabled: true, schedule: '*/10 * * * *', runOnStart: false };

describe('scheduler', () => {
  it('schedules enabled jobs on their configured expression', () => {
    const cron = fakeCron();
    const job = { name: 'sample', run: vi.fn() };
    createScheduler({ cron, jobs: [job], settings: { sample: setting }, logger }).start();
    expect(cron.tasks.map((task) => task.expression)).toEqual(['*/10 * * * *']);
  });

  it('skips disabled and unconfigured jobs', () => {
    const cron = fakeCron();
    const jobs = [
      { name: 'off', run: vi.fn() },
      { name: 'unknown', run: vi.fn() },
    ];
    createScheduler({
      cron,
      jobs,
      settings: { off: { ...setting, enabled: false } },
      logger,
    }).start();
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('refuses to start with an invalid cron expression', () => {
    const scheduler = createScheduler({
      cron: fakeCron({ valid: false }),
      jobs: [{ name: 'sample', run: vi.fn() }],
      settings: { sample: setting },
      logger,
    });
    expect(() => scheduler.start()).toThrow(/Invalid cron expression/);
  });

  it('runs once at startup when configured', async () => {
    const run = vi.fn().mockResolvedValue({});
    createScheduler({
      cron: fakeCron(),
      jobs: [{ name: 'sample', run }],
      settings: { sample: { ...setting, runOnStart: true } },
      logger,
    }).start();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('logs a failing run instead of throwing out of the tick', async () => {
    const cron = fakeCron();
    const error = new Error('boom');
    const job = { name: 'sample', run: vi.fn().mockRejectedValue(error) };
    createScheduler({ cron, jobs: [job], settings: { sample: setting }, logger }).start();

    await expect(cron.tasks[0].tick()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith({ err: error, job: 'sample' }, 'job failed');
  });

  it('skips a tick while the previous run is still going', async () => {
    const cron = fakeCron();
    let release;
    const job = { name: 'slow', run: vi.fn(() => new Promise((resolve) => (release = resolve))) };
    createScheduler({ cron, jobs: [job], settings: { slow: setting }, logger }).start();

    const first = cron.tasks[0].tick();
    await cron.tasks[0].tick();
    expect(job.run).toHaveBeenCalledTimes(1);

    release();
    await first;
    // A fresh run starts once the previous one has finished (it stays pending here).
    void cron.tasks[0].tick();
    expect(job.run).toHaveBeenCalledTimes(2);
  });

  it('stops every scheduled task', () => {
    const cron = fakeCron();
    const scheduler = createScheduler({
      cron,
      jobs: [{ name: 'sample', run: vi.fn() }],
      settings: { sample: setting },
      logger,
    });
    scheduler.start();
    scheduler.stop();
    expect(cron.tasks[0].stop).toHaveBeenCalled();
  });
});

describe('shipped job wiring', () => {
  it('has a cron setting for every registered job name', async () => {
    const { default: cronConfig } = await import('../../config/cron.config.js');
    const { LOW_STOCK_JOB_NAME } = await import('../../src/jobs/lowStock.job.js');
    expect(Object.keys(cronConfig)).toContain(LOW_STOCK_JOB_NAME);
  });
});
