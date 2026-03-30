# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack chat application with AI agents: Angular 21 frontend, Bun-based AI runtime server, Firebase backend. AI routing system with Finance and Research specialized agents.

## Commands

```bash
pnpm start           # Serve Angular web-app (uses Nx: nx serve web-app)
pnpm build           # Build Angular web-app for production
pnpm test            # Run Angular tests (nx test web-app)
pnpm lint            # Lint Angular code (nx lint web-app)
pnpm run build:mobile  # Build for Capacitor mobile

# AI Runtime (Bun server)
npx nx serve ai-runtime    # Dev mode with watch
npx nx build ai-runtime    # Production build

# Firebase Functions (Genkit)
npx nx serve functions     # Local functions emulator

# Firebase Emulators
pnpm run firebase:emu:start  # Start all emulators with data persistence

# Mobile
pnpm run cap:sync           # Sync web assets to Capacitor
npx nx cap open android     # Open Android in Android Studio
npx nx cap open ios         # Open iOS in Xcode
```

## Architecture

### AI Runtime (`apps/ai-runtime/`)
Bun-powered Node.js server handling all AI chat. Uses Vercel AI SDK with Firebase auth middleware.

**Request flow:**
1. `app.ts` - Hono app with Firebase bearer token auth middleware
2. `chat-handler.ts` - Orchestrates chat: persistence, agent creation, streaming
3. `agents/main.agent.ts` - ToolLoopAgent that routes to subagents
4. Subagents: `finance.agent.ts`, `research.agent.ts`

**Agents use tools to delegate:**
- `financeSubagent` tool → FinanceAgent (handles transactions, categories, accounts)
- `researchSubagent` tool → ResearchAgent (web search via Tavily)

**Key files:**
- `runtime/providers/index.ts` - Model resolution (supports multiple AI providers)
- `runtime/chat-persistence.ts` - Firebase Firestore message storage
- `runtime/tools/` - Finance and web search tool implementations

### Firebase Functions (`apps/functions/`)
Legacy Genkit-based functions. Kept for compatibility but AI logic migrated to `ai-runtime`.

### Web App (`apps/web-app/`)
Angular 21 application with signals-based state management.

**Routing:**
- `/login`, `/register` - Public auth routes
- `/chat/:id` - Chat interface (lazy loaded)
- `/finance` - Finance dashboard (lazy loaded)
- Default redirect to `/chat`

**Auth:** Firebase Auth with AngularFire. Guards in `libs/shared/auth/util`.

### Shared Libraries (`libs/`)

| Library | Purpose |
|---------|---------|
| `chat/data-access` | Conversation service, upload service |
| `chat/shared-models` | Conversation types |
| `finance/data-access` | Finance data operations |
| `finance/ui` | Transaction forms, lists |
| `shared/auth/` | Firebase auth service, guards, login/register components |

## AI Runtime Configuration

Environment variables loaded by `runtime/config.ts`:
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Firebase Admin
- `AI_RUNTIME_SERVER_HOST`, `AI_RUNTIME_SERVER_PORT` - Server binding
- `AI_RUNTIME_CORS_ORIGIN` - Allowed CORS origins
- Model providers: `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`

## Key Patterns

**Chat streaming:** SSE via `runtime/sse.ts`, consumed by frontend via `@ai-sdk/svelte`
**Message retry:** `isRetry` flag deletes last assistant message before regenerating
**Agent delegation:** Main agent uses `tool()` from AI SDK to call subagents, each with own model context
