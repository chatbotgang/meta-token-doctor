# Facebook Graph API Integration

All API logic lives in `src/services/facebook.ts`. Types are in `src/types/facebook.ts`.

## Base URL

```
API_BASE = https://graph.facebook.com/v21.0
```

Defined as `API_BASE` in `src/services/facebook.ts` — keep this doc in sync when updating. Meta [deprecates API versions](https://developers.facebook.com/docs/graph-api/changelog/) approximately 2 years after release; v21.0 (released October 2024) sunsets around October 2026.

## `graphFetch<T>` Wrapper

Generic fetch wrapper for all Graph API calls:

1. Calls `fetch(url, options)`
2. Attempts `res.json()` — throws `GraphError(message, httpStatus)` if response is non-JSON
3. Checks for `error` field in response body — throws `GraphError(message, code, subcode)`
4. Returns typed `data as T`

### `GraphError`

```ts
class GraphError extends Error {
  code: number       // Graph API error code (or HTTP status for non-JSON)
  subcode?: number   // Graph API error subcode
}
```

## Authentication Patterns

| Pattern | Format | Usage |
|---------|--------|-------|
| App token | `{appId}|{appSecret}` | `debug_token`, `/{appId}/subscriptions` |
| User token | Long-lived access token | Most API calls (WABAs, businesses, pages) |
| Page token | From `/me/accounts` response | Page-level subscription operations |

## Endpoint Table

| Function | Method | Path | Auth | Return Type |
|----------|--------|------|------|-------------|
| `debugToken` | GET | `/debug_token?input_token=…` | App token | `DebugTokenData` |
| `getAppSubscriptions` | GET | `/{appId}/subscriptions` | App token | `WebhookSubscription[]` |
| `getBusinesses` | GET | `/me/businesses` | User token | `BusinessInfo[]` |
| `getOwnedWabas` | GET | `/{businessId}/owned_whatsapp_business_accounts` | User token | `WabaInfo[]` |
| `getWabaInfo` | GET | `/{wabaId}?fields={WABA_FIELDS}` | User token | `WabaInfo` |
| `getWabaSubscribedApps` | GET | `/{wabaId}/subscribed_apps` | User token | `SubscribedApp[]` |
| `subscribeWaba` | POST | `/{wabaId}/subscribed_apps` | User token | `{ success: boolean }` |
| `getPhoneNumbers` | GET | `/{wabaId}/phone_numbers?fields={PHONE_FIELDS}` | User token | `PhoneNumber[]` |
| `getPages` | GET | `/me/accounts` | User token | `PageInfo[]` |
| `getPageSubscribedApps` | GET | `/{pageId}/subscribed_apps` | Page token | `SubscribedApp[]` |
| `subscribePageApp` | POST | `/{pageId}/subscribed_apps` | Page token | `{ success: boolean }` |

## Field Constants

### `WABA_FIELDS`

```
id, name, currency, timezone_id, message_template_namespace,
account_review_status, business_verification_status, ownership_type
```

### `PHONE_FIELDS`

```
id, display_phone_number, verified_name, quality_rating,
code_verification_status, platform_type, throughput,
is_official_business_account, account_mode, is_pin_enabled,
name_status, new_name_status, status, search_visibility,
messaging_limit_tier
```

## WABA Discovery

WABAs are discovered through a multi-strategy approach in `WabaSection.vue`:

1. **Granular scopes** — extract target IDs from `whatsapp_business_management` and `whatsapp_business_messaging` scopes in the `debug_token` response
2. **Business traversal** — call `/me/businesses` → for each business, call `/{businessId}/owned_whatsapp_business_accounts`
3. **Manual entry** — user can type a WABA ID directly (fallback for edge cases)

Results are de-duplicated via `Set`.

## Limitations

- **No pagination:** All list endpoints (`/me/businesses`, `/{businessId}/owned_whatsapp_business_accounts`, `/me/accounts`, `/{wabaId}/phone_numbers`) return only the first page of results (typically 25 items). Users with many businesses, pages, or phone numbers may see incomplete results. Use manual WABA ID entry as a fallback.

## Error Code Mapping

Used in `WabaCard.vue`'s `humanizeError()`:

| Code | Meaning |
|------|---------|
| 200 | Token doesn't have sufficient permissions for this WABA |
| 100 | ID is not a WABA (might be a Page or Phone Number) |
| 104 | Token doesn't have access to this object |
| 190 | Token is invalid or expired |
