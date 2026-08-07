import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires a driver adapter instead of reading the connection URL
// from schema.prisma (see prisma.config.ts). Neon's adapter connects over
// HTTP/WebSockets, which fits Vercel's serverless functions better than a
// pooled TCP connection.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
