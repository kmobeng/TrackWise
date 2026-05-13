# TrackWise Backend API

TrackWise is a Node.js + TypeScript backend for expense tracking. It provides authentication, budgeting, expense management, AI-assisted summaries, and caching. The API uses PostgreSQL via Prisma and Redis for caching and token/session helpers.

## Features

- Auth with JWT cookies and refresh tokens
- Email verification and password reset flows
- Google OAuth sign-in
- Expense CRUD with monthly, daily, and category summaries
- Budgets with category-level allocations
- AI monthly summaries (Groq)
- Redis caching for monthly summaries, AI summaries, and default categories
- Rate limiting and structured logging

## Tech Stack

- Node.js, Express, TypeScript
- Prisma ORM + PostgreSQL
- Redis (ioredis)
- Passport (Google OAuth)
- Zod validation
- Winston + Morgan logging

## Project Structure

- src/app.ts: Express app wiring and routes
- src/server.ts: App bootstrap
- src/controllers: Request handlers
- src/services: Business logic and data access
- src/routes: Route definitions
- src/middlewares: Auth and rate limiting
- src/utils: Helpers (JWT, email, AI)
- prisma/schema.prisma: Database schema
- prisma/seed.ts: Default category seed

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Install

```bash
npm install
```

### Environment

Create a .env file using .env.example as a base.

### Database

```bash
npx prisma migrate dev
npx prisma generate
```

### Seed Default Categories

```bash
npx ts-node prisma/seed.ts
```

### Run

```bash
npm run dev
```

The server will start on http://localhost:5000 by default.

## Scripts

- npm run dev: Start dev server with ts-node + nodemon
- npm run build: Compile TypeScript to dist
- npm start: Build and run the compiled server

## API Endpoints (v1)

Base path: /api/v1

### Auth

- POST /auth/signup
- POST /auth/login
- POST /auth/refresh
- POST /auth/forgot-password
- POST /auth/reset-password/:token
- GET /auth/google
- GET /auth/google/redirect
- POST /auth/logout
- POST /auth/request-email-verification
- POST /auth/verify-email

### Users

- POST /users/set-password
- GET /users/me
- PATCH /users/me
- DELETE /users/me
- POST /users/verify-email-update
- POST /users/change-password

### Expenses

- POST /expenses
- GET /expenses
- GET /expenses/:expenseId
- PATCH /expenses/:expenseId
- DELETE /expenses/:expenseId
- POST /expenses/auto-categorize
- GET /expenses/summary
- GET /expenses/daily-summary
- GET /expenses/category-summary
- GET /expenses/ai-summary

### Categories

- POST /categories
- GET /categories
- GET /categories/:id
- PATCH /categories/:id
- DELETE /categories/:id

### Budget

- POST /budget
- GET /budget
- DELETE /budget
- POST /budget/category
- DELETE /budget/category/:categoryId

## Environment Variables

See .env.example for the full list and defaults. Current variables used by the app:

- NODE_ENV: development or production
- PORT: HTTP port for the API server
- DATABASE_URL: PostgreSQL connection string
- REDIS_URL: Redis connection string
- COOKIE_KEY: Cookie session encryption key
- JWT_SECRET: JWT signing secret
- JWT_EXPIRES_IN: Access token TTL (e.g. 1h)
- ACCESS_JWT_COOKIE_EXPIRES_IN: Access token cookie TTL in hours
- REFRESH_JWT_COOKIE_EXPIRES_IN: Refresh token cookie TTL in days
- GOOGLE_CLIENT_ID: Google OAuth client ID
- GOOGLE_CLIENT_SECRET: Google OAuth client secret
- GROQ_API_KEY: Groq API key for AI summaries
- EMAIL_FROM: From address for outbound emails

## Notes

- JWTs are stored in httpOnly cookies.
- AI summaries are only available for completed months.
- Default categories are cached and seeded from prisma/seed.ts.
- Email delivery uses a local SMTP server on localhost:1025 (see src/utils/email.util.ts).
