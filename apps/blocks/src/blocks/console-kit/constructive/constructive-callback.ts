export type ConstructiveConsoleCallbackKind =
  | 'password-reset'
  | 'email-verification'
  | 'account-deletion'
  | 'app-invite'
  | 'organization-invite';

declare const constructiveCallbackCredentialRef: unique symbol;

/**
 * An opaque, non-serializable handle. The corresponding credential remains in
 * the per-Console-Kit closure that issued the reference.
 */
export type ConstructiveCallbackCredentialRef = Readonly<{
  [constructiveCallbackCredentialRef]: true;
}>;

type TenantCallbackBase = Readonly<{
  databaseId: string;
  credentialRef: ConstructiveCallbackCredentialRef;
}>;

export type ConstructiveConsoleCallback =
  | (TenantCallbackBase & Readonly<{
      kind: 'password-reset';
      roleId: string;
    }>)
  | (TenantCallbackBase & Readonly<{
      kind: 'email-verification';
      emailId: string;
    }>)
  | (TenantCallbackBase & Readonly<{
      kind: 'account-deletion';
      userId: string;
    }>)
  | (TenantCallbackBase & Readonly<{ kind: 'app-invite' }>)
  | (TenantCallbackBase & Readonly<{ kind: 'organization-invite' }>);

export type ConstructiveConsoleCallbackSource =
  | string
  | URL
  | URLSearchParams;

export type ConstructiveConsoleCallbackResult =
  | Readonly<{ status: 'none'; sanitizedUrl?: string }>
  | Readonly<{
      status: 'ready';
      callback: ConstructiveConsoleCallback;
      sanitizedUrl?: string;
    }>
  | Readonly<{
      status: 'invalid';
      message: string;
      sanitizedUrl?: string;
    }>
  | Readonly<{
      status: 'incomplete';
      kind: ConstructiveConsoleCallbackKind;
      missing: readonly string[];
      message: string;
      sanitizedUrl?: string;
    }>
  | Readonly<{
      status: 'cross-tenant';
      kind: ConstructiveConsoleCallbackKind;
      expectedDatabaseId: string;
      callbackDatabaseId: string;
      message: string;
      sanitizedUrl?: string;
    }>;

export type ConstructiveCallbackCredentialStatus =
  | 'available'
  | 'consumed'
  | 'missing';

export type ConstructiveCallbackCredentialVault = Readonly<{
  put: (credential: string) => ConstructiveCallbackCredentialRef;
  peek: (reference: ConstructiveCallbackCredentialRef) => string | undefined;
  consume: (reference: ConstructiveCallbackCredentialRef) => string | undefined;
  status: (
    reference: ConstructiveCallbackCredentialRef
  ) => ConstructiveCallbackCredentialStatus;
  clear: (reference?: ConstructiveCallbackCredentialRef) => void;
}>;

/**
 * Credentials never enter React or Zustand state. References are empty frozen
 * objects, so serializing a callback descriptor cannot reveal either the
 * credential or a reusable lookup key.
 */
export function createConstructiveCallbackCredentialVault(): ConstructiveCallbackCredentialVault {
  const credentials = new Map<ConstructiveCallbackCredentialRef, string>();
  const consumed = new WeakSet<object>();

  return {
    put(credential) {
      if (!credential) {
        throw new Error('A callback credential cannot be empty.');
      }
      const reference = Object.freeze(Object.create(null)) as
        ConstructiveCallbackCredentialRef;
      credentials.set(reference, credential);
      return reference;
    },
    peek(reference) {
      return credentials.get(reference);
    },
    consume(reference) {
      const credential = credentials.get(reference);
      if (credential === undefined) return undefined;
      credentials.delete(reference);
      consumed.add(reference);
      return credential;
    },
    status(reference) {
      if (credentials.has(reference)) return 'available';
      return consumed.has(reference) ? 'consumed' : 'missing';
    },
    clear(reference) {
      if (reference) {
        credentials.delete(reference);
        return;
      }
      credentials.clear();
    }
  };
}

