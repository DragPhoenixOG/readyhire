import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

function createClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // Serverless instances each hold their own pool; keep it small and let the
    // provider's pooler (e.g. Supabase Supavisor) do the fan-in.
    max: env.DATABASE_POOL_SIZE,
  });
  return new PrismaClient({ adapter });
}

// One client per process (and across hot reloads in development).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client() {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/** Created on first use, so importing this module (e.g. during `next build`) needs no configuration. */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const target = client();
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
