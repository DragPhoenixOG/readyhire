// Build command on Vercel (`npm run vercel-build`, picked up automatically).
// Database migrations run before the build, but only for production deployments,
// so preview builds never change the production schema. Set MIGRATE_ON_BUILD=true
// on a staging project that has its own database to migrate it on every deploy.
import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit" });

run("npx prisma generate");
if (process.env.VERCEL_ENV === "production" || process.env.MIGRATE_ON_BUILD === "true") {
  run("npx prisma migrate deploy");
} else {
  console.log("Skipping database migrations (not a production deployment).");
}
run("npx next build");