const CALLBACK_TYPE_KEYS = ['callback', 'callback_type', 'flow'] as const;
const DATABASE_ID_KEYS = ['database_id', 'databaseId', 'tenant_id', 'tenantId'] as const;
const ROLE_ID_KEYS = ['role_id', 'roleId', 'user_id', 'userId'] as const;
const EMAIL_ID_KEYS = ['email_id', 'emailId'] as const;
const USER_ID_KEYS = ['user_id', 'userId'] as const;
const RESET_TOKEN_KEYS = ['reset_token', 'resetToken', 'token'] as const;
const VERIFICATION_TOKEN_KEYS = ['verification_token', 'verificationToken', 'token'] as const;
const DELETION_TOKEN_KEYS = ['account_deletion_token', 'accountDeletionToken', 'token'] as const;
const INVITE_TOKEN_KEYS = ['invite_token', 'inviteToken', 'token'] as const;
const CALLBACK_PATH_ALIASES: Readonly<
  Record<ConstructiveConsoleCallbackKind, readonly string[]>
> = {
  'password-reset': ['reset-password', 'forgot-password'],
  'email-verification': ['verify-email'],
  'account-deletion': ['delete-account'],
  'app-invite': ['app-invite'],
  'organization-invite': ['organization-invite', 'org-invite']
};
const CALLBACK_PARAMETER_KEYS = new Set<string>([
  ...CALLBACK_TYPE_KEYS,
  ...DATABASE_ID_KEYS,
  ...ROLE_ID_KEYS,
  ...EMAIL_ID_KEYS,
  ...RESET_TOKEN_KEYS,
  ...VERIFICATION_TOKEN_KEYS,
  ...DELETION_TOKEN_KEYS,
  ...INVITE_TOKEN_KEYS,
  'type'
]);

type ParsedSource = Readonly<{
  params: URLSearchParams;
  query: URLSearchParams;
  fragment: URLSearchParams | null;
  url: URL | null;
}>;

type UniqueValue =
  | Readonly<{ status: 'missing' }>
  | Readonly<{ status: 'ready'; value: string }>
  | Readonly<{ status: 'conflict' }>;

