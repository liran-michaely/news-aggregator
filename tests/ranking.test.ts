import { describe, it, expect } from 'vitest';
import { rankArticles } from '../src/ranking';

describe('rankArticles', () => {
  it('ranks newer articles higher', () => {
    const articles = [
      {
        id: '1',
        title: 'Old',
        snippet: '',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        sourceQuality: 0.5,
      },
      {
        id: '2',
        title: 'New',
        snippet: '',
        publishedAt: new Date().toISOString(),
        sourceQuality: 0.5,
      },
    ];
    const ranked = rankArticles(articles);
    expect(ranked[0].id).toBe('2');
    expect(ranked[0].factors.recency).toBeGreaterThan(ranked[1].factors.recency);
  });
});
