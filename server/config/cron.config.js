export default {
  lowStock: {
    enabled: true,
    // Standard 5-field cron expression: every 10 minutes.
    schedule: '*/10 * * * *',
    // Also check once at boot so a restart never hides an existing shortage.
    runOnStart: true,
  },
};
