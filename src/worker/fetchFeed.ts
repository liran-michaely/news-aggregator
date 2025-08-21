import { Queue } from 'bullmq';
import fetch from 'node-fetch';

const queue = new Queue('fetch-feed', {
  connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
});

export async function enqueueFeed(url: string) {
  await queue.add('fetch', { url });
}

// simple processor
export async function processFeedJob(job: { data: { url: string } }) {
  const res = await fetch(job.data.url);
  const text = await res.text();
  return { length: text.length };
}
