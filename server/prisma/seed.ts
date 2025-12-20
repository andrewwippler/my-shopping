import { PrismaClient } from '@prisma/client'
import { faker } from "@faker-js/faker";
const prisma = new PrismaClient()
type Item = {
  id: string
  name: string
  picked: boolean
  person: string
  sort: number
  list: string
}

async function main() {
  await prisma.item.deleteMany({}); // use with caution.

  const amountOfProducts = 50;

  const items: Item[] = [];

  for (let i = 0; i < amountOfProducts; i++) {
    const item: Item = {
      id: `${i}`,
      name: faker.commerce.product(),
      picked: !(i % 3 === 0),
      person: faker.string.uuid(),
      sort: i,
      list: faker.helpers.arrayElement(["S-Market", "Lidl", "Prisma/Other"]),
    };

    items.push(item);
  }

  const addItems = async () => await prisma.item.createMany({ data: items });

  addItems();
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
