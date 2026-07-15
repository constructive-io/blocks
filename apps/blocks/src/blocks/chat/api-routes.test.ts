import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  compatibleChatModel: vi.fn(),
  createAnthropic: vi.fn(),
  createOpenAICompatible: vi.fn(),
  convertToModelMessages: vi.fn(),
  generateText: vi.fn(),
  stepCountIs: vi.fn(),
  streamOnError: undefined as ((error: unknown) => string) | undefined,
  streamText: vi.fn(),
  tool: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: mocks.createAnthropic }));
vi.mock('@ai-sdk/openai-compatible', () => ({ createOpenAICompatible: mocks.createOpenAICompatible }));
vi.mock('ai', () => ({
  convertToModelMessages: mocks.convertToModelMessages,
  generateText: mocks.generateText,
  stepCountIs: mocks.stepCountIs,
  streamText: mocks.streamText,
  tool: mocks.tool,
}));

type RouteTarget = 'chat' | 'test';

const originalAllowlist = process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS;

beforeEach(() => {
  delete process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS;
  vi.resetModules();
  vi.clearAllMocks();
  mocks.streamOnError = undefined;
  mocks.compatibleChatModel.mockReturnValue({ id: 'compatible-model' });
  mocks.createOpenAICompatible.mockReturnValue({ chatModel: mocks.compatibleChatModel });
  mocks.createAnthropic.mockReturnValue(vi.fn(() => ({ id: 'anthropic-model' })));
  mocks.convertToModelMessages.mockResolvedValue([]);
  mocks.generateText.mockResolvedValue({ text: 'ok' });
  mocks.stepCountIs.mockReturnValue(() => false);
  mocks.tool.mockImplementation((definition) => definition);
  mocks.streamText.mockImplementation(() => ({
    toUIMessageStreamResponse: ({ onError }: { onError: (error: unknown) => string }) => {
      mocks.streamOnError = onError;
      return new Response('streaming');
    },
  }));
});

afterEach(() => {
  if (originalAllowlist === undefined) delete process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS;
  else process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS = originalAllowlist;
  vi.restoreAllMocks();
});

async function loadRoute(target: RouteTarget) {
  return target === 'chat' ? import('./api-route') : import('./api-test-route');
}

