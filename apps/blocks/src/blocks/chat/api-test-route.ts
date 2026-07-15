import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

export const runtime = 'nodejs';

interface ProviderConfig {
  provider: 'anthropic' | 'openai-compat';
  apiKey: string;
  baseUrl: string;
  model: string;
}

type NormalizedProviderBaseUrl = {
  origin: string;
  pathname: string;
  value: string;
};

const DEFAULT_ALLOWED_PROVIDER_BASE_URL = 'https://api.openai.com/v1';
const PROVIDER_REQUEST_FAILED_MESSAGE = 'Provider connection failed. Check the server configuration and try again.';
const MAX_PROVIDER_LOG_MESSAGE_LENGTH = 1000;

class ProviderConfigurationError extends Error {}

function normalizeProviderBaseUrl(value: unknown, errorMessage: string): NormalizedProviderBaseUrl {
  if (typeof value !== 'string' || !value.trim()) throw new ProviderConfigurationError(errorMessage);

  const candidate = value.trim();
  if (
    candidate.includes('\\') ||
    candidate.includes('?') ||
    candidate.includes('#') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    throw new ProviderConfigurationError(errorMessage);
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ProviderConfigurationError(errorMessage);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /%2f|%5c/i.test(url.pathname)
  ) {
    throw new ProviderConfigurationError(errorMessage);
  }

  const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  return { origin: url.origin, pathname, value: `${url.origin}${pathname}` };
}

function parseAllowedProviderBaseUrls(value: string | undefined): NormalizedProviderBaseUrl[] {
  const configured = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [DEFAULT_ALLOWED_PROVIDER_BASE_URL, ...configured].map((entry) => {
    try {
      return normalizeProviderBaseUrl(entry, 'Invalid provider base URL allowlist configuration.');
    } catch {
      throw new Error(
        'CHAT_ALLOWED_PROVIDER_BASE_URLS must contain only absolute HTTP(S) URLs without credentials, queries, or fragments.',
      );
    }
  });
}

const ALLOWED_PROVIDER_BASE_URLS = parseAllowedProviderBaseUrls(process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS);

function requireAllowedProviderBaseUrl(value: unknown): string {
  const requested = normalizeProviderBaseUrl(value, 'Provider base URL is invalid.');
  const isAllowed = ALLOWED_PROVIDER_BASE_URLS.some(
    (allowed) =>
      requested.origin === allowed.origin &&
      (allowed.pathname === '' ||
        requested.pathname === allowed.pathname ||
        requested.pathname.startsWith(`${allowed.pathname}/`)),
  );

  if (!isAllowed) throw new ProviderConfigurationError('Provider base URL is not allowed by this server.');
  return requested.value;
}

function redactProviderLogMessage(message: string, apiKey: unknown): string {
  let redacted = message;
  if (typeof apiKey === 'string' && apiKey) redacted = redacted.split(apiKey).join('[REDACTED]');
  return redacted
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, MAX_PROVIDER_LOG_MESSAGE_LENGTH);
}

function logProviderError(label: string, error: unknown, apiKey: unknown) {
  const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : undefined;
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown provider error';
  const details: Record<string, unknown> = {
    name: error instanceof Error ? error.name : 'ProviderError',
    message: redactProviderLogMessage(rawMessage, apiKey),
  };
  const statusCode = record?.statusCode ?? record?.status;
  if (typeof statusCode === 'number' || typeof statusCode === 'string') details.statusCode = statusCode;
  console.error(label, details);
}

function createModel(config: ProviderConfig) {
  if (config.provider === 'anthropic') {
    if (!config.apiKey) throw new ProviderConfigurationError('Anthropic API key is required.');
    const anthropic = createAnthropic({ apiKey: config.apiKey });
    return anthropic(config.model || 'claude-sonnet-4-20250514');
  }

  if (config.provider !== 'openai-compat') throw new ProviderConfigurationError('Unsupported provider.');
  const baseURL = requireAllowedProviderBaseUrl(config.baseUrl);
  const provider = createOpenAICompatible({
    name: 'openai-compat',
    baseURL,
    apiKey: config.apiKey || undefined,
  });
  return provider.chatModel(config.model || 'gpt-4o');
}

export async function POST(request: Request) {
  let config: ProviderConfig;
  try {
    config = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  let model;
  try {
    model = createModel(config);
  } catch (error) {
    const message = error instanceof ProviderConfigurationError ? error.message : 'Invalid provider configuration.';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    await generateText({
      model,
      system: 'Reply with exactly: ok',
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 4,
      temperature: 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    logProviderError('Chat provider connection test failed', error, config.apiKey);
    return Response.json({ ok: false, error: PROVIDER_REQUEST_FAILED_MESSAGE }, { status: 502 });
  }
}
