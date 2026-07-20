'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  EMBEDDINGS_PROVIDER_PRESETS,
  PROVIDER_PRESETS,
  type EmbeddingsProviderType,
  type EmbeddingsSettings,
  type LLMProviderType,
  type LLMSettings,
} from './chat.types';

type TestStatus = 'idle' | 'dirty' | 'testing' | 'success' | 'error';

interface ChatSettingsProps {
  settings: LLMSettings;
  onSettingsChange: (patch: Partial<LLMSettings>) => void;
  embeddingsSettings: EmbeddingsSettings;
  onEmbeddingsSettingsChange: (patch: Partial<EmbeddingsSettings>) => void;
  testEndpoint?: string;
  onBack: () => void;
}

export function ChatSettings({
  settings,
  onSettingsChange,
  embeddingsSettings,
  onEmbeddingsSettingsChange,
  testEndpoint,
  onBack,
}: ChatSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [showEmbeddingsKey, setShowEmbeddingsKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const updateConfig = useCallback(
    (patch: Partial<LLMSettings>) => {
      onSettingsChange(patch);
      setTestStatus((prev) => (prev === 'idle' ? 'idle' : 'dirty'));
      setTestError(null);
    },
    [onSettingsChange],
  );

  const handleProviderChange = useCallback(
    (provider: LLMProviderType) => {
      const preset = PROVIDER_PRESETS[provider];
      updateConfig({
        provider,
        baseUrl: settings.baseUrl || preset.baseUrl,
        model: settings.model || preset.model,
      });
    },
    [updateConfig, settings.baseUrl, settings.model],
  );

  const canTest =
    settings.provider === 'anthropic' ? Boolean(settings.apiKey) : Boolean(settings.apiKey || settings.baseUrl);

  const handleTest = useCallback(async () => {
    if (!testEndpoint) return;
    abortRef.current?.abort();
    setTestStatus('testing');
    setTestError(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        signal: abortController.signal,
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setTestError(data.error || 'Connection failed');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setTestStatus('error');
      setTestError('Unable to reach test endpoint');
    }
  }, [settings, testEndpoint]);

  return (
    <div className='flex flex-1 flex-col overflow-y-auto'>
      <div className='flex items-center gap-2 border-b px-4 py-3'>
        <button
          type='button'
          onClick={onBack}
          aria-label='Back to chat'
          className='text-muted-foreground hover:text-foreground inline-flex size-11 cursor-pointer items-center justify-center rounded-md transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10'
        >
          <ArrowLeft className='h-4 w-4' />
        </button>
        <span className='text-sm font-medium'>AI Settings</span>
      </div>

      <div className='flex flex-col gap-5 p-4'>
        <p className='text-pretty text-muted-foreground text-xs font-medium uppercase tracking-wider'>Chat Model</p>

        <div className='flex flex-col gap-2'>
          <Label>Provider</Label>
          <Select value={settings.provider} onValueChange={(v) => handleProviderChange(v as LLMProviderType)}>
            <SelectTrigger>
              <SelectValue placeholder='Select provider'>{() => PROVIDER_PRESETS[settings.provider]?.label ?? 'Select provider'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-2'>
          <Label>
            API Key{' '}
            {settings.provider !== 'anthropic' && (
              <span className='text-muted-foreground font-normal'>(optional for local)</span>
            )}
          </Label>
          <div className='relative'>
            <Input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => updateConfig({ apiKey: (e.target as HTMLInputElement).value })}
              placeholder={settings.provider === 'anthropic' ? 'sk-ant-...' : 'sk-... (optional)'}
              className='h-11 pr-12 font-mono sm:h-10'
              autoComplete='off'
            />
            <button
              type='button'
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide chat API key' : 'Show chat API key'}
              className='text-muted-foreground hover:text-foreground absolute top-1/2 right-0 z-10 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10'
            >
              {showKey ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </button>
          </div>
        </div>

        {settings.provider === 'openai-compat' && (
          <div className='flex flex-col gap-2'>
            <Label>Base URL</Label>
            <Input
              type='text'
              value={settings.baseUrl}
              onChange={(e) => updateConfig({ baseUrl: (e.target as HTMLInputElement).value })}
              placeholder={PROVIDER_PRESETS['openai-compat'].baseUrl}
              className='font-mono'
            />
            <p className='text-muted-foreground text-pretty text-xs'>OpenAI, Ollama, or any compatible API</p>
          </div>
        )}

        <div className='flex flex-col gap-2'>
          <Label>Model</Label>
          <Input
            type='text'
            value={settings.model}
            onChange={(e) => updateConfig({ model: (e.target as HTMLInputElement).value })}
            placeholder={PROVIDER_PRESETS[settings.provider]?.model}
            className='font-mono'
          />
        </div>

        {testEndpoint && (
          <div className='flex flex-col gap-2'>
            <Button variant='outline' disabled={!canTest || testStatus === 'testing'} onClick={handleTest} className='w-full'>
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>

            {testStatus === 'success' && (
              <div className='flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400'>
                <Check className='h-4 w-4 shrink-0' />
                Connected successfully
              </div>
            )}

            {testStatus === 'error' && (
              <div className='text-destructive flex items-start gap-2 text-sm'>
                <CircleAlert className='mt-0.5 h-4 w-4 shrink-0' />
                <span>{testError}</span>
              </div>
            )}

            {testStatus === 'dirty' && (
              <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                <div className='h-2 w-2 shrink-0 rounded-full bg-gray-400' />
                Settings changed — test again to verify
              </div>
            )}
          </div>
        )}

        {/* Embeddings Model */}
        <div className='border-t pt-5'>
          <p className='text-pretty text-muted-foreground text-xs font-medium uppercase tracking-wider'>Embeddings Model</p>
        </div>

        <div className='flex flex-col gap-2'>
          <Label>Provider</Label>
          <Select
            value={embeddingsSettings.provider}
            onValueChange={(v) => onEmbeddingsSettingsChange({ provider: v as EmbeddingsProviderType })}
          >
            <SelectTrigger>
              <SelectValue placeholder='Select provider'>{() => EMBEDDINGS_PROVIDER_PRESETS[embeddingsSettings.provider]?.label ?? 'Select provider'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMBEDDINGS_PROVIDER_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-2'>
          <Label>
            API Key{' '}
            {embeddingsSettings.provider !== 'openai' && (
              <span className='text-muted-foreground font-normal'>(optional for local)</span>
            )}
          </Label>
          <div className='relative'>
            <Input
              type={showEmbeddingsKey ? 'text' : 'password'}
              value={embeddingsSettings.apiKey}
              onChange={(e) => onEmbeddingsSettingsChange({ apiKey: (e.target as HTMLInputElement).value })}
              placeholder={embeddingsSettings.provider === 'openai' ? 'sk-...' : 'sk-... (optional)'}
              className='h-11 pr-12 font-mono sm:h-10'
              autoComplete='off'
            />
            <button
              type='button'
              onClick={() => setShowEmbeddingsKey((v) => !v)}
              aria-label={showEmbeddingsKey ? 'Hide embeddings API key' : 'Show embeddings API key'}
              className='text-muted-foreground hover:text-foreground absolute top-1/2 right-0 z-10 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10'
            >
              {showEmbeddingsKey ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </button>
          </div>
        </div>

        {embeddingsSettings.provider === 'openai-compat' && (
          <div className='flex flex-col gap-2'>
            <Label>Base URL</Label>
            <Input
              type='text'
              value={embeddingsSettings.baseUrl}
              onChange={(e) => onEmbeddingsSettingsChange({ baseUrl: (e.target as HTMLInputElement).value })}
              placeholder={EMBEDDINGS_PROVIDER_PRESETS['openai-compat'].baseUrl}
              className='font-mono'
            />
            <p className='text-muted-foreground text-pretty text-xs'>Ollama or any OpenAI-compatible embeddings API</p>
          </div>
        )}

        <div className='flex flex-col gap-2'>
          <Label>Model</Label>
          <Input
            type='text'
            value={embeddingsSettings.model}
            onChange={(e) => onEmbeddingsSettingsChange({ model: (e.target as HTMLInputElement).value })}
            placeholder={EMBEDDINGS_PROVIDER_PRESETS[embeddingsSettings.provider]?.model}
            className='font-mono'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <Label>Dimensions</Label>
          <Input
            type='number'
            value={embeddingsSettings.dimensions || ''}
            onChange={(e) =>
              onEmbeddingsSettingsChange({ dimensions: parseInt((e.target as HTMLInputElement).value, 10) || 0 })
            }
            placeholder={String(EMBEDDINGS_PROVIDER_PRESETS[embeddingsSettings.provider]?.dimensions)}
            className='font-mono'
          />
          <p className='text-pretty text-muted-foreground text-xs'>
            Vector size for storage (e.g. 1536 for OpenAI, 768 for nomic-embed-text)
          </p>
        </div>
      </div>
    </div>
  );
}
