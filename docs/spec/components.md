# Components

## Views

### CredentialsView

- **File:** `src/views/CredentialsView.vue`
- **Route:** `/`
- **Purpose:** Entry page — collects App ID, App Secret, and Access Token
- **Behavior:**
  - Initializes form fields from credentials store (preserves values on back-navigation)
  - **Storage mode selector** (PrimeVue `SelectButton`): `None` / `Session` / `Local` — controls credential persistence. Uses `:model-value` + `@update:model-value` (not `v-model`) to intercept changes. `:allow-empty="false"` prevents deselecting.
  - Selecting `Local` opens a PrimeVue `Dialog` warning about disk persistence and GitHub Pages shared-origin risk (`chatbotgang.github.io`). Cancel keeps the previous mode.
  - **Dynamic hint text** changes per mode: `'none'` → memory-only message, `'session'` → cleared on tab close, `'local'` → persists until manually cleared
  - On "Start Diagnosis": trims inputs, writes to store, calls `saveToStorage()`, navigates to `/dashboard`
  - "Clear all" button resets form, calls `credentials.clear()` (clears store + active storage + resets mode to `'none'`); disabled when all fields are empty and mode is `'none'`

### DiagnosticView

- **File:** `src/views/DiagnosticView.vue`
- **Route:** `/dashboard`
- **Purpose:** Main orchestrator — loads token info and app subscriptions, renders all diagnostic sections in an Accordion
- **State:** Manages `missingWabas` and `missingPages` arrays aggregated from child emits
- **Cross-check warnings:** Computed `subscribedObjects` (a `Set` of object names from app webhook subscriptions). When subscriptions have loaded without error, shows `<Message severity="warn">` in the relevant AccordionContent if the required object is missing:
  - Pages section: warns if `subscribedObjects` does not contain `'page'` — "No 'page' object found in app webhook subscriptions — messages won't be delivered."
  - WABA section: warns if `subscribedObjects` does not contain `'whatsapp_business_account'` — "No 'whatsapp_business_account' object found in app webhook subscriptions — messages won't be delivered."
  - Guard is `!subsLoading && !subsError` (fires even when app has zero webhooks — the most critical scenario).
- **Actions:** Refresh All (reloads token + subscriptions, increments `refreshKey` to remount sections), Back (navigates to `/`, preserves credentials for re-editing)
- **Note:** `refreshKey` is passed as `:key` to child sections; incrementing it forces Vue to destroy and recreate them, triggering fresh data loads via `onMounted`.

## Components

### TokenInfo

- **File:** `src/components/TokenInfo.vue`
- **Props:** `data: DebugTokenData | null`, `loading: boolean`, `error: string`
- **Emits:** none
- **Purpose:** Displays token validity, type, app name, user ID, timestamps, scopes list, granular scopes table, and raw JSON toggle

### AppWebhooks

- **File:** `src/components/AppWebhooks.vue`
- **Props:** `subscriptions: WebhookSubscription[]`, `loading: boolean`, `error: string`
- **Emits:** none
- **Purpose:** Displays app-level webhook subscriptions grouped by object type (DataTable with row grouping)

### WabaSection

- **File:** `src/components/WabaSection.vue`
- **Props:** `tokenData: DebugTokenData | null`, `tokenLoaded: boolean`
- **Emits:** `missing(wabaId)`, `subscribed(wabaId)`
- **Purpose:** Discovers WABAs (from granular scopes + business traversal), renders a WabaCard per WABA, provides manual WABA ID input. Watches `tokenLoaded` (not `tokenData`) to trigger discovery — ensures business-based discovery runs even when `debug_token` fails.

### WabaCard

- **File:** `src/components/WabaCard.vue`
- **Props:** `wabaId: string`
- **Emits:** `missing(wabaId)`, `subscribed(wabaId)`
- **Purpose:** Loads single WABA info, subscription status, and phone numbers. Shows Subscribe button if unsubscribed. Displays subscribing app name(s) below status tag; fallback "Unknown app" if name missing. Uses `onBeforeUnmount` guard to prevent state updates after unmount.

### PageSection

