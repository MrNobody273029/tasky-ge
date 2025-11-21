import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: { email: 'owner@example.com', passwordHash: 'demo', name: 'Demo Owner' },
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
      status: 'PUBLISHED'
    },
  });
}

main()
  .then(async () => { console.log('Seed OK'); await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
