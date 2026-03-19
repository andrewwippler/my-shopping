import { testPrisma } from './setup';
import { Item } from '../generated/client';

describe('Uncheck returns items to original position', () => {
  const LIST = 'Test Store';

  beforeEach(async () => {
    await testPrisma.item.deleteMany();
    await testPrisma.skip.deleteMany();
  });

  async function reorderItems(newOrder: Item[]): Promise<void> {
    const updates = newOrder.map((item, index) =>
      testPrisma.item.update({
        where: { id: item.id },
        data: { sort: index },
      })
    );
    await testPrisma.$transaction(updates);
  }

  async function checkItems(ids: string[], picked: boolean): Promise<void> {
    const updates = ids.map((id) =>
      testPrisma.item.update({
        where: { id },
        data: { picked },
      })
    );
    await testPrisma.$transaction(updates);
  }

  it('should return unchecked items to their original sorted position', async () => {
    // STEP 1: Create 10 items (Item-0 through Item-9)
    const items: Item[] = [];
    for (let i = 0; i < 10; i++) {
      const item = await testPrisma.item.create({
        data: {
          name: `Item-${i}`,
          list: LIST,
          sort: i,
          picked: false,
        },
      });
      items.push(item);
    }

    // Verify initial order
    let sortedItems = await testPrisma.item.findMany({
      orderBy: { sort: 'asc' },
    });
    expect(sortedItems.map(i => i.name)).toEqual([
      'Item-0', 'Item-1', 'Item-2', 'Item-3', 'Item-4',
      'Item-5', 'Item-6', 'Item-7', 'Item-8', 'Item-9'
    ]);

    // STEP 2: Check all items (purchased)
    const allIds = items.map(i => i.id);
    await checkItems(allIds, true);

    let purchasedItems = await testPrisma.item.findMany({
      where: { picked: true },
      orderBy: { sort: 'asc' },
    });
    expect(purchasedItems).toHaveLength(10);

    // STEP 3: Uncheck items 1, 3, 4, 5, 7, 9
    // These correspond to Item-1, Item-3, Item-4, Item-5, Item-7, Item-9
    const toUncheck = ['Item-1', 'Item-3', 'Item-4', 'Item-5', 'Item-7', 'Item-9'];
    const toUncheckIds = items
      .filter(i => toUncheck.includes(i.name))
      .map(i => i.id);

    await checkItems(toUncheckIds, false);

    // STEP 4: Verify positions
    // After unchecking 1, 3, 4, 5, 7, 9:
    // - Picked: Item-0, Item-2, Item-6, Item-8
    // - Unpicked: Item-1, Item-3, Item-4, Item-5, Item-7, Item-9
    const unpickedItems = await testPrisma.item.findMany({
      where: { picked: false },
      orderBy: { sort: 'asc' },
    });

    expect(unpickedItems).toHaveLength(6);

    // Item-9 should be last in unpicked (position 6, 0-indexed: 5)
    // Unpicked sorted by sort: Item-1(sort 1), Item-3(sort 3), Item-4(sort 4),
    //                           Item-5(sort 5), Item-7(sort 7), Item-9(sort 9)
    expect(unpickedItems[5].name).toBe('Item-9');
    expect(unpickedItems[5].sort).toBe(9);

    // Get all items sorted by sort
    const allItemsSorted = await testPrisma.item.findMany({
      orderBy: { sort: 'asc' },
    });

    // Item-9 should be at position 9 (index 9) in the global sorted list
    expect(allItemsSorted[9].name).toBe('Item-9');
    expect(allItemsSorted[9].sort).toBe(9);

    // Verify all positions are correct
    const expectedSorts = [
      { name: 'Item-0', picked: true, sort: 0 },
      { name: 'Item-1', picked: false, sort: 1 },
      { name: 'Item-2', picked: true, sort: 2 },
      { name: 'Item-3', picked: false, sort: 3 },
      { name: 'Item-4', picked: false, sort: 4 },
      { name: 'Item-5', picked: false, sort: 5 },
      { name: 'Item-6', picked: true, sort: 6 },
      { name: 'Item-7', picked: false, sort: 7 },
      { name: 'Item-8', picked: true, sort: 8 },
      { name: 'Item-9', picked: false, sort: 9 },
    ];

    for (let i = 0; i < expectedSorts.length; i++) {
      expect(allItemsSorted[i].name).toBe(expectedSorts[i].name);
      expect(allItemsSorted[i].sort).toBe(expectedSorts[i].sort);
      expect(allItemsSorted[i].picked).toBe(expectedSorts[i].picked);
    }

    // Verify Item-9 is at position 6 in the unpicked list (0-indexed: 5)
    expect(unpickedItems.findIndex(i => i.name === 'Item-9')).toBe(5);
  });

  it('should handle unchecking single item back to correct position', async () => {
    // Create 5 items: Item-0 through Item-4 with sort 0-4
    const items: Item[] = [];
    for (let i = 0; i < 5; i++) {
      const item = await testPrisma.item.create({
        data: {
          name: `Item-${i}`,
          list: LIST,
          sort: i,
          picked: false,
        },
      });
      items.push(item);
    }

    // Check all items (all become picked)
    await checkItems(items.map(i => i.id), true);

    // Uncheck only Item-2
    const item2 = items.find(i => i.name === 'Item-2')!;
    await checkItems([item2.id], false);

    // Item-2 should still have sort=2 (original position preserved)
    const item2After = await testPrisma.item.findUnique({
      where: { id: item2.id },
    });
    expect(item2After?.sort).toBe(2);
    expect(item2After?.picked).toBe(false);

    // Only 1 unpicked item, so it's at index 0
    const unpicked = await testPrisma.item.findMany({
      where: { picked: false },
      orderBy: { sort: 'asc' },
    });
    expect(unpicked).toHaveLength(1);
    expect(unpicked[0].name).toBe('Item-2');
    expect(unpicked[0].sort).toBe(2);
  });
});
