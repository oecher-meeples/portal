import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 has no Rust query engine anymore: PrismaClient refuses to start
// without a driver adapter (the URL in prisma.config.ts is only for
// Migrate/Studio). `@prisma/adapter-pg` is the plain TCP Postgres driver
// (node-postgres), so any standard `postgresql://` DATABASE_URL works —
// e.g. the self-hosted postgres:16 container from docker-compose.yml.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
