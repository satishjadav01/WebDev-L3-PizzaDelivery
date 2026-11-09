/**
 * Registers each job on its cron schedule (from config) and guards every tick: a job that
 * is still running is skipped instead of overlapping, and a failure is logged, never thrown.
 * `settings` maps job name -> { enabled, schedule, runOnStart }.
 */
export function createScheduler({ cron, jobs, settings, logger }) {
  const tasks = [];

  const execute = (() => {
    const running = new Set();
    return async (job) => {
      if (running.has(job.name)) {
        logger.warn({ job: job.name }, 'previous run still in progress, skipping tick');
        return;
      }
      running.add(job.name);
      try {
        const outcome = await job.run();
        logger.debug({ job: job.name, outcome }, 'job finished');
      } catch (error) {
        logger.error({ err: error, job: job.name }, 'job failed');
      } finally {
        running.delete(job.name);
      }
    };
  })();

  return {
    start() {
      for (const job of jobs) {
        const setting = settings[job.name];
        if (!setting?.enabled) continue;
        if (!cron.validate(setting.schedule)) {
          throw new Error(`Invalid cron expression for job "${job.name}": ${setting.schedule}`);
        }
        tasks.push(cron.schedule(setting.schedule, () => execute(job)));
        logger.info({ job: job.name, schedule: setting.schedule }, 'job scheduled');
        if (setting.runOnStart) void execute(job);
      }
    },

    stop() {
      tasks.splice(0).forEach((task) => task.stop());
    },
  };
}
