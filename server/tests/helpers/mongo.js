import mongoose from 'mongoose';

/** Database suites use `describe.skipIf(!hasTestDatabase)` so a missing mongod never fakes a pass. */
export const hasTestDatabase = Boolean(process.env.TEST_MONGODB_URI);

/**
 * Connects mongoose to the replica set provided by tests/support/runWithMongo.js, using a
 * database name unique to the calling test file so files can run in parallel.
 */
export async function connectTestDatabase(name) {
  const base = process.env.TEST_MONGODB_URI;
  if (!base) {
    throw new Error('TEST_MONGODB_URI is not set. Run the suite with `pnpm test`.');
  }
  const uri = new URL(base);
  uri.pathname = `/${name}`;
  await mongoose.connect(uri.toString());

  return {
    async reset() {
      const collections = await mongoose.connection.db.collections();
      await Promise.all(collections.map((collection) => collection.deleteMany({})));
    },
    async close() {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}
