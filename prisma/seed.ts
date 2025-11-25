import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto'; // ✅ დაამატე ეს

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'info@tasky.ge';
const ADMIN_PASSWORD = 'Tasky2025@';

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: { email: 'owner@example.com', passwordHash: 'demo', name: 'Demo Owner' },
  });

  // 🔐 ავაგოთ ჰეში პირდაპირ იმავე ფუნქციით, რასაც login იყენებს
  const adminPasswordHash = await hashPassword(ADMIN_PASSWORD);

  // 🛡️ Admin user
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash: adminPasswordHash,
      isAdmin: true,
      name: 'Tasky Admin',
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      name: 'Tasky Admin',
      isAdmin: true,
    },
  });

  await prisma.task.upsert({
    where: { id: 'demo-task-1' },
    update: {},
    create: {
      id: 'demo-task-1',
      authorId: owner.id,
      locale: 'ka',
      title: 'სათაური — Demo Task',
      desc: 'აღწერა — ეს არის დემო დავალება.',
      category: 'general',
      skill: 'beginner',
      reward: 100,
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      where: 'REMOTE',
      status: 'PUBLISHED',
    },
  });
}

main()
  .then(async () => {
    console.log('Seed OK');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
