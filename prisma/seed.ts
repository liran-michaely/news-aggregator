import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.source.upsert({
    where: { id: 'demo-source' },
    update: {},
    create: {
      id: 'demo-source',
      name: 'Demo News',
      url: 'https://example.com',
      rssUrl: 'https://example.com/rss.xml',
      country: 'US',
      language: 'en',
      qualityScore: 0.8,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
