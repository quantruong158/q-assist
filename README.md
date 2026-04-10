# Q-Assist

Q-Assist is an Nx monorepo with Angular 21 frontends and Firebase-backed AI features.
It includes a web app, a desktop app (Electron), Firebase Cloud Functions (Genkit flows), and a Bun-based AI runtime service (Vercel AI SDK). It also includes a custom desktop UI client for [OpenCode](https://github.com/anomalyco/opencode).

## What Is Included

- `apps/web-app`: Main Angular web application.
- `apps/desktop-app`: Angular + Electron desktop build targets.
- `apps/functions`: Firebase Cloud Functions (Genkit flows, finance handlers).
- `apps/ai-runtime`: Bun + Hono runtime for AI-focused APIs/services using Vercel AI SDK.
- `libs/*`: Feature/domain libraries for chat, finance, OpenCode, shared UI, auth, and utilities.

## Tech Stack

- Angular 21 + signals
- Nx workspace tooling
- Firebase (Auth, Firestore, Storage, Hosting, Functions)
- Vercel AI SDK + Gemini/OpenRouter/OpenCode provider integrations
- Tailwind CSS v4 + SCSS
- Electron (desktop packaging)
