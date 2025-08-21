import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rankArticles } from '../../../src/ranking';

const querySchema = z.object({
  q: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parse = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.format() }, { status: 400 });
  }
  // For demo, return static list ranked
  const articles = [
    {
      id: '1',
      title: 'Hello World',
      snippet: 'A demo article',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      sourceQuality: 0.8,
    },
    {
      id: '2',
      title: 'Breaking News',
      snippet: 'Another demo article',
      publishedAt: new Date().toISOString(),
      sourceQuality: 0.9,
    },
  ];
  const ranked = rankArticles(articles, { recencyHalfLifeHours: 9 });
  return NextResponse.json(ranked);
}
