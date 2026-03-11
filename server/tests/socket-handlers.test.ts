import { testPrisma } from './setup';

describe('Database Operations for Socket Handlers', () => {
  describe('Item CRUD operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should create an item', async () => {
      const item = await testPrisma.item.create({
        data: {
          name: 'New Item',
          person: 'Test Person',
          list: 'Test List',
          sort: 0,
        },
      });

      expect(item.name).toBe('New Item');
      expect(item.picked).toBe(false);
    });

    it('should upsert an item (addItem handler logic)', async () => {
      await testPrisma.item.create({
        data: { name: 'Existing Item', sort: 0, list: 'Old List', picked: true },
      });

      await testPrisma.item.upsert({
        where: { name: 'Existing Item' },
        create: { name: 'Existing Item', person: 'New Person', list: 'New List', sort: 1 },
        update: { person: 'New Person', list: 'New List', picked: false },
      });

      const items = await testPrisma.item.findMany({
        where: { name: 'Existing Item' },
      });

      expect(items).toHaveLength(1);
      expect(items[0].list).toBe('New List');
      expect(items[0].picked).toBe(false);
    });

    it('should update an item (editItem handler logic)', async () => {
      const item = await testPrisma.item.create({
        data: { name: 'Edit Test Item', sort: 0, list: 'Original List' },
      });

      const updated = await testPrisma.item.update({
        where: { id: item.id },
        data: { name: 'Edited Name', list: 'New List' },
      });

      expect(updated.name).toBe('Edited Name');
      expect(updated.list).toBe('New List');
    });

    it('should toggle picked status (check handler logic)', async () => {
      const item = await testPrisma.item.create({
        data: { name: 'Check Test Item', sort: 0, list: 'Test List', picked: false },
      });

      await testPrisma.item.update({
        where: { id: item.id },
        data: { picked: true },
      });

      const checked = await testPrisma.item.findUnique({
        where: { id: item.id },
      });

      expect(checked?.picked).toBe(true);
    });

    it('should reset skip on check', async () => {
      await testPrisma.skip.create({
        data: { id: 1, last_skipped: 'Test', count: 5 },
      });

      await testPrisma.skip.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: { last_skipped: '', count: 0 },
      });

      const skip = await testPrisma.skip.findUnique({ where: { id: 1 } });

      expect(skip?.count).toBe(0);
    });

    it('should delete an item', async () => {
      const item = await testPrisma.item.create({
        data: { name: 'Delete Test Item', sort: 0, list: 'Test List' },
      });

      await testPrisma.item.delete({
        where: { id: item.id },
      });

      const deleted = await testPrisma.item.findUnique({
        where: { id: item.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Sort operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should reorder items with transactions', async () => {
      const item1 = await testPrisma.item.create({
        data: { name: 'Sort Item 1', sort: 0, list: 'List A' },
      });
      const item2 = await testPrisma.item.create({
        data: { name: 'Sort Item 2', sort: 1, list: 'List A' },
      });
      const item3 = await testPrisma.item.create({
        data: { name: 'Sort Item 3', sort: 2, list: 'List A' },
      });

      const items = await testPrisma.item.findMany({
        orderBy: { sort: 'asc' },
      });

      const newOrder = [items[2], items[0], items[1]];

      const updates = newOrder.map((item, index) =>
        testPrisma.item.update({
          where: { id: item.id },
          data: { sort: index },
        })
      );

      await testPrisma.$transaction(updates);

      const sorted = await testPrisma.item.findMany({
        orderBy: { sort: 'asc' },
      });

      expect(sorted).toHaveLength(3);
      expect(sorted[0].id).toBe(item3.id);
      expect(sorted[1].id).toBe(item1.id);
      expect(sorted[2].id).toBe(item2.id);
    });
  });

  describe('Undo operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should toggle last updated item', async () => {
      const item1 = await testPrisma.item.create({
        data: { name: 'Undo Item 1', sort: 0, list: 'Test List', picked: false },
      });

      await testPrisma.item.create({
        data: { name: 'Undo Item 2', sort: 1, list: 'Test List', picked: true },
      });

      await testPrisma.item.update({
        where: { id: item1.id },
        data: { picked: true },
      });

      const updated = await testPrisma.item.findUnique({
        where: { id: item1.id },
      });

      expect(updated?.picked).toBe(true);
    });
  });

  describe('Load operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should load items ordered by sort', async () => {
      await testPrisma.item.createMany({
        data: [
          { name: 'Item 3', sort: 2, list: 'Test' },
          { name: 'Item 1', sort: 0, list: 'Test' },
          { name: 'Item 2', sort: 1, list: 'Test' },
        ],
      });

      const items = await testPrisma.item.findMany({
        orderBy: { sort: 'asc' },
      });

      expect(items[0].name).toBe('Item 1');
      expect(items[1].name).toBe('Item 2');
      expect(items[2].name).toBe('Item 3');
    });
  });
});
