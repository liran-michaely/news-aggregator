export interface ArticleInput {
  id: string;
  title: string;
  snippet: string;
  publishedAt: string; // ISO
  sourceQuality: number; // 0..1
}

export interface RankingOptions {
  recencyHalfLifeHours?: number;
  weights?: {
    recency: number;
    sourceQuality: number;
  };
}

export interface RankedArticle extends ArticleInput {
  score: number;
  factors: {
    recency: number;
    sourceQuality: number;
  };
}

function recencyScore(publishedAt: string, halfLifeHours: number) {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const halfLifeMs = halfLifeHours * 60 * 60 * 1000;
  const decay = Math.pow(0.5, ageMs / halfLifeMs);
  return decay;
}

export function rankArticles(
  articles: ArticleInput[],
  opts: RankingOptions = {}
): RankedArticle[] {
  const halfLife = opts.recencyHalfLifeHours ?? 9;
  const weights = opts.weights ?? { recency: 0.7, sourceQuality: 0.3 };
  return articles
    .map((a) => {
      const recency = recencyScore(a.publishedAt, halfLife);
      const score = weights.recency * recency +
        weights.sourceQuality * a.sourceQuality;
      return {
        ...a,
        score,
        factors: { recency, sourceQuality: a.sourceQuality },
      } as RankedArticle;
    })
    .sort((a, b) => b.score - a.score);
}
