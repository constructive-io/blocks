'use client';

import * as React from 'react';
import { ArrowLeftIcon, KeyRoundIcon, LockKeyholeIcon, MailIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';

import { canPerform, normalizeFeaturePackError } from '../shared/feature-pack-contracts';
import type { AuthEntryMode, AuthFeaturePackProps } from './auth-contracts';

const modeCopy: Record<
  AuthEntryMode,
  Readonly<{ title: string; description: string; submit: string }>
> = {
  'sign-in': {
    title: 'Sign in',
    description: 'Use your account to continue to this application.',
    submit: 'Sign in'
  },
  'sign-up': {
    title: 'Create an account',
    description: 'Create credentials for your personal Constructive identity.',
    submit: 'Create account'
  },
  'recover-password': {
    title: 'Recover your account',
    description: 'We will send recovery instructions when an account can receive them.',
    submit: 'Send recovery email'
  },
  'reset-password': {
    title: 'Choose a new password',
    description: 'Set a new password to finish recovering your account.',
    submit: 'Reset password'
  }
};

function actionForMode(mode: AuthEntryMode) {
  if (mode === 'sign-in') return 'signIn' as const;
  if (mode === 'sign-up') return 'signUp' as const;
  if (mode === 'recover-password') return 'recoverPassword' as const;
  return 'resetPassword' as const;
}

export function AuthEntryPanel({
  mode = 'sign-in',
  resetToken,
  policy,
  actions,
  onModeChange,
  onAuthenticated,
  onError
}: Omit<AuthFeaturePackProps, 'view' | 'account'>) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();
  const copy = modeCopy[mode];
  const modeAvailable = (candidate: AuthEntryMode) => {
    const action = actionForMode(candidate);
    return canPerform(policy, action) && Boolean(actions?.[action]);
  };
  const allowed = modeAvailable(mode);
  const canRecoverPassword = Boolean(onModeChange) && modeAvailable('recover-password');
  const canSignUp = Boolean(onModeChange) && modeAvailable('sign-up');
  const canSignIn = Boolean(onModeChange) && modeAvailable('sign-in');

  React.useEffect(() => {
    setError(undefined);
    setFeedback(undefined);
  }, [mode]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allowed) return;

    setPending(true);
    setError(undefined);
    setFeedback(undefined);

    try {
      if (mode === 'sign-in') {
        if (!actions?.signIn) return;
        await actions.signIn({ email: email.trim(), password });
        onAuthenticated?.();
      } else if (mode === 'sign-up') {
        if (!actions?.signUp) return;
        await actions.signUp({
          email: email.trim(),
          password
        });
        onAuthenticated?.();
      } else if (mode === 'recover-password') {
        if (!actions?.recoverPassword) return;
        await actions.recoverPassword({ email: email.trim() });
        setFeedback('If that address can receive recovery email, instructions are on the way.');
      } else {
        if (!actions?.resetPassword) return;
        await actions.resetPassword({ password, resetToken });
        setFeedback('Your password has been reset. You can sign in now.');
      }
    } catch (cause) {
      const normalized = normalizeFeaturePackError(cause, 'Authentication could not be completed.');
      setError(normalized.message);
      onError?.(normalized);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='bg-muted/30 flex min-h-[36rem] items-center justify-center p-4 sm:p-8'>
      <Card className='w-full max-w-md' variant='flat'>
        <CardHeader>
          <div className='bg-primary text-primary-foreground mb-2 flex size-10 items-center justify-center rounded-lg'>
            <KeyRoundIcon aria-hidden='true' />
          </div>
          <CardTitle className='text-xl'>
            <h1>{copy.title}</h1>
          </CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <form onSubmit={(event) => void submit(event)}>
          <CardContent className='flex flex-col gap-4'>
            {mode !== 'reset-password' ? (
              <Field htmlFor={`${fieldId}-email`} label='Email address' required>
                <div className='relative'>
                  <MailIcon className='text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2' />
                  <Input
                    autoComplete='email'
                    className='pl-10'
                    id={`${fieldId}-email`}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    required
                    type='email'
                    value={email}
                  />
                </div>
              </Field>
            ) : null}
            {mode !== 'recover-password' ? (
              <Field
                description={mode === 'sign-up' || mode === 'reset-password' ? 'Use at least 12 characters.' : undefined}
                htmlFor={`${fieldId}-password`}
                label={mode === 'reset-password' ? 'New password' : 'Password'}
                required
              >
                <div className='relative'>
                  <LockKeyholeIcon className='text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2' />
                  <Input
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    className='pl-10'
                    id={`${fieldId}-password`}
                    minLength={mode === 'sign-in' ? undefined : 12}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    required
                    type='password'
                    value={password}
                  />
                </div>
              </Field>
            ) : null}
            {error ? (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {feedback ? (
              <Alert>
                <AlertDescription>{feedback}</AlertDescription>
              </Alert>
            ) : null}
            {!allowed ? (
              <p className='text-muted-foreground text-sm'>This authentication action is unavailable for the current app.</p>
            ) : null}
            <Button disabled={!allowed || pending} type='submit'>
              {pending ? 'Working…' : copy.submit}
            </Button>
          </CardContent>
        </form>
        {mode === 'sign-in' && (canRecoverPassword || canSignUp) ? (
          <CardFooter className='mt-6 flex flex-wrap justify-between gap-2 border-t'>
            {canRecoverPassword ? (
              <Button onClick={() => onModeChange?.('recover-password')} size='sm' variant='link'>
                Forgot password?
              </Button>
            ) : null}
            {canSignUp ? (
              <Button onClick={() => onModeChange?.('sign-up')} size='sm' variant='ghost'>
                Create account
              </Button>
            ) : null}
          </CardFooter>
        ) : mode !== 'sign-in' && canSignIn ? (
          <CardFooter className='mt-6 flex flex-wrap justify-between gap-2 border-t'>
            <Button onClick={() => onModeChange?.('sign-in')} size='sm' variant='ghost'>
              <ArrowLeftIcon data-icon='inline-start' />
              Back to sign in
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
