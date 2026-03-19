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
          name: `New Item ${Date.now()}`,
          person: 'Test Person',
          list: 'Test List',
          sort: 0,
        },
      });

      expect(item.name).toContain('New Item');
      expect(item.picked).toBe(false);
    });

    it('should upsert an item (addItem handler logic)', async () => {
      const uniqueName = `Existing Item ${Date.now()}`;
      await testPrisma.item.create({
        data: { name: uniqueName, sort: 0, list: 'Old List', picked: true },
      });

      await testPrisma.item.upsert({
        where: { name: uniqueName },
        create: { name: uniqueName, person: 'New Person', list: 'New List', sort: 1 },
        update: { person: 'New Person', list: 'New List', picked: false },
      });

      const items = await testPrisma.item.findMany({
        where: { name: uniqueName },
      });

      expect(items).toHaveLength(1);
      expect(items[0].list).toBe('New List');
      expect(items[0].picked).toBe(false);
    });

    it('should update an item (editItem handler logic)', async () => {
      const item = await testPrisma.item.create({
        data: { name: `Edit Test Item ${Date.now()}`, sort: 0, list: 'Original List' },
      });

      const updated = await testPrisma.item.update({
        where: { id: item.id },
        data: { name: 'Edited Name', list: 'New List' },
      });

      expect(updated.name).toBe('Edited Name');
      expect(updated.list).toBe('New List');
    });

    it('should toggle picked status (check handler logic)', async () => {
      const timestamp = Date.now();
      const item = await testPrisma.item.create({
        data: { name: `Check Test Item ${timestamp}`, sort: 0, list: 'Test List', picked: false },
      });

      const found = await testPrisma.item.findUnique({ where: { id: item.id } });
      expect(found).not.toBeNull();

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
        data: { name: `Delete Test Item ${Date.now()}`, sort: 0, list: 'Test List' },
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

  describe('AddItem operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should calculate sort per-list, not globally', async () => {
      const timestamp = Date.now();

      // Create items in List A (5 items)
      await testPrisma.item.createMany({
        data: [
          { name: `ListA Item 1 ${timestamp}`, sort: 0, list: 'List A' },
          { name: `ListA Item 2 ${timestamp}`, sort: 1, list: 'List A' },
          { name: `ListA Item 3 ${timestamp}`, sort: 2, list: 'List A' },
          { name: `ListA Item 4 ${timestamp}`, sort: 3, list: 'List A' },
          { name: `ListA Item 5 ${timestamp}`, sort: 4, list: 'List A' },
        ],
      });

      // Create items in List B (3 items)
      await testPrisma.item.createMany({
        data: [
          { name: `ListB Item 1 ${timestamp}`, sort: 0, list: 'List B' },
          { name: `ListB Item 2 ${timestamp}`, sort: 1, list: 'List B' },
          { name: `ListB Item 3 ${timestamp}`, sort: 2, list: 'List B' },
        ],
      });

      // Simulate addItem logic: calculate next sort per-list
      const maxSortListA = await testPrisma.item.aggregate({
        where: { list: 'List A' },
        _max: { sort: true },
      });
      const nextSortListA = (maxSortListA._max.sort ?? -1) + 1;

      const maxSortListB = await testPrisma.item.aggregate({
        where: { list: 'List B' },
        _max: { sort: true },
      });
      const nextSortListB = (maxSortListB._max.sort ?? -1) + 1;

      // List A should get sort 5 (max was 4)
      expect(nextSortListA).toBe(5);

      // List B should get sort 3 (max was 2), NOT 8
      expect(nextSortListB).toBe(3);
    });

    it('should append new items to the end of their list', async () => {
      const timestamp = Date.now();

      // Create 3 items in List X
      await testPrisma.item.createMany({
        data: [
          { name: `X Item 1 ${timestamp}`, sort: 0, list: 'List X' },
          { name: `X Item 2 ${timestamp}`, sort: 1, list: 'List X' },
          { name: `X Item 3 ${timestamp}`, sort: 2, list: 'List X' },
        ],
      });

      // Create 2 items in List Y
      await testPrisma.item.createMany({
        data: [
          { name: `Y Item 1 ${timestamp}`, sort: 0, list: 'List Y' },
          { name: `Y Item 2 ${timestamp}`, sort: 1, list: 'List Y' },
        ],
      });

      // Add new item to List X
      const maxSort = await testPrisma.item.aggregate({
        where: { list: 'List X' },
        _max: { sort: true },
      });
      const newItem = await testPrisma.item.create({
        data: {
          name: `X Item 4 ${timestamp}`,
          list: 'List X',
          sort: (maxSort._max.sort ?? -1) + 1,
        },
      });

      expect(newItem.sort).toBe(3);

      // Verify all List X items are ordered correctly
      const listXItems = await testPrisma.item.findMany({
        where: { list: 'List X' },
        orderBy: { sort: 'asc' },
      });

      expect(listXItems).toHaveLength(4);
      expect(listXItems[0].sort).toBe(0);
      expect(listXItems[1].sort).toBe(1);
      expect(listXItems[2].sort).toBe(2);
      expect(listXItems[3].sort).toBe(3);
    });
  });

  describe('Sort operations', () => {
    beforeEach(async () => {
      await testPrisma.item.deleteMany();
      await testPrisma.skip.deleteMany();
    });

    it('should reorder items with transactions', async () => {
      const timestamp = Date.now();
      const item1 = await testPrisma.item.create({
        data: { name: `Sort Item 1 ${timestamp}`, sort: 0, list: 'List A' },
      });
      const item2 = await testPrisma.item.create({
        data: { name: `Sort Item 2 ${timestamp}`, sort: 1, list: 'List A' },
      });
      const item3 = await testPrisma.item.create({
        data: { name: `Sort Item 3 ${timestamp}`, sort: 2, list: 'List A' },
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
      const timestamp = Date.now();
      const item1 = await testPrisma.item.create({
        data: { name: `Undo Item 1 ${timestamp}`, sort: 0, list: 'Test List', picked: false },
      });

      await testPrisma.item.create({
        data: { name: `Undo Item 2 ${timestamp}`, sort: 1, list: 'Test List', picked: true },
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
      const timestamp = Date.now();
      await testPrisma.item.createMany({
        data: [
          { name: `Item 3 ${timestamp}`, sort: 2, list: 'Test' },
          { name: `Item 1 ${timestamp}`, sort: 0, list: 'Test' },
          { name: `Item 2 ${timestamp}`, sort: 1, list: 'Test' },
        ],
      });

      const items = await testPrisma.item.findMany({
        orderBy: { sort: 'asc' },
      });

      expect(items[0].name).toContain('Item 1');
      expect(items[1].name).toContain('Item 2');
      expect(items[2].name).toContain('Item 3');
    });
  });
});
