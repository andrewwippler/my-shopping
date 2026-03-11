import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const testConnectionString = process.env.TEST_DATABASE_URL || 'postgresql://johndoe:prisma@localhost:5432/shopping_test?schema=public';

let adapter: PrismaPg;
let testPrisma: PrismaClient;

try {
  adapter = new PrismaPg({ connectionString: testConnectionString });
  testPrisma = new PrismaClient({ adapter });
} catch (error) {
  console.error('Failed to create Prisma client:', error);
  testPrisma = null as any;
}

export { testPrisma };

beforeAll(async () => {
  if (!testPrisma) {
    throw new Error('Prisma client not initialized - check database connection');
  }
  try {
    await testPrisma.$connect();
  } catch (error) {
    throw new Error(`Cannot connect to test database. Make sure PostgreSQL is running:\n${error}`);
  }
});

afterAll(async () => {
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
});

afterEach(async () => {
  if (!testPrisma) return;
  try {
    await testPrisma.item.deleteMany();
  } catch (e) {
    // Skip if table doesn't exist
  }
  try {
    await testPrisma.skip.deleteMany();
  } catch (e) {
    // Skip if table doesn't exist
  }
});
