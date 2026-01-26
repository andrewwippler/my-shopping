import 'dotenv/config'
import { defineConfig, env } from "prisma/config";

// old seed: ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});