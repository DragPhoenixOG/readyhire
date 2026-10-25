import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Falls back to a local SQLite file so the app runs without a .env file.
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
