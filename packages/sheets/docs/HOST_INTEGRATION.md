# Host App Integration Spec

How host applications (consumers of `@constructive-io/sheets`) communicate with sheets, particularly for auth error handling.

## Auth Error Ownership

Sheets owns auth error **detection**. The host app owns auth error **handling**.

When a sheets GraphQL request encounters a 401 HTTP status or `UNAUTHENTICATED` GraphQL error code, sheets calls the `onAuthError` callback provided via `SheetsConfig` **before** throwing the error. The error still propagates normally to React Query — the callback is a side-effect for the host app to clean up tokens, clear stores, cancel queries, etc.

### `SheetsConfig.onAuthError`

```typescript
interface SheetsConfig {
  endpoint: string;
  databaseId?: string;
  auth: SheetsAuthEmbedded | SheetsAuthStandalone;
  queryClient?: QueryClient;
  onAuthError?: () => void;  // ← host app provides this
  // ...
}

interface SheetsAuthEmbedded {
  mode: 'embedded';
  getToken: () => string | null;
  getIdentityKey?: () => string | null; // stable user/session id, never a token
}
```

### Call Sites

`onAuthError` fires from two paths in `sheets-execute.ts`:

1. **HTTP 401** — `config.onAuthError?.()` before `throw createError.unauthorized(...)`
2. **GraphQL UNAUTHENTICATED** — `onAuthError?.()` inside `parseGraphQLResponse` before returning the error

Both paths also apply to GraphQL requests made by the default storage executor.

### Propagation

`SheetsProvider` uses the host's token getter and `onAuthError` to build the
default data and storage executors. If the host injects an executor or
uploader, it owns auth handling for requests made through that override.

## Media uploads

Configure the data endpoint as `endpoint` and the tenant's storage endpoint as
`storage: { endpoint, execute? }`. Upload discovery and signed preview lookups
use storage, and the cell update uses the data endpoint. An injected
`executeUpload` takes precedence for uploads. Without either an injected uploader
or storage, the media editor is read-only.

Sheets requests the public default bucket by omitting `bucketKey` and sending
`isPublic: true`. A host can set `upload.bucketKey` to select a particular
bucket. Image and upload fields store the file projection
`{ id, key, bucket_id, mime, size, filename, url? }`. The editor resolves a
signed preview when the projection lacks a public URL. Attachment fields store
only `file.url` as text and require a public bucket with a public URL prefix.

When migrating a host uploader, return `{ file: SheetsFileValue, url?: string }`.
The optional top-level `url` is for immediate download and may expire. Put a
durable public URL on `file.url` when the storage service provides one.
`executeFieldUpload(target, file, transport)` now takes the table, field, and
typed row identifier in `target`, and the data executor, uploader, and adapter
in `transport`. It returns the saved cell value and accepts `null` to clear.
Use `useSheetsFieldUpload` in place of `useSheetsImageUpload`.

## Auth Error Flow

```
┌──────────────────────────────┐
│  Host App (e.g. admin)       │
│                              │
│  SheetsConfig {              │
│    onAuthError: () => {      │  ← host provides cleanup logic
│      clearToken(scope)       │
│      cancelQueries(scope)    │
│    }                         │
│  }                           │
└──────────┬───────────────────┘
           │ passes config
           ▼
┌──────────────────────────────┐
│  SheetsProvider              │
│  → createSheetsExecute(cfg)  │
│  → storage.execute          │
└──────────┬───────────────────┘
           │ request fails (401 / UNAUTHENTICATED)
           ▼
┌──────────────────────────────┐
│  sheets-execute.ts           │
│  1. cfg.onAuthError?.()      │  ← fires callback
│  2. throw ConstructiveError  │  ← error propagates to React Query
└──────────────────────────────┘
```

## Shared QueryClient Considerations

When the host injects its own `QueryClient` via `config.queryClient`, both the host's global `QueryCache.onError` and sheets' `onAuthError` will fire on auth errors. The host should **skip sheets queries** in its global handler to avoid double-handling:

```typescript
// In host's query-client.ts
function handleGlobalAuthError(error: unknown, queryKey?: readonly unknown[]) {
  if (!isAuthError(error)) return;
  if (queryKey?.[0] === 'sheets') return; // sheets handles its own auth
  // ... handle host-layer auth errors
}
```

The `'sheets'` prefix on query keys is the boundary contract. Data-bearing keys then include `{ databaseId, endpoint, identityKey }`, so a user or endpoint switch cannot read another scope's cached metadata or rows. `SheetsProvider` also cancels in-flight queries for the old scope during a switch. If `getIdentityKey` is omitted, the provider falls back to an opaque provider-local key that changes whenever it observes a different token; supplying a stable user id avoids unnecessary cache turnover during token refreshes.

## Debouncing

When a token expires, many in-flight queries fail simultaneously. The host's `onAuthError` callback should debounce to avoid stampeding (clearing tokens and canceling queries repeatedly). A 2-second cooldown via a ref timestamp is the recommended pattern:

```typescript
const AUTH_ERROR_COOLDOWN = 2000;
const lastHandledRef = useRef(0);

const onAuthError = useCallback(() => {
  const now = Date.now();
  if (now - lastHandledRef.current < AUTH_ERROR_COOLDOWN) return;
  lastHandledRef.current = now;
  // ... cleanup
}, []);
```

## Reference: Admin App Integration

The admin app (`apps/admin`) integrates via `SheetsBridge`:

| File | Role |
|------|------|
| `src/components/dashboard/sheets-bridge.tsx` | Wires `onAuthError` — clears dashboard token + store for the active database scope, cancels scoped sheets queries |
| `src/lib/query-client.ts` | Global handler skips `key[0] === 'sheets'`, handles everything else as schema-builder |
| `src/lib/__tests__/query-client-auth-isolation.test.ts` | Tests `isAuthError` detection + routing logic |

## Extending `onAuthError`

Currently `onAuthError` is `() => void`. If future consumers need error details, extend the signature:

```typescript
onAuthError?: (detail: { status?: number; code?: string }) => void;
```

This is a non-breaking change — existing `() => void` callbacks ignore the argument.
