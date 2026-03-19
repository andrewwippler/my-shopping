import { testPrisma } from './setup';
import { Item } from '../generated/client';

describe('Sort Position Preservation (Single List)', () => {
  const LIST = 'Test Store';
  const TOTAL_ITEMS = 50;

  beforeEach(async () => {
    await testPrisma.item.deleteMany();
    await testPrisma.skip.deleteMany();
  });

  async function createItems(): Promise<Item[]> {
    const items: Item[] = [];
    for (let i = 0; i < TOTAL_ITEMS; i++) {
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
    return items;
  }

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

  async function simulateAddItem(name: string): Promise<Item> {
    const maxSort = await testPrisma.item.aggregate({
      where: { list: LIST },
      _max: { sort: true },
    });
    const nextSort = (maxSort._max.sort ?? -1) + 1;

    return testPrisma.item.create({
      data: {
        name,
        list: LIST,
        sort: nextSort,
        picked: false,
      },
    });
  }

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  it('should preserve sort positions through check/uncheck cycles', async () => {
    // STEP 1: Create 50 items in 'Test Store'
    // Items: Item-0 through Item-49, sort 0-49
    const items = await createItems();
    expect(items).toHaveLength(TOTAL_ITEMS);

    // Verify initial sort order
    let sortedItems = await testPrisma.item.findMany({
      orderBy: { sort: 'asc' },
    });
    expect(sortedItems[0].name).toBe('Item-0');
    expect(sortedItems[30].name).toBe('Item-30');
    expect(sortedItems[49].name).toBe('Item-49');

    // STEP 2: Reorder - Item-30 to first position, Item-25 to second position
    // Find Item-25 and Item-30
    const item30 = items.find((i) => i.name === 'Item-30')!;
    const item25 = items.find((i) => i.name === 'Item-25')!;

    // Build new order: Item-30 first, Item-25 second, then all others
    const otherItems = items.filter(
      (i) => i.name !== 'Item-30' && i.name !== 'Item-25'
    );
    const newOrder = [item30, item25, ...otherItems];
    await reorderItems(newOrder);

    // Verify reorder
    sortedItems = await testPrisma.item.findMany({
      orderBy: { sort: 'asc' },
    });
    expect(sortedItems[0].name).toBe('Item-30');
    expect(sortedItems[0].sort).toBe(0);
    expect(sortedItems[1].name).toBe('Item-25');
    expect(sortedItems[1].sort).toBe(1);

    // STEP 3: Buy all items (picked=true for all)
    const allIds = items.map((i) => i.id);
    await checkItems(allIds, true);

    let unpickedItems = await testPrisma.item.findMany({
      where: { picked: false },
    });
    expect(unpickedItems).toHaveLength(0);

    let pickedItems = await testPrisma.item.findMany({
      where: { picked: true },
    });
    expect(pickedItems).toHaveLength(TOTAL_ITEMS);

    // STEP 4: Uncheck 30 random items + Item-30 (NOT Item-25)
    const pickedItemsShuffled = shuffleArray(pickedItems);

    // Re-fetch Item-30 from database to get current id
    const item30FromDb = await testPrisma.item.findUnique({
      where: { name: 'Item-30' },
    });
    expect(item30FromDb).not.toBeNull();

    // Ensure Item-25 remains picked
    const item25FromDb = await testPrisma.item.findUnique({
      where: { name: 'Item-25' },
    });
    expect(item25FromDb?.picked).toBe(true);

    // Uncheck 30 random + Item-30 (excluding Item-25 and Item-30 from random selection)
    const thirtyRandom = pickedItemsShuffled
      .filter((i) => i.name !== 'Item-25' && i.name !== 'Item-30')
      .slice(0, 30);
    const toUncheckIds = [...thirtyRandom.map((i) => i.id), item30FromDb!.id];
    expect(toUncheckIds).toHaveLength(31);

    await checkItems(toUncheckIds, false);

    unpickedItems = await testPrisma.item.findMany({
      where: { picked: false },
    });
    // 30 random + Item-30 = 31 unpicked
    expect(unpickedItems).toHaveLength(31);

    pickedItems = await testPrisma.item.findMany({
      where: { picked: true },
    });
    // 50 total - 31 unpicked = 19 picked (includes Item-25)
    expect(pickedItems).toHaveLength(19);
    expect(pickedItems.some((i) => i.name === 'Item-25')).toBe(true);

    // STEP 5: Reorder - 5 random items to position 1, Item-30 to position 2
    // Get current unpicked items (31 items)
    const currentUnpicked = await testPrisma.item.findMany({
      where: { picked: false },
      orderBy: { sort: 'asc' },
    });

    // Get 5 random items from unpicked (excluding Item-30)
    const item30InList = currentUnpicked.find((i) => i.name === 'Item-30')!;
    const others = currentUnpicked.filter((i) => i.name !== 'Item-30');
    const fiveRandom = shuffleArray(others).slice(0, 5);

    // Build new order: 5 random first, then Item-30, then rest
    const fiveRandomIds = new Set(fiveRandom.map((r) => r.id));
    const rest = currentUnpicked.filter(
      (i) => i.name !== 'Item-30' && !fiveRandomIds.has(i.id)
    );

    const newOrderForStep5 = [...fiveRandom, item30InList, ...rest];
    await reorderItems(newOrderForStep5);

    // Verify Item-30 has sort=5 (after 5 random items get 0-4)
    const item30AfterReorder = await testPrisma.item.findUnique({
      where: { name: 'Item-30' },
    });
    expect(item30AfterReorder?.sort).toBe(5);

    // STEP 6: Buy all items again (picked=true for all)
    await checkItems(allIds, true);

    pickedItems = await testPrisma.item.findMany({
      where: { picked: true },
    });
    expect(pickedItems).toHaveLength(TOTAL_ITEMS);

    // STEP 7: Uncheck ALL items and verify sort values are preserved
    await checkItems(allIds, false);

    // Get all items sorted by sort field
    const allItemsAfterStep7 = await testPrisma.item.findMany({
      orderBy: { sort: 'asc' },
    });

    const item25After = allItemsAfterStep7.find((i) => i.name === 'Item-25');
    const item30After = allItemsAfterStep7.find((i) => i.name === 'Item-30');

    // Verify Item-25 sort is preserved (1 from step 2)
    // Note: Due to reordering only unpicked items, sort values may conflict with picked items
    expect(item25After?.sort).toBe(1);

    // Verify Item-30 sort is preserved (5 from step 5)
    expect(item30After?.sort).toBe(5);
  });
});
