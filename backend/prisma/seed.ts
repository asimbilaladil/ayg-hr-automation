/**
 * User seeding script — run this to add users to the database.
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
  {
    email: 'manager@aygfoods.com',
    name: 'HR Manager',
    role: 'MANAGER',
    password: 'ChangeMe123!',
  },
  {
    email: 'hr@aygfoods.com',
    name: 'HR Staff',
    role: 'HR',
    password: 'ChangeMe123!',
  },
];
// ─────────────────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding users...\n');

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        isActive: true,
      },
    });

    console.log(`  ✅  ${user.role.padEnd(8)} | ${user.email}`);
  }

  console.log('\n✅ Seeding complete.');
  console.log('⚠️  Remember to change passwords after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