function parameterFragment(hash: string): URLSearchParams | null {
  const value = hash.replace(/^#\??/u, '');
  return value.includes('=') ? new URLSearchParams(value) : null;
}

function parseSource(source: ConstructiveConsoleCallbackSource): ParsedSource {
  if (source instanceof URLSearchParams) {
    const query = new URLSearchParams(source);
    return { params: new URLSearchParams(query), query, fragment: null, url: null };
  }

  const url = source instanceof URL
    ? new URL(source.href)
    : new URL(source, 'https://constructive.invalid');
  const query = new URLSearchParams(url.search);
  const fragment = parameterFragment(url.hash);
  const params = new URLSearchParams(query);
  fragment?.forEach((value, key) => params.append(key, value));
  return { params, query, fragment, url };
}

function uniqueValue(
  params: URLSearchParams,
  keys: readonly string[]
): UniqueValue {
  const values = new Set(
    keys.flatMap((key) => params.getAll(key))
      .map((value) => value.trim())
      .filter(Boolean)
  );
  if (values.size === 0) return { status: 'missing' };
  if (values.size > 1) return { status: 'conflict' };
  return { status: 'ready', value: [...values][0] as string };
}

function normalizeKind(value: string): ConstructiveConsoleCallbackKind | null {
  switch (value.trim().toLowerCase().replaceAll('_', '-')) {
    case 'forgot-password':
    case 'password-reset':
    case 'reset-password':
      return 'password-reset';
    case 'email-verification':
    case 'verify-email':
      return 'email-verification';
    case 'account-deletion':
    case 'delete-account':
      return 'account-deletion';
    case 'app':
    case 'app-invite':
      return 'app-invite';
    case 'org':
    case 'org-invite':
    case 'organization-invite':
      return 'organization-invite';
    default:
      return null;
  }
}

function inferKind(parsed: ParsedSource): UniqueValue & {
  kind?: ConstructiveConsoleCallbackKind;
} {
  const explicit = uniqueValue(parsed.params, CALLBACK_TYPE_KEYS);
  if (explicit.status === 'conflict') return explicit;
  if (explicit.status === 'ready') {
    const kind = normalizeKind(explicit.value);
    return kind ? { status: 'ready', value: explicit.value, kind } : explicit;
  }

  const inviteType = uniqueValue(parsed.params, ['type']);
  if (inviteType.status === 'conflict') return inviteType;
  const inviteKind = inviteType.status === 'ready'
    ? normalizeKind(inviteType.value)
    : null;
  if (
    inviteType.status === 'ready' &&
    (inviteKind === 'app-invite' || inviteKind === 'organization-invite')
  ) {
    return { status: 'ready', value: inviteType.value, kind: inviteKind };
  }

  const pathname = parsed.url?.pathname.toLowerCase() ?? '';
  const pathKind = [
    'password-reset',
    'email-verification',
    'account-deletion',
    'app-invite',
    'organization-invite'
  ].find((candidate) => CALLBACK_PATH_ALIASES[
    candidate as ConstructiveConsoleCallbackKind
  ].some((alias) => pathname.includes(alias))) as
    ConstructiveConsoleCallbackKind | undefined;
  if (pathKind) return { status: 'ready', value: pathKind, kind: pathKind };

  if (uniqueValue(parsed.params, DELETION_TOKEN_KEYS).status === 'ready' &&
      uniqueValue(parsed.params, ['account_deletion_token', 'accountDeletionToken']).status === 'ready') {
    return { status: 'ready', value: 'account-deletion', kind: 'account-deletion' };
  }
  if (uniqueValue(parsed.params, ['verification_token', 'verificationToken']).status === 'ready') {
    return { status: 'ready', value: 'email-verification', kind: 'email-verification' };
  }
  if (uniqueValue(parsed.params, ['reset_token', 'resetToken']).status === 'ready') {
    return { status: 'ready', value: 'password-reset', kind: 'password-reset' };
  }
  if (uniqueValue(parsed.params, ['invite_token', 'inviteToken']).status === 'ready') {
    return { status: 'conflict' };
  }
  return { status: 'missing' };
}

function scrubbedUrl(parsed: ParsedSource): string | undefined {
  if (!parsed.url) return undefined;
  for (const key of CALLBACK_PARAMETER_KEYS) {
    parsed.query.delete(key);
    parsed.fragment?.delete(key);
  }
  parsed.url.search = parsed.query.toString();
  if (parsed.fragment) {
    const fragment = parsed.fragment.toString();
    parsed.url.hash = fragment ? `#${fragment}` : '';
  }
  return `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
}

function callbackSignalPresent(params: URLSearchParams): boolean {
  return [
    ...CALLBACK_TYPE_KEYS,
    'reset_token',
    'resetToken',
    'verification_token',
    'verificationToken',
    'account_deletion_token',
    'accountDeletionToken',
    'invite_token',
    'inviteToken'
  ].some((key) => params.has(key)) ||
    ['app', 'org', 'app-invite', 'org-invite', 'organization-invite']
      .includes(params.get('type') ?? '');
}

/**
 * Parses both query and fragment callback forms, binds legacy tenant-domain
 * links to the expected database, rejects an explicit cross-tenant database,
 * and returns only an opaque reference to the captured credential.
 */
export function parseConstructiveConsoleCallback(
  source: ConstructiveConsoleCallbackSource,
  options: Readonly<{
    databaseId: string;
    credentialVault: ConstructiveCallbackCredentialVault;
  }>
): ConstructiveConsoleCallbackResult {
  let parsed: ParsedSource;
  try {
    parsed = parseSource(source);
  } catch {
    return { status: 'invalid', message: 'The callback URL is malformed.' };
  }

  const inferred = inferKind(parsed);
  if (inferred.status === 'missing' && !callbackSignalPresent(parsed.params)) {
    return { status: 'none' };
  }
  const sanitizedUrl = scrubbedUrl(parsed);
  if (inferred.status === 'missing') {
    return {
      status: 'invalid',
      message: 'The callback type is missing or unsupported.',
      sanitizedUrl
    };
  }
  if (inferred.status === 'conflict' || !inferred.kind) {
    return {
      status: 'invalid',
      message: 'The callback contains conflicting or unsupported fields.',
      sanitizedUrl
    };
  }
  const kind = inferred.kind;

  const database = uniqueValue(parsed.params, DATABASE_ID_KEYS);
  if (database.status === 'conflict') {
    return {
      status: 'invalid',
      message: 'The callback contains conflicting tenant database identifiers.',
      sanitizedUrl
    };
  }
  const callbackDatabaseId = database.status === 'ready'
    ? database.value
    : options.databaseId;
  if (callbackDatabaseId !== options.databaseId) {
    return {
      status: 'cross-tenant',
      kind,
      expectedDatabaseId: options.databaseId,
      callbackDatabaseId,
      message: 'This callback belongs to a different tenant database.',
      sanitizedUrl
    };
  }

  const fields = (() => {
    switch (kind) {
      case 'password-reset':
        return {
          identity: uniqueValue(parsed.params, ROLE_ID_KEYS),
          credential: uniqueValue(parsed.params, RESET_TOKEN_KEYS),
          identityLabel: 'role_id'
        };
      case 'email-verification':
        return {
          identity: uniqueValue(parsed.params, EMAIL_ID_KEYS),
          credential: uniqueValue(parsed.params, VERIFICATION_TOKEN_KEYS),
          identityLabel: 'email_id'
        };
      case 'account-deletion':
        return {
          identity: uniqueValue(parsed.params, USER_ID_KEYS),
          credential: uniqueValue(parsed.params, DELETION_TOKEN_KEYS),
          identityLabel: 'user_id'
        };
      case 'app-invite':
      case 'organization-invite':
        return {
          identity: null,
          credential: uniqueValue(parsed.params, INVITE_TOKEN_KEYS),
          identityLabel: null
        };
    }
  })();
  if (fields.identity?.status === 'conflict' || fields.credential.status === 'conflict') {
    return {
      status: 'invalid',
      message: 'The callback contains conflicting credential fields.',
      sanitizedUrl
    };
  }
  const missing = [
    fields.identity?.status === 'missing' ? fields.identityLabel : null,
    fields.credential.status === 'missing' ? 'credential' : null
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0) {
    return {
      status: 'incomplete',
      kind,
      missing,
      message: 'The callback link is incomplete.',
      sanitizedUrl
    };
  }
  if (fields.credential.status !== 'ready') {
    return {
      status: 'invalid',
      message: 'The callback credential is invalid.',
      sanitizedUrl
    };
  }

  const credentialRef = options.credentialVault.put(fields.credential.value);
  const base = { databaseId: callbackDatabaseId, credentialRef } as const;
  switch (kind) {
    case 'password-reset':
      return {
        status: 'ready',
        callback: {
          ...base,
          kind,
          roleId: fields.identity?.status === 'ready' ? fields.identity.value : ''
        },
        sanitizedUrl
      };
    case 'email-verification':
      return {
        status: 'ready',
        callback: {
          ...base,
          kind,
          emailId: fields.identity?.status === 'ready' ? fields.identity.value : ''
        },
        sanitizedUrl
      };
    case 'account-deletion':
      return {
        status: 'ready',
        callback: {
          ...base,
          kind,
          userId: fields.identity?.status === 'ready' ? fields.identity.value : ''
        },
        sanitizedUrl
      };
    case 'app-invite':
    case 'organization-invite':
      return {
        status: 'ready',
        callback: { ...base, kind },
        sanitizedUrl
      };
  }
}

export function scrubConstructiveConsoleCallbackLocation(
  result: ConstructiveConsoleCallbackResult,
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  history: Pick<History, 'replaceState' | 'state'>
): void {
  if (!result.sanitizedUrl) return;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (result.sanitizedUrl === current) return;
  history.replaceState(history.state, '', result.sanitizedUrl);
}
