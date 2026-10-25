import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. On Supabase, DATABASE_URL is the pooler
    // and DIRECT_URL the direct connection; locally both can be the same.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
    // Only needed for `npm run db:check` (CI verifies migrations match the schema).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
