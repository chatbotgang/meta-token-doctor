# Meta Token Doctor

Diagnose and fix Meta (Facebook/WhatsApp) webhook subscription issues — client-only SPA.

- [README](README.md)
- [Architecture](docs/spec/architecture.md)
- [Facebook API](docs/spec/facebook-api.md)
- [Components](docs/spec/components.md)

## Rule: Docs First

Update `docs/spec/` **before** changing implementation. Specs are the source of truth.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # vue-tsc + vite build
npm run preview   # Preview production build
```

## Code Conventions

- `<script setup lang="ts">` for all SFCs
- Per-component PrimeVue imports (no global registration)
- `GraphError(message, code, subcode)` for all API errors — see `src/services/facebook.ts`
- `defineProps<T>()` / `defineEmits<T>()` with type-only generics
- Acronyms as words in identifiers: `wabaId` not `wabaID`, `appId` not `appID`

## File Map

> Authoritative directory map with descriptions is in [`docs/spec/architecture.md`](docs/spec/architecture.md). Below is a terse quick-reference.

| Path | Purpose |
|------|---------|
| `src/main.ts` | App entry — Pinia, PrimeVue (Aura), router |
| `src/App.vue` | Root `<RouterView />` |
| `src/router/index.ts` | Hash router, 2 routes, credential guard |
| `src/stores/credentials.ts` | Pinia store — `appId`, `appSecret`, `token`, computed `appToken` |
| `src/services/facebook.ts` | Graph API client — `graphFetch<T>`, `GraphError`, all endpoints |
| `src/types/facebook.ts` | TypeScript interfaces for Graph API responses |
| `src/views/CredentialsView.vue` | Entry — collect credentials |
| `src/views/DiagnosticView.vue` | Dashboard — orchestrates sections |
| `src/components/TokenInfo.vue` | Token debug info display |
| `src/components/AppWebhooks.vue` | App webhook subscriptions table |
| `src/components/WabaSection.vue` | WABA discovery + list |
| `src/components/WabaCard.vue` | Single WABA card with subscribe action |
| `src/components/PageSection.vue` | Facebook Pages subscription table |
| `src/components/FixAllButton.vue` | Batch subscribe all missing |
| `.github/workflows/deploy.yml` | GitHub Pages deploy (Node 22) |

## Common Tasks

### Add a new API endpoint

1. Add response type to `src/types/facebook.ts`
2. Add function to `src/services/facebook.ts` using `graphFetch<T>`
3. Update `docs/spec/facebook-api.md` endpoint table

### Add a new component

1. Create `src/components/YourComponent.vue` with `<script setup lang="ts">`
2. Import PrimeVue components per-component
3. Wire into parent view
4. Update `docs/spec/components.md`

### Update API version

1. Change `API_BASE` in `src/services/facebook.ts`
2. Update `docs/spec/facebook-api.md`

## Gotchas

- **App token format** is `{appId}|{appSecret}` (pipe-separated), computed in credentials store
- **Page tokens** come from `/me/accounts` response, not user input — used for page-level subscriptions
- **`onBeforeUnmount` guard** in `WabaCard` and `PageSection` — any async-emitting child component MUST set `active = false` in `onBeforeUnmount` and check `active` before emitting, to prevent double-registration when `refreshKey` forces a remount
- **Token validity not enforced** — the tool does not block Subscribe actions when `is_valid` is false; API calls will fail with error 190. Users should verify token validity in the TokenInfo section first
- **Hash router** is required for GitHub Pages — no server-side routing support
