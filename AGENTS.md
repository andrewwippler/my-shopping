# Agent Guidelines for My-Shopping

## Project Overview

This is a monorepo containing a Next.js frontend and an Express server. The app is a collaborative shopping list manager with real-time updates via Socket.io.

- **Frontend**: Next.js 16, React 18, TypeScript, Tailwind CSS 4, Redux Toolkit, NextAuth.js
- **Server**: Express, Socket.io, Prisma ORM, PostgreSQL
- **Database**: PostgreSQL with Prisma 7

---

## Build/Lint/Test Commands

### Frontend (in `frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack on port 3000 |
| `npm run build` | Production build (Next.js) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint (Next.js core-web-vitals config) |

### Server (in `server/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon (port 3001) |
| `npm run start` | Compile TypeScript and run (tsc && node dist/server.js) |

### Database

```bash
# Run Prisma migrations
cd server && npx prisma migrate dev

# Generate Prisma client
cd server && npx prisma generate

# Seed database
cd server && npx prisma db seed
```

### Running Tests (Server)

```bash
# Run all tests
cd server && npm run test

# Run tests in watch mode
cd server && npm run test:watch

# Run tests with coverage
cd server && npm run test:coverage

# Run a single test file
cd server && npx jest tests/prisma.test.ts

# Run a single test
cd server && npx jest tests/prisma.test.ts -t "should create an item"
```

**Note**: Tests require Docker or Podman to be running (`docker compose up -d db` or `podman compose up -d db`) to create the test database automatically.

### First-time test setup

```bash
# Start the database container
podman compose up -d db

# Run migrations on test database
cd server && DATABASE_URL="postgresql://johndoe:prisma@localhost:5432/shopping_test?schema=public" npx prisma migrate deploy
```

---

## Code Style Guidelines

### TypeScript

- **Frontend**: `strict: true` in `tsconfig.json`
- **Server**: Standard TypeScript with decorators enabled
- Always use explicit types for function parameters and return types
- Use `any` sparingly - prefer `unknown` when type is truly unknown

### Naming Conventions

- **Components**: PascalCase (e.g., `ShoppingList.tsx`, `Header.tsx`)
- **Files**: camelCase for utility files (e.g., `socket.ts`, `fetchJson.ts`)
- **Functions**: camelCase, verb-prefixed (e.g., `getServerSession`, `fetchItems`)
- **Constants**: SCREAMING_SNAKE_CASE for env vars, camelCase for others
- **React Components**: File name matches component name
- **Types/Interfaces**: PascalCase (e.g., `ShoppingItem`, `UserSession`)

### Import Style

- **Path aliases**: Use `@/` for frontend src imports (e.g., `import Layout from '@/components/Layout'`)
- **Relative imports**: Use relative paths for sibling/parent imports within same module
- **Order**: External libs → Path aliases → Relative imports (optional, follow existing patterns)
- **No barrel exports** unless explicitly needed

### Formatting

- 2-space indentation
- Trailing commas in multi-line objects/arrays
- Single quotes for strings (except when string contains single quote)
- Semicolons required
- Max line length: 100 characters (soft guideline)

### React/Next.js Patterns

- Use functional components with hooks
- Server components by default in Next.js 16 App Router
- Client components: `'use client'` directive at top of file
- Use Redux Toolkit for complex state, local state (`useState`) for simple UI state
- Use SWR for data fetching with caching
- Environment variables: `NEXT_PUBLIC_*` for client-side, server-only for secrets

### Error Handling

- Always wrap async operations in try/catch
- Log errors with `console.error` on server, use error boundaries in React
- Never expose internal error details to client
- Use proper HTTP status codes in Express routes

### Database/Prisma

- Use Prisma ORM for all database operations
- Run `prisma generate` after schema changes
- Use transactions (`prisma.$transaction`) for multi-step operations
- Prefer type-safe queries over raw SQL

### Socket.io

- Event names: camelCase (e.g., `load`, `addItem`, `check`)
- Always emit `change_data` after mutations so clients refresh

### Git/Commits

- Conventional commits preferred: `feat:`, `fix:`, `refactor:`, `chore:`
- Never commit secrets or `.env` files
- Run `npm run lint` before committing

---

## File Structure

```
my-shopping/
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Next.js pages (App Router)
│   │   ├── lib/          # Utilities (socket, fetch)
│   │   ├── reducers/     # Redux slices
│   │   ├── types/        # TypeScript types
│   │   └── styles/       # Global CSS
│   ├── public/           # Static assets
│   └── package.json
├── server/
│   ├── server.ts         # Main Express + Socket.io server
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── seed.ts       # Database seeder
│   └── package.json
├── docker-compose.yml    # Local dev environment
└── .github/workflows/    # CI/CD
```

---

## Environment Variables

### Frontend (`.env.local`)

```
NEXT_PUBLIC_WS_URL=<server websocket URL>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random secret>
```

### Server (`.env`)

```
DATABASE_URL=postgresql://user:pass@host:5432/db
ORIGIN=http://localhost:3000
PORT=3001
STORES=Store1,Store2,Store3
```

---

## Common Development Tasks

### Adding a new component

1. Create `frontend/src/components/MyComponent.tsx`
2. Use TypeScript with explicit props interface
3. Add to page or import where needed

### Adding a database model

1. Edit `server/prisma/schema.prisma`
2. Run `cd server && npx prisma migrate dev --name add_model`
3. Run `cd server && npx prisma generate`
4. Restart server

### Adding a Socket.io event

1. Add handler in `server/server.ts`
2. Emit `change_data` event after mutation
3. Handle event in `frontend/src/lib/socket.ts` or component
