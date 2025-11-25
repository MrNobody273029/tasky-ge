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

  const adminPasswordHash = await hashPassword(ADMIN_PASSWORD);

  // TS-ს არ ვაძლევთ უფლებას, გაგვიჩხუბოს `isAdmin` ველზე
  const adminUpdate: any = {
    passwordHash: adminPasswordHash,
    isAdmin: true,
    name: 'Tasky Admin',
  };

  const adminCreate: any = {
    email: ADMIN_EMAIL,
    passwordHash: adminPasswordHash,
    name: 'Tasky Admin',
    isAdmin: true,
  };

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: adminUpdate,
    create: adminCreate,
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
