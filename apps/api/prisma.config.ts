import "./src/load-env.js";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 reads its connection from here rather than from schema.prisma.
 * `url` may be absent: `prisma generate` (CI's checks job) needs no
 * database; migrate and seed fail clearly without one.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
