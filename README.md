# Pulse

A simplified news aggregator prototype demonstrating core modules: ranking, API routes, and Prisma schema.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and adjust if needed.

### Database & Redis

Use Docker Compose:

```bash
docker-compose up -d db redis
```

Run migrations and seed:

```bash
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

## Development

```bash
npm run dev
```

## Tests

```bash
npm test
```

## Notes

This repository is a minimal scaffold. Many features from the product brief are intentionally left as TODOs.
