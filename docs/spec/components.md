# Components

## Views

### CredentialsView

- **File:** `src/views/CredentialsView.vue`
- **Route:** `/`
- **Purpose:** Entry page — collects App ID, App Secret, and Access Token
- **Behavior:** Trims inputs, writes to credentials store, navigates to `/dashboard`

### DiagnosticView

- **File:** `src/views/DiagnosticView.vue`
- **Route:** `/dashboard`
- **Purpose:** Main orchestrator — loads token info and app subscriptions, renders all diagnostic sections in an Accordion
- **State:** Manages `missingWabas` and `missingPages` arrays aggregated from child emits
- **Actions:** Refresh All (reloads token + subscriptions, increments `refreshKey` to remount sections), Back (clears credentials, navigates to `/`)
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
- **Props:** `tokenData: DebugTokenData | null`
- **Emits:** `missing(wabaId)`, `subscribed(wabaId)`
- **Purpose:** Discovers WABAs (from granular scopes + business traversal), renders a WabaCard per WABA, provides manual WABA ID input

### WabaCard

- **File:** `src/components/WabaCard.vue`
- **Props:** `wabaId: string`
- **Emits:** `missing(wabaId)`, `subscribed(wabaId)`
- **Purpose:** Loads single WABA info, subscription status, and phone numbers. Shows Subscribe button if unsubscribed. Uses `onBeforeUnmount` guard to prevent state updates after unmount.

### PageSection

- **File:** `src/components/PageSection.vue`
- **Props:** none
- **Emits:** `missing(pageId, pageToken)`, `subscribed(pageId)`
- **Purpose:** Loads pages from `/me/accounts`, checks each page's subscription status, shows Subscribe button per page. Only rendered by DiagnosticView when the token has `pages_show_list` or `pages_manage_metadata` scope (guard is `v-if="hasPageScope"` in DiagnosticView, not in PageSection itself). Uses `onBeforeUnmount` guard.
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
  │   ├─ PageSection (if hasPageScope)
  │   │   ├─ emits missing(pageId, pageToken) → DiagnosticView.missingPages
  │   │   └─ emits subscribed(pageId) → removes from missingPages
  │   └─ FixAllButton (if missingWabas or missingPages exist)
  │       └─ emits fixed() → DiagnosticView.refreshAll()
```

## PrimeVue Components Used

Accordion, AccordionPanel, AccordionHeader, AccordionContent, Button, Column, DataTable, InputText, Message, Password, ProgressSpinner, Tag