async function callRoute(target: RouteTarget, baseUrl: unknown, apiKey = 'test-api-key') {
  const config = {
    provider: 'openai-compat',
    apiKey,
    baseUrl,
    model: 'test-model',
  };
  const body = target === 'chat' ? { providerConfig: config, context: [], messages: [] } : config;
  const route = await loadRoute(target);
  return route.POST(
    new Request(`http://localhost/api/chat${target === 'test' ? '/test' : ''}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe.each<RouteTarget>(['chat', 'test'])('%s provider route allowlist', (target) => {
  it('fails closed during module initialization when the configured allowlist is invalid', async () => {
    process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS = 'file:///etc/passwd';

    await expect(loadRoute(target)).rejects.toThrow(
      'CHAT_ALLOWED_PROVIDER_BASE_URLS must contain only absolute HTTP(S) URLs',
    );
    expect(mocks.createOpenAICompatible).not.toHaveBeenCalled();
  });

  it('allows and normalizes the built-in OpenAI URL and path-segment descendants', async () => {
    const exactResponse = await callRoute(target, 'https://api.openai.com/v1///');
    const descendantResponse = await callRoute(target, 'https://api.openai.com/v1/tenant-a');

    expect(exactResponse.status).toBe(200);
    expect(descendantResponse.status).toBe(200);
    expect(mocks.createOpenAICompatible).toHaveBeenNthCalledWith(1, {
      name: 'openai-compat',
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'test-api-key',
    });
    expect(mocks.createOpenAICompatible).toHaveBeenNthCalledWith(2, {
      name: 'openai-compat',
      baseURL: 'https://api.openai.com/v1/tenant-a',
      apiKey: 'test-api-key',
    });
  });

  it('allows an explicitly configured local endpoint and custom path prefix', async () => {
    process.env.CHAT_ALLOWED_PROVIDER_BASE_URLS =
      'http://127.0.0.1:11434/v1/, https://gateway.example.test/openai/';

    const localResponse = await callRoute(target, 'http://127.0.0.1:11434/v1/');
    const gatewayResponse = await callRoute(target, 'https://gateway.example.test/openai/team-a');

    expect(localResponse.status).toBe(200);
    expect(gatewayResponse.status).toBe(200);
    expect(mocks.createOpenAICompatible).toHaveBeenNthCalledWith(1, {
      name: 'openai-compat',
      baseURL: 'http://127.0.0.1:11434/v1',
      apiKey: 'test-api-key',
    });
    expect(mocks.createOpenAICompatible).toHaveBeenNthCalledWith(2, {
      name: 'openai-compat',
      baseURL: 'https://gateway.example.test/openai/team-a',
      apiKey: 'test-api-key',
    });
  });

  it.each([
    ['', 'empty URL'],
    [null, 'non-string URL'],
    ['not a url', 'malformed URL'],
    ['file:///etc/passwd', 'file protocol'],
    ['ftp://api.openai.com/v1', 'FTP protocol'],
    ['http://localhost:11434/v1', 'unlisted localhost'],
    ['http://127.0.0.1:11434/v1', 'unlisted loopback'],
    ['http://10.0.0.1/v1', 'unlisted private host'],
    ['http://169.254.169.254/latest/meta-data', 'metadata host'],
    ['https://api.openai.com.evil.test/v1', 'hostname suffix'],
    ['https://evil.api.openai.com/v1', 'subdomain'],
    ['https://api.openai.com/v1.evil', 'path-prefix confusion'],
    ['https://api.openai.com/v1/../internal', 'path traversal'],
    ['https://api.openai.com/v1/%2Fmetadata', 'encoded path separator'],
    ['https://api.openai.com@evil.test/v1', 'host in username'],
    ['https://user:password@api.openai.com/v1', 'credentials'],
    ['https://api.openai.com/v1?target=http://169.254.169.254', 'query string'],
    ['https://api.openai.com/v1#fragment', 'fragment'],
    [String.raw`https:\\api.openai.com\v1`, 'backslash confusion'],
  ])('rejects %s (%s) before constructing the SDK client', async (baseUrl, _label) => {
    const response = await callRoute(target, baseUrl);

    expect(response.status).toBe(400);
    expect(mocks.createOpenAICompatible).not.toHaveBeenCalled();
  });
});

describe('provider failure sanitization', () => {
  const apiKey = 'super-secret-api-key';
  const upstreamBody = '{"error":{"message":"raw upstream account details"}}';

  it('does not reflect streaming errors or log the API key', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await callRoute('chat', 'https://api.openai.com/v1', apiKey);
    const upstreamError = Object.assign(new Error(`Bearer ${apiKey} was rejected`), {
      responseBody: upstreamBody,
      statusCode: 401,
    });

    const clientMessage = mocks.streamOnError?.(upstreamError);

    expect(response.status).toBe(200);
    expect(clientMessage).toBe('Provider request failed. Check the server configuration and try again.');
    expect(clientMessage).not.toContain(upstreamBody);
    expect(clientMessage).not.toContain(apiKey);
    const serverLog = JSON.stringify(consoleError.mock.calls);
    expect(serverLog).toContain('[REDACTED]');
    expect(serverLog).toContain('401');
    expect(serverLog).not.toContain(apiKey);
    expect(serverLog).not.toContain(upstreamBody);
  });

  it('sanitizes a synchronous streaming-provider failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.streamText.mockImplementationOnce(() => {
      throw Object.assign(new Error(`Synchronous provider failure for ${apiKey}: ${upstreamBody}`), {
        statusCode: 503,
      });
    });

    const response = await callRoute('chat', 'https://api.openai.com/v1', apiKey);
    const clientMessage = await response.text();

    expect(response.status).toBe(502);
    expect(clientMessage).toBe('Provider request failed. Check the server configuration and try again.');
    expect(clientMessage).not.toContain(upstreamBody);
    expect(clientMessage).not.toContain(apiKey);
    const serverLog = JSON.stringify(consoleError.mock.calls);
    expect(serverLog).toContain('[REDACTED]');
    expect(serverLog).toContain('503');
    expect(serverLog).not.toContain(apiKey);
  });

  it('does not reflect connection-test provider errors or log the API key', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.generateText.mockRejectedValue(
      Object.assign(new Error(`Provider returned ${upstreamBody} for ${apiKey}`), { statusCode: 502 }),
    );

    const response = await callRoute('test', 'https://api.openai.com/v1', apiKey);
    const body = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(502);
    expect(body).toEqual({
      ok: false,
      error: 'Provider connection failed. Check the server configuration and try again.',
    });
    expect(body.error).not.toContain(upstreamBody);
    expect(body.error).not.toContain(apiKey);
    const serverLog = JSON.stringify(consoleError.mock.calls);
    expect(serverLog).toContain('[REDACTED]');
    expect(serverLog).toContain('502');
    expect(serverLog).not.toContain(apiKey);
  });
});
