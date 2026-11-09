import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isDatabaseReady } from '../../src/db/connection.js';
import { connectTestDatabase, hasTestDatabase } from '../helpers/mongo.js';

let database;

beforeAll(async () => {
  if (!hasTestDatabase) return;
  database = await connectTestDatabase('infra_smoke');
});

afterAll(async () => {
  await database?.close();
});

describe.skipIf(!hasTestDatabase)('test database harness', () => {
  it('connects and reports ready', () => {
    expect(isDatabaseReady()).toBe(true);
  });

  it('supports multi-document transactions', async () => {
    const items = mongoose.connection.collection('smoke');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await items.insertOne({ name: 'a' }, { session });
        await items.insertOne({ name: 'b' }, { session });
      });
    } finally {
      await session.endSession();
    }
    expect(await items.countDocuments()).toBe(2);
  });
});
