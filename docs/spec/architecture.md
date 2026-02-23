# Architecture

## Tech Stack

- **Framework:** Vue 3.5 (`<script setup>` SFCs)
- **Language:** TypeScript 5.9
- **Build:** Vite 7
- **State:** Pinia 3
- **UI:** PrimeVue 4 (Aura theme, per-component imports)
- **Router:** vue-router 5 (hash mode)
- **Deploy:** GitHub Actions → GitHub Pages

## Source Directory Map

| File | Purpose |
|------|---------|
| `src/main.ts` | App entry — creates Vue app, registers Pinia / PrimeVue / router |
| `src/App.vue` | Root component — `<RouterView />` only |
| `src/router/index.ts` | Hash router with 2 routes + credential guard |
| `src/stores/credentials.ts` | Pinia store — `appId`, `appSecret`, `token`, computed `appToken` |
| `src/services/facebook.ts` | Graph API client — `graphFetch<T>`, all API functions, `GraphError` |
| `src/types/facebook.ts` | TypeScript interfaces for all Graph API response shapes |
| `src/views/CredentialsView.vue` | Entry page — collect App ID, App Secret, Access Token |
| `src/views/DiagnosticView.vue` | Main dashboard — orchestrates all diagnostic sections |
| `src/components/TokenInfo.vue` | Displays debug_token result (validity, scopes, expiry) |
| `src/components/AppWebhooks.vue` | Shows app-level webhook subscriptions table |
| `src/components/WabaSection.vue` | WABA discovery (from scopes + businesses) + manual add |
| `src/components/WabaCard.vue` | Single WABA: info, subscription status, phone numbers |
| `src/components/PageSection.vue` | Lists Facebook Pages and their subscription status |
| `src/components/FixAllButton.vue` | Batch-subscribes all unsubscribed WABAs and Pages |

## Routing

- **Mode:** Hash (`createWebHashHistory`) — required for GitHub Pages static hosting
- **Routes:** `/` → CredentialsView, `/dashboard` → DiagnosticView
- **Guard:** `beforeEach` redirects to `/` if `credentials.isReady` is false

## State Management

- **Pinia** store (`credentials`) — supports three storage modes:
  - `'none'` — in-memory only (default), nothing written to browser storage
  - `'session'` — persisted to `sessionStorage`, cleared when the tab closes
  - `'local'` — persisted to `localStorage`, survives browser restart
- `appId`, `appSecret`, `token` are plain refs
- `appToken` is a computed: `${appId}|${appSecret}` (Graph API app token format)
- `isReady` is a navigation convenience guard (checks non-empty fields), not a security gate — the first API call (`debugToken`) will surface invalid credentials
- `storageMode` ref tracks the active mode; persisted alongside credentials in the selected storage
- On init: loads `storageMode` from localStorage then sessionStorage, then loads credentials from the active storage
- `saveToStorage()` writes credentials + storageMode to the current storage (called on "Start Diagnosis")
- `setStorageMode(newMode)` performs safe migration: save to new storage first, then clear old storage, then update mode ref. If save fails, old mode is preserved
- `clear()` clears both in-memory refs and the active storage, resets `storageMode` to `'none'`
- All storage access is wrapped in try-catch to handle private browsing restrictions gracefully
- **Storage keys:** `meta-token-doctor:appId`, `meta-token-doctor:appSecret`, `meta-token-doctor:token`, `meta-token-doctor:storageMode`

## Security Model

- **Client-only SPA** — no backend, no server-side token handling
- Credentials stored in **browser memory by default** (Pinia refs); user may opt into `sessionStorage` or `localStorage` persistence
- When `localStorage` is selected, a confirmation dialog warns that credentials persist on disk and that GitHub Pages shares the `chatbotgang.github.io` origin with other repos
- API calls go directly from the browser to `graph.facebook.com` via CORS — no credentials are transmitted to any server other than Meta's Graph API
- In `'none'` mode, credentials are cleared on page refresh. In `'session'`/`'local'` mode, credentials auto-restore on reload, allowing direct navigation to the dashboard
- "Clear all" button clears both in-memory state and the active storage, resetting mode to `'none'`
- **Caveat:** Tokens and the App Secret (as part of the `appId|appSecret` app token) are passed as URL query parameters per Graph API convention. They are visible in the browser DevTools Network tab. Use this tool only on trusted devices and avoid browser profiles with third-party extensions that may log request URLs

## Deployment

- **GitHub Actions** workflow: `.github/workflows/deploy.yml`
- Triggers on push to `main` or manual dispatch
- Builds with Node 22, uploads `dist/` as Pages artifact
- **Base path:** `/meta-token-doctor/` (configured in `vite.config.ts`)
- **Live URL:** `https://chatbotgang.github.io/meta-token-doctor/`
