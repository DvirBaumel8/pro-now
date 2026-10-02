import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Every PrismaClient in this app is made here. Prisma 7 talks to Postgres
 * through a driver adapter (node-postgres) rather than its own engine.
 */
export function createPrisma(url: string | undefined = process.env.DATABASE_URL): PrismaClient {
  if (!url) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
