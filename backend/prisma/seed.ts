/**
 * User seeding script — run this to add users and sample data to the database.
 *
 * Usage:
 *   npx ts-node prisma/seed.ts
 *
 * Or add to package.json scripts:
 *   "prisma:seed": "ts-node prisma/seed.ts"
 *
 * ⚠️  Change the passwords below before running in production!
 *     Passwords must be plain-text here — they will be hashed automatically.
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  name: string;
  role: Role;
  password: string;
}

// ─── Add your users here ─────────────────────────────────────────────────────
const users: SeedUser[] = [
  {
    email: 'admin@aygfoods.com',
    name: 'Admin User',
    role: 'ADMIN',
    password: 'ChangeMe123!',
  },
];
// ─────────────────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Seed Admin User ────────────────────────────────────────────────────────
  console.log('👥 Seeding admin user...');
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        isActive: true,
      },
    });

    console.log(`  ✅  ${user.role.padEnd(8)} | ${user.email.padEnd(30)} | ${user.name}`);
  }

  console.log('\n✅ Seeding complete.');
  console.log('\n📋 Summary:');
  console.log(`   • ${users.length} admin user created`);
  console.log('\n⚠️  Remember to change password after first login!\n');
  console.log('🔐 Default admin credentials:');
  console.log('   Email: admin@aygfoods.com | Password: ChangeMe123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