- **File:** `src/components/PageSection.vue`
- **Props:** `isPageToken: boolean` (default `false`)
- **Emits:** `missing(pageId, pageToken)`, `subscribed(pageId)`
- **Purpose:** Loads pages and checks subscription status via field-level comparison against `PAGE_SUBSCRIBED_FIELDS`, shows Subscribe button per page. Handles two modes based on `isPageToken`:
  - **PAGE token** (`isPageToken === true`): calls `getPageInfo(token)` to get the page's own `{ id, name, category }`, constructs a single `PageWithStatus` using the token itself as `access_token`, then checks subscriptions and IG as normal.
  - **USER/SYSTEM_USER token** (`isPageToken === false`): existing `/me/accounts` flow — loads all pages with their individual page tokens.
- **Visibility:** Rendered by DiagnosticView when `showPageSection` is true — either the token type is `PAGE`, or the token type is `USER`/`SYSTEM_USER` with `pages_show_list` or `pages_manage_metadata` scope (guard is `v-if="showPageSection"` in DiagnosticView, not in PageSection itself). Uses `onBeforeUnmount` guard.
- **Subscription tri-state:** `subscriptionStatus` is `'full'` (green "Subscribed"), `'partial'` (yellow "Partial"), or `'none'` (red "Not Subscribed"). `null` means still loading. Field tags are shown for `'full'` and `'partial'` states (`severity='secondary'` for present, `severity='danger'` for missing); not shown for `'none'`. FB-only fields display with " (FB)" suffix. Subscribe button is shown for all loaded states; disabled when `'full'`. Instagram column appears when any page has a connected IG account (`v-if` on computed). IG data fetched per-page via `getPageIgAccount` in parallel with subscription checks.
- **IG subscription status (stored, tri-state):** `igStatus` and `missingIgFields` are stored in `PageWithStatus` and updated via `updateIgStatus(page)` after subscription + IG data loads (and after `doSubscribe`). Computed from `subscriptionStatus` and `missingFields` using `igFieldsSet` (`Set<string>` of `IG_SUBSCRIBED_FIELDS`). Values: `'full'` (all IG fields present), `'partial'` (some present, some missing), `'none'` (all missing), `null` (no IG or still loading). Shown as Tag below IG username: green "Subscribed" / yellow "Partial" (with `IG_SUBSCRIBED_FIELDS` field tags) / red "Not Subscribed". Tooltip on each state explains coverage.
- **Field platform suffixes:** In partial subscription field tags, FB-only fields (`message_reads`, `standby`) display with " (FB)" suffix to distinguish them from fields shared with Instagram.
- **Emit behavior:** `missing` fires for both `'none'` and `'partial'` status — re-subscribing with correct fields fixes both cases. FixAllButton label says "Missing Subscriptions" which covers partial pages; this is acceptable.
- **Note:** The `missing` emit includes `pageToken` because page tokens come from the `/me/accounts` response and are not stored centrally — the token must travel alongside the page ID for subscription operations.

### FixAllButton

- **File:** `src/components/FixAllButton.vue`
- **Props:** `missingWabas: string[]`, `missingPages: { id: string; token: string }[]`
- **Emits:** `fixed()`
- **Purpose:** Batch-subscribes all unsubscribed WABAs and Pages in parallel. Shows success count and individual failure messages. Only visible when there are missing subscriptions.

## Data Flow

```
CredentialsView
  └─ writes → credentials store → navigates to /dashboard

DiagnosticView
  ├─ loads: debugToken() → tokenData
  ├─ loads: getAppSubscriptions() → subscriptions
  ├─ renders:
  │   ├─ TokenInfo (tokenData, loading, error)
  │   ├─ AppWebhooks (subscriptions, loading, error)
  │   ├─ WabaSection (tokenData)
  │   │   ├─ emits missing(wabaId) → DiagnosticView.missingWabas
  │   │   └─ emits subscribed(wabaId) → removes from missingWabas
  │   ├─ PageSection (if showPageSection, :is-page-token)
  │   │   ├─ emits missing(pageId, pageToken) → DiagnosticView.missingPages
  │   │   └─ emits subscribed(pageId) → removes from missingPages
  │   └─ FixAllButton (if missingWabas or missingPages exist)
  │       └─ emits fixed() → DiagnosticView.refreshAll()
```

## PrimeVue Components Used

Accordion, AccordionPanel, AccordionHeader, AccordionContent, Button, Column, DataTable, InputText, Message, Password, ProgressSpinner, SelectButton, Tag, Tooltip (directive)
