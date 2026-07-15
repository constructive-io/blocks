import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type UIMessage, convertToModelMessages, stepCountIs, streamText, tool } from 'ai';

import type { ScrapedNode } from '@/components/chat/chat.types';
import { toolRegistry } from '@/components/chat/tool-registry';

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
const PROVIDER_REQUEST_FAILED_MESSAGE = 'Provider request failed. Check the server configuration and try again.';
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

function buildSystemPrompt(context: ScrapedNode[]) {
  let prompt = 'You are a helpful AI assistant embedded in a web page. Be concise and helpful.';
  if (context.length > 0) {
    prompt += '\n\nPage context:\n';
    prompt += context.map((n) => `- ${n.component}: ${JSON.stringify(n.attributes)}`).join('\n');
  }
  return prompt;
}

function buildTools() {
  const entries = Object.entries(toolRegistry);
  if (entries.length === 0) return undefined;

  return Object.fromEntries(
    entries.map(([name, entry]) => [
      name,
      entry.type === 'server'
        ? tool({
            description: entry.description,
            inputSchema: entry.inputSchema as any,
            needsApproval: entry.needsApproval || undefined,
            execute: async (input: any) => entry.execute(input),
          })
        : tool({
            description: entry.description,
            inputSchema: entry.inputSchema as any,
            needsApproval: entry.needsApproval,
          }),
    ]),
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const providerConfig = body.providerConfig as ProviderConfig | undefined;
  if (!providerConfig) {
    return new Response('Provider not configured. Open settings to set up your API key.', { status: 400 });
  }

  let model;
  try {
    model = createModel(providerConfig);
  } catch (error) {
    const message = error instanceof ProviderConfigurationError ? error.message : 'LLM provider not configured.';
    return new Response(message, { status: 400 });
  }

  const context = (body.context as ScrapedNode[] | undefined) ?? [];
  const messages = await convertToModelMessages(body.messages as UIMessage[]);

  try {
    const result = streamText({
      model,
      system: buildSystemPrompt(context),
      messages,
      tools: buildTools(),
      maxOutputTokens: 4096,
      stopWhen: stepCountIs(2),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        logProviderError('Chat provider stream failed', error, providerConfig.apiKey);
        return PROVIDER_REQUEST_FAILED_MESSAGE;
      },
    });
  } catch (error) {
    logProviderError('Chat provider request failed', error, providerConfig.apiKey);
    return new Response(PROVIDER_REQUEST_FAILED_MESSAGE, { status: 502 });
  }
}
