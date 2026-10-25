// Creates the first admin account in any environment (including production).
//   npm run create-admin -- --email you@readyhire.in --name "Your Name"
// The password comes from ADMIN_PASSWORD, or a strong one is generated and printed once.
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createScriptClient } from "./support";

async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
    console.error('Usage: npm run create-admin -- --email you@example.com --name "Your Name"');
    process.exit(1);
  }

  const db = createScriptClient();
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      console.error(`An account already exists for ${email} (role ${existing.role}). Nothing changed.`);
      process.exit(1);
    }
    const password = process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

    const now = new Date();
    const admin = await db.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
        termsAcceptedAt: now,
        emailVerifiedAt: now,
      },
    });
    await db.auditLog.create({
      data: { actorId: null, action: "ADMIN_CREATED", entityType: "User", entityId: admin.id, summary: `${email} via create-admin` },
    });
    console.log(`Created admin ${email}.`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Temporary password (shown once): ${password}\nSign in and change it from Account settings.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
