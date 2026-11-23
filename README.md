# TaskManager

A task management app built with Next.js 15 App Router, React, TypeScript, and tRPC. CRUD data is stored in a `Map` inside the Node.js process; the app has no database and no parallel REST API.

## Requirements and setup

- Node.js 20.9 or later (validated with Node.js 24.22.0)
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To run the production build:

```bash
npm run build
npm run start
```

Run a single persistent Node.js process so SSR and tRPC requests use the same in-memory store.

## How it works

1. The `/tarefas` route is a dynamic Node.js Server Component. It calls the tRPC caller directly to fetch the first page and passes it to the client component as initial data, already present in the rendered HTML.
2. The tRPC router forwards operations to `TaskService`, which applies business rules. UUIDs and ISO UTC `dataCriacao` timestamps are generated on the server.
3. `TaskService` uses `InMemoryTaskRepository`, which stores tasks in a `Map`. The tRPC router calls the service, and React components never access the store directly.
4. On the client, TanStack Query with the tRPC integration refreshes the list after task creation, editing, and deletion. Zod defines the input contracts and validation; blank titles are rejected and missing tasks return `NOT_FOUND`.
5. The list initially loads 8 tasks and fetches older ones near the end of the page using a stable cursor based on date and ID. A loading indicator and skeletons stay visible for at least 720 ms before the next page appears; new cards enter with an animation. **Load more** is available if `IntersectionObserver` is unavailable or a request fails.

## Challenge requirements checklist

### Project setup

- [x] Next.js 15.x with App Router, React, and TypeScript.
- [x] tRPC configured for the frontend to consume server procedures.

### Backend (tRPC)

- [x] Task model with UUID `id`, required `titulo`, optional `descricao`, and ISO 8601 UTC `dataCriacao`.
- [x] `task.create`, `task.list`, `task.update`, and `task.delete` operations; `task.getById` is also available.
- [x] Server validation rejects blank or whitespace-only titles and normalizes input with `trim()`.
- [x] Meaningful errors: `BAD_REQUEST` for invalid input, `NOT_FOUND` for missing tasks, and sanitized internal errors.
- [x] Data is stored only in the Node.js process memory; no database is used.

### Frontend (React/Next.js)

- [x] The initial task list is server-rendered (SSR) and passed to the client as initial data.
- [x] Tasks appear in a list with edit and delete actions.
- [x] Create and edit forms use functional components, hooks, and title validation.
- [x] Deletion requires confirmation and displays success or error feedback.
- [x] Loading, success, and error states are handled in the list, forms, and operations.

### Extras

- [x] Cursor-based Infinite Scroll automatically loads older tasks as the user scrolls; a fallback button is available.
- [x] Pagination displays visible loading feedback, followed by an entry animation for newly loaded cards.
- [x] Code comments explain key decisions; this README describes the architecture, setup, and tests.
- [x] Unit and integration tests cover CRUD, validation, and errors; E2E tests cover SSR, CRUD flows, and Infinite Scroll.

## Data and pagination

Each task has an `id`, `titulo`, optional `descricao`, and `dataCriacao`. Titles must contain 1 to 120 characters after `trim()`; descriptions are optional and may contain up to 2,000 characters. The store starts empty and is cleared when the process restarts. Memory is not shared across processes, workers, replicas, or serverless instances.

The `task.listPaginated` procedure defaults to 20 items when the client does not specify `limit` and accepts values from 1 to 100. The UI requests batches of 8 to make progressive loading visible with smaller lists.

tRPC procedures are served at `/api/trpc`:

- `task.create`
- `task.list`
- `task.listPaginated`
- `task.getById`
- `task.update`
- `task.delete`

## Validation scripts

```bash
npm run lint       # ESLint/Next.js
npm run typecheck  # Strict TypeScript check
npm run test       # Vitest: validation and tRPC integration
npm run test:e2e   # Playwright: SSR, CRUD, responsive layout, and Infinite Scroll
```

To run the E2E suite against a production server, start the server in one terminal and point the suite to it:

```bash
npm run start -- --hostname 127.0.0.1 --port 3100
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e
```

## Code organization

- `src/app/`: Next.js routes, layout, and the tRPC HTTP handler.
- `src/components/`: UI components and list interactions.
- `src/schemas/` and `src/types/`: input contracts and shared types.
- `src/server/trpc/`: router, context, and caller used by SSR.
- `src/server/tasks/`: in-memory service and repository.

The repository is stored in `globalThis` to preserve the same instance during hot reload in one process. This does not coordinate separate processes; this delivery supports a single persistent Node.js process.

## Interface

The UI is built from React components (`AppHeader`, `TaskList`, `TaskCard`, `EmptyState`, `TaskDialog`, `TaskForm`, and `DeleteTaskDialog`) and uses centralized CSS tokens. Displayed data comes from the in-memory tRPC service; the application does not use permanent fixtures.
