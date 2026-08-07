import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moved the connection URL for Migrate/Studio out of schema.prisma
// (see https://pris.ly/d/prisma7-client-config). PrismaClient itself gets its
// connection via the driver adapter in src/lib/utils/prisma.ts, not from here.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
