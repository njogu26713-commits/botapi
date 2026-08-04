# FireboxTechs WhatsApp Assistant

An AI-powered WhatsApp bot built with Baileys + OpenAI, supporting commands for chat, media, cybersecurity, programming help, utilities (weather, search, news), and FireboxTechs brand information.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/bot/` — WhatsApp connection & auth (Baileys)
- `artifacts/api-server/src/commands/` — all bot command plugins (general, media, security, programming, firebox, utilities)
- `artifacts/api-server/src/services/` — AI (OpenAI), weather, search/news, translation, scheduler
- `artifacts/api-server/src/database/models/` — MongoDB schemas (User, Message, Conversation, Plugin, Reminder, Settings, AdminUser)
- `lib/db/` — PostgreSQL schema via Drizzle ORM
- `lib/api-zod/` — Zod schemas generated from OpenAPI spec

## Architecture decisions

- **Dual database**: MongoDB (mongoose) for bot state (users, conversations, plugins) + PostgreSQL (Drizzle) for structured data. MongoDB was chosen for its flexible schema on chat history.
- **Plugin system**: Commands are grouped into `PluginManifest` objects. The `pluginRegistry` in `plugins/loader.ts` manages registration and can enable/disable plugins via MongoDB at runtime.
- **Command prefix**: All bot commands use `!` prefix (e.g. `!ai`, `!weather`, `!code`). Defined in `commands/registry.ts`.
- **Build step**: esbuild bundles the TypeScript server to `dist/index.mjs` before running — source maps enabled for debugging.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
