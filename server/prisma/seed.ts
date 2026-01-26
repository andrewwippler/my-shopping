import { faker } from "@faker-js/faker";
import { PrismaPg } from '@prisma/adapter-pg'
import { Item, PrismaClient } from '../generated/client'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

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
      createdAt: undefined,
      updatedAt: undefined
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
