import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import inventoryConfig from '../../config/inventory.config.js';
import inventorySeed from '../../config/inventory.seed.json' with { type: 'json' };
import menuSeed from '../../config/menu.seed.json' with { type: 'json' };
import { MONGO_DUPLICATE_KEY_CODE, ROLE, TOKEN_TYPE } from '../../src/constants/index.js';
import { InventoryItem } from '../../src/models/inventoryItem.model.js';
import { Pizza } from '../../src/models/pizza.model.js';
import { Token } from '../../src/models/token.model.js';
import { User } from '../../src/models/user.model.js';
import { inventoryRepository } from '../../src/repositories/inventory.repository.js';
import { pizzaRepository } from '../../src/repositories/pizza.repository.js';
import { tokenRepository } from '../../src/repositories/token.repository.js';
import { seedCatalog } from '../../src/seed/seedCatalog.js';
import { connectTestDatabase, hasTestDatabase } from '../helpers/mongo.js';

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };
const seed = () =>
  seedCatalog({
    inventorySeed,
    menuSeed,
    inventoryConfig,
    inventoryRepository,
    pizzaRepository,
    logger: silentLogger,
  });

describe.skipIf(!hasTestDatabase)('repositories against MongoDB', () => {
  let database;

  beforeAll(async () => {
    database = await connectTestDatabase('repositories');
    await Promise.all([InventoryItem.init(), User.init(), Token.init()]);
  });

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.reset();
  });

  describe('catalog seeding', () => {
    it('loads every item and pizza, and links ingredients by id', async () => {
      await seed();
      expect(await InventoryItem.countDocuments()).toBe(inventorySeed.items.length);
      expect(await Pizza.countDocuments()).toBe(menuSeed.pizzas.length);

      const margherita = await Pizza.findOne({ key: 'margherita' }).populate('ingredients');
      expect(margherita.ingredients.map((item) => item.key).sort()).toEqual(
        [...menuSeed.pizzas.find((pizza) => pizza.key === 'margherita').ingredients].sort(),
      );
    });

    it('can be re-run without resetting live stock', async () => {
      await seed();
      await InventoryItem.updateOne({ key: 'base-thin' }, { quantity: 7 });
      await seed();
      expect((await InventoryItem.findOne({ key: 'base-thin' })).quantity).toBe(7);
      expect(await InventoryItem.countDocuments()).toBe(inventorySeed.items.length);
    });
  });

  describe('inventory', () => {
    beforeEach(seed);

    it('decrements atomically: concurrent buyers never take more than exists', async () => {
      const item = await InventoryItem.findOneAndUpdate(
        { key: 'base-thin' },
        { quantity: 10 },
        { returnDocument: 'after' },
      );
      const attempts = await Promise.all(
        Array.from({ length: 6 }, () =>
          inventoryRepository.decrementIfAvailable({ id: item._id, units: 3 }),
        ),
      );
      expect(attempts.filter(Boolean)).toHaveLength(3);
      expect((await InventoryItem.findById(item._id)).quantity).toBe(1);
    });

    it('rejects negative stock at the model level too', async () => {
      await expect(
        InventoryItem.updateOne({ key: 'base-thin' }, { quantity: -1 }, { runValidators: true }),
      ).rejects.toThrow();
    });

    it('re-arms the alert only when stock climbs back to the threshold', async () => {
      const item = await InventoryItem.findOne({ key: 'base-thin' });
      await InventoryItem.updateOne({ _id: item._id }, { quantity: 1, lastAlertedAt: new Date() });

      await inventoryRepository.setQuantity({ id: item._id, quantity: item.threshold - 1 });
      expect((await InventoryItem.findById(item._id)).lastAlertedAt).not.toBeNull();

      await inventoryRepository.setQuantity({ id: item._id, quantity: item.threshold });
      expect((await InventoryItem.findById(item._id)).lastAlertedAt).toBeNull();
    });

    it('claims each low item once even when two workers run together', async () => {
      await InventoryItem.updateMany(
        { key: { $in: ['base-thin', 'sauce-pesto'] } },
        { quantity: 1 },
      );
      const now = new Date();
      const cooldownMs = 60_000;

      const [first, second] = await Promise.all([
        inventoryRepository.claimLowStock({ now, cooldownMs }),
        inventoryRepository.claimLowStock({ now, cooldownMs }),
      ]);
      const claimedKeys = [...first, ...second].map((item) => item.key).sort();
      expect(claimedKeys).toEqual(['base-thin', 'sauce-pesto']);

      expect(await inventoryRepository.claimLowStock({ now, cooldownMs })).toHaveLength(0);
    });

    it('treats the threshold as exclusive', async () => {
      const item = await InventoryItem.findOne({ key: 'base-thin' });
      await InventoryItem.updateOne({ _id: item._id }, { quantity: item.threshold });
      const claimed = await inventoryRepository.claimLowStock({
        now: new Date(),
        cooldownMs: 60_000,
      });
      expect(claimed.map((entry) => entry.key)).not.toContain('base-thin');
    });
  });

  describe('users and tokens', () => {
    it('enforces unique emails with the duplicate-key code the error handler maps', async () => {
      const fields = { name: 'A', email: 'a@example.test', passwordHash: 'x', role: ROLE.CUSTOMER };
      await User.create(fields);
      await expect(User.create(fields)).rejects.toMatchObject({
        code: MONGO_DUPLICATE_KEY_CODE,
      });
    });

    it('hides the password hash unless explicitly requested', async () => {
      await User.create({
        name: 'A',
        email: 'a@example.test',
        passwordHash: 'x',
        role: ROLE.CUSTOMER,
      });
      const plain = await User.findOne({ email: 'a@example.test' });
      const withHash = await User.findOne({ email: 'a@example.test' }).select('+passwordHash');
      expect(plain.passwordHash).toBeUndefined();
      expect(withHash.passwordHash).toBe('x');
      expect(plain.toJSON().passwordHash).toBeUndefined();
    });

    it('lets exactly one of several concurrent requests consume a token', async () => {
      const user = await User.create({
        name: 'A',
        email: 'a@example.test',
        passwordHash: 'x',
        role: ROLE.CUSTOMER,
      });
      const now = new Date();
      await tokenRepository.create({
        user: user._id,
        type: TOKEN_TYPE.EMAIL_VERIFICATION,
        tokenHash: 'hash-1',
        expiresAt: new Date(now.getTime() + 60_000),
      });

      const consumed = await Promise.all(
        Array.from({ length: 5 }, () =>
          tokenRepository.consume({
            tokenHash: 'hash-1',
            type: TOKEN_TYPE.EMAIL_VERIFICATION,
            now,
          }),
        ),
      );
      expect(consumed.filter(Boolean)).toHaveLength(1);
    });

    it('does not consume an expired token', async () => {
      const user = await User.create({
        name: 'A',
        email: 'b@example.test',
        passwordHash: 'x',
        role: ROLE.CUSTOMER,
      });
      const now = new Date();
      await tokenRepository.create({
        user: user._id,
        type: TOKEN_TYPE.PASSWORD_RESET,
        tokenHash: 'hash-2',
        expiresAt: new Date(now.getTime() - 1),
      });
      expect(
        await tokenRepository.consume({
          tokenHash: 'hash-2',
          type: TOKEN_TYPE.PASSWORD_RESET,
          now,
        }),
      ).toBeNull();
    });
  });
});
