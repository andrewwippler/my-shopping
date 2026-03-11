import { testPrisma } from './setup';

describe('Prisma Item Model', () => {
  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should create an item', async () => {
      const item = await testPrisma.item.create({
        data: {
          name: 'Test Item',
          person: 'Test Person',
          sort: 0,
          picked: false,
          list: 'Test List',
        },
      });

      expect(item.name).toBe('Test Item');
      expect(item.person).toBe('Test Person');
      expect(item.picked).toBe(false);
      expect(item.list).toBe('Test List');
      expect(item.id).toBeDefined();
    });

    it('should read an item by id', async () => {
      const created = await testPrisma.item.create({
        data: {
          name: 'Read Test Item',
          sort: 1,
          list: 'Test List',
        },
      });

      const item = await testPrisma.item.findUnique({
        where: { id: created.id },
      });

      expect(item).not.toBeNull();
      expect(item?.name).toBe('Read Test Item');
    });

    it('should update an item', async () => {
      const created = await testPrisma.item.create({
        data: {
          name: 'Update Test Item',
          sort: 2,
          list: 'Test List',
        },
      });

      const updated = await testPrisma.item.update({
        where: { id: created.id },
        data: { name: 'Updated Item', picked: true },
      });

      expect(updated.name).toBe('Updated Item');
      expect(updated.picked).toBe(true);
    });

    it('should delete an item', async () => {
      const created = await testPrisma.item.create({
        data: {
          name: 'Delete Test Item',
          sort: 3,
          list: 'Test List',
        },
      });

      await testPrisma.item.delete({
        where: { id: created.id },
      });

      const item = await testPrisma.item.findUnique({
        where: { id: created.id },
      });

      expect(item).toBeNull();
    });

    it('should enforce unique name constraint', async () => {
      await testPrisma.item.create({
        data: {
          name: 'Unique Test Item',
          sort: 4,
          list: 'Test List',
        },
      });

      await expect(
        testPrisma.item.create({
          data: {
            name: 'Unique Test Item',
            sort: 5,
            list: 'Test List',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Aggregation', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should count items for sort calculation', async () => {
      await testPrisma.item.createMany({
        data: [
          { name: 'Item 1', sort: 0, list: 'List 1' },
          { name: 'Item 2', sort: 1, list: 'List 1' },
          { name: 'Item 3', sort: 2, list: 'List 1' },
        ],
      });

      const count = await testPrisma.item.aggregate({
        _count: { id: true },
      });

      expect(count._count.id).toBe(3);
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should handle multiple updates in a transaction', async () => {
      await testPrisma.item.createMany({
        data: [
          { name: 'Trans Item 1', sort: 0, list: 'List A' },
          { name: 'Trans Item 2', sort: 1, list: 'List A' },
          { name: 'Trans Item 3', sort: 2, list: 'List A' },
        ],
      });

      const items = await testPrisma.item.findMany({
        orderBy: { sort: 'asc' },
      });

      expect(items).toHaveLength(3);

      const updates = items.map((item, index) =>
        testPrisma.item.update({
          where: { id: item.id },
          data: { sort: index * 10 },
        })
      );

      await testPrisma.$transaction(updates);

      const updated = await testPrisma.item.findMany({
        orderBy: { sort: 'asc' },
      });

      expect(updated[0].sort).toBe(0);
      expect(updated[1].sort).toBe(10);
      expect(updated[2].sort).toBe(20);
    });
  });

  describe('Indexes', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should efficiently query items by list and sort', async () => {
      await testPrisma.item.createMany({
        data: [
          { name: 'Index Item 1', sort: 0, list: 'List X' },
          { name: 'Index Item 2', sort: 1, list: 'List X' },
          { name: 'Index Item 3', sort: 0, list: 'List Y' },
        ],
      });

      const items = await testPrisma.item.findMany({
        where: { list: 'List X' },
        orderBy: { sort: 'asc' },
      });

      expect(items).toHaveLength(2);
      expect(items[0].list).toBe('List X');
      expect(items[1].list).toBe('List X');
    });
  });
});

describe('Prisma Skip Model', () => {
  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should create a skip record', async () => {
      const skip = await testPrisma.skip.create({
        data: {
          id: 1,
          last_skipped: 'Test Item',
          count: 5,
        },
      });

      expect(skip.id).toBe(1);
      expect(skip.last_skipped).toBe('Test Item');
      expect(skip.count).toBe(5);
    });

    it('should upsert skip record', async () => {
      await testPrisma.skip.create({
        data: { id: 1, last_skipped: 'Item 1', count: 1 },
      });

      await testPrisma.skip.upsert({
        where: { id: 1 },
        create: { id: 1, last_skipped: 'Item 1', count: 1 },
        update: { last_skipped: 'Item 2', count: 2 },
      });

      const skip = await testPrisma.skip.findUnique({
        where: { id: 1 },
      });

      expect(skip?.last_skipped).toBe('Item 2');
      expect(skip?.count).toBe(2);
    });

    it('should update skip count', async () => {
      await testPrisma.skip.create({
        data: { id: 2, count: 0 },
      });

      const updated = await testPrisma.skip.update({
        where: { id: 2 },
        data: { count: { increment: 1 } },
      });

      expect(updated.count).toBe(1);
    });
  });
});
