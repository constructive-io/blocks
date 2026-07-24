'use client';

import * as React from 'react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import { CardContent } from '@constructive-io/ui/card';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';

import { normalizeFeaturePackError } from '../shared/feature-pack-contracts';
import type {
  AuthChallengeContribution,
  AuthChallengeDescriptor,
  AuthChallengeResponse,
  AuthFeaturePackProps
} from './auth-contracts';

type ActiveChallenge = Readonly<{
  contribution: AuthChallengeContribution;
  descriptor: AuthChallengeDescriptor;
}>;

function responseMatchesChallenge(
  descriptor: AuthChallengeDescriptor,
  response: AuthChallengeResponse
): boolean {
  return descriptor.response === response.kind;
}

export function AuthChallengePanel({
  contributions,
  email,
  onAuthenticated,
  onError
}: Readonly<{
  contributions: readonly AuthChallengeContribution[];
  email: string;
  onAuthenticated?: AuthFeaturePackProps['onAuthenticated'];
  onError?: AuthFeaturePackProps['onError'];
}>) {
  const [active, setActive] = React.useState<ActiveChallenge>();
  const [code, setCode] = React.useState('');
  const [pending, setPending] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [feedback, setFeedback] = React.useState<string>();
  const fieldId = React.useId();

  if (contributions.length === 0) return null;

  const reportError = (cause: unknown, fallback: string) => {
    const normalized = normalizeFeaturePackError(cause, fallback);
    setError(normalized.message);
    onError?.(normalized);
  };

  const complete = async (
    contribution: AuthChallengeContribution,
    descriptor: AuthChallengeDescriptor,
    response: AuthChallengeResponse
  ) => {
    if (!responseMatchesChallenge(descriptor, response)) {
      throw new Error(
        `${contribution.label} returned a ${response.kind} response for a ${descriptor.response} challenge.`
      );
    }
    await contribution.complete({
      challengeId: descriptor.id,
      response
    });
    setActive(undefined);
    setCode('');
    setFeedback(`${contribution.label} authentication completed.`);
    onAuthenticated?.();
  };

  const start = async (contribution: AuthChallengeContribution, index: number) => {
    const pendingKey = `start-${index}`;
    setPending(pendingKey);
    setError(undefined);
    setFeedback(undefined);
    try {
      const descriptor = await contribution.start({
        email: email.trim() || undefined,
        returnTo: typeof window === 'undefined' ? undefined : window.location.href
      });
      if (descriptor.method !== contribution.method) {
        throw new Error(
          `${contribution.label} returned a ${descriptor.method} challenge for its ${contribution.method} contribution.`
        );
      }
      if (descriptor.response === 'code') {
        setActive({ contribution, descriptor });
        setCode('');
        return;
      }
      if (!contribution.respond) {
        throw new Error(
          `${contribution.label} must provide a response handler for ${descriptor.response} challenges.`
        );
      }
      const response = await contribution.respond({ challenge: descriptor });
      await complete(contribution, descriptor, response);
    } catch (cause) {
      reportError(cause, `${contribution.label} authentication could not be started.`);
    } finally {
      setPending(undefined);
    }
  };

  const submitCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!active || active.descriptor.response !== 'code' || pending) return;
    const responseCode = code.trim();
    if (!responseCode) {
      setError('Enter the verification code.');
      return;
    }
    setPending('complete');
    setError(undefined);
    setFeedback(undefined);
    try {
      await complete(active.contribution, active.descriptor, {
        kind: 'code',
        code: responseCode
      });
    } catch (cause) {
      reportError(cause, `${active.contribution.label} authentication could not be completed.`);
    } finally {
      setPending(undefined);
    }
  };

  const cancel = async () => {
    if (!active || pending) return;
    setPending('cancel');
    setError(undefined);
    try {
      await active.contribution.cancel?.({
        challengeId: active.descriptor.id
      });
      setActive(undefined);
      setCode('');
    } catch (cause) {
      reportError(cause, `${active.contribution.label} authentication could not be canceled.`);
    } finally {
      setPending(undefined);
    }
  };

  return (
    <CardContent className='mt-6 flex flex-col gap-4 border-t pt-6'>
      {active ? (
        <form className='flex flex-col gap-4' onSubmit={(event) => void submitCode(event)}>
          <div>
            <h2 className='text-balance text-sm font-semibold'>{active.descriptor.title}</h2>
            {active.descriptor.description ? (
              <p className='text-muted-foreground mt-1 text-pretty text-sm'>
                {active.descriptor.description}
              </p>
            ) : null}
          </div>
          <Field htmlFor={`${fieldId}-code`} label='Verification code' required>
            <Input
              autoComplete='one-time-code'
              autoFocus
              id={`${fieldId}-code`}
              inputMode='numeric'
              onChange={(event) => {
                setCode(event.currentTarget.value);
                if (error) setError(undefined);
              }}
              required
              value={code}
            />
          </Field>
          {error ? (
            <Alert role='alert' variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className='flex flex-wrap gap-2'>
            <Button disabled={!code.trim() || Boolean(pending)} type='submit'>
              {pending === 'complete' ? 'Verifying…' : 'Verify code'}
            </Button>
            <Button
              disabled={Boolean(pending)}
              onClick={() => void cancel()}
              type='button'
              variant='ghost'
            >
              {pending === 'cancel' ? 'Canceling…' : 'Use another method'}
            </Button>
          </div>
        </form>
      ) : (
        <div className='flex flex-col gap-3'>
          <div>
            <h2 className='text-balance text-sm font-semibold'>More ways to sign in</h2>
            <p className='text-muted-foreground mt-1 text-pretty text-sm'>
              Use an authentication method configured by this application.
            </p>
          </div>
          <div className='grid gap-2'>
            {contributions.map((contribution, index) => (
              <Button
                disabled={Boolean(pending)}
                key={`${contribution.method}-${contribution.label}`}
                onClick={() => void start(contribution, index)}
                type='button'
                variant='outline'
              >
                {pending === `start-${index}`
                  ? `Starting ${contribution.label}…`
                  : contribution.label}
              </Button>
            ))}
          </div>
          {error ? (
            <Alert role='alert' variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {feedback ? (
            <Alert role='status'>
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}
    </CardContent>
  );
}
