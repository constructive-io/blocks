'use client';

import * as React from 'react';
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  MailIcon
} from 'lucide-react';

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
import { Checkbox } from '@constructive-io/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@constructive-io/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@constructive-io/ui/input-group';

import { canPerform, normalizeFeaturePackError } from '../shared/feature-pack-contracts';
import type {
  AuthEntryMode,
  AuthFeaturePackProps
} from './auth-contracts';
import {
  authPasswordHint,
  authPasswordPolicyError,
  normalizedPasswordLength
} from './auth-password-policy';

const modeCopy: Record<
  AuthEntryMode,
  Readonly<{ title: string; description: string; submit: string; pending: string }>
> = {
  'sign-in': {
    title: 'Sign in',
    description: 'Use your account to continue to this application.',
    submit: 'Sign in',
    pending: 'Signing in…'
  },
  'sign-up': {
    title: 'Create an account',
    description: 'Create credentials for your personal Constructive identity.',
    submit: 'Create account',
    pending: 'Creating account…'
  },
  'recover-password': {
    title: 'Recover your account',
    description: 'We will send recovery instructions when an account can receive them.',
    submit: 'Send recovery email',
    pending: 'Sending recovery email…'
  },
  'reset-password': {
    title: 'Choose a new password',
    description: 'Set a new password to finish recovering your account.',
    submit: 'Reset password',
    pending: 'Resetting password…'
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
  policy,
  actions,
  notice,
  verificationNotice,
  passwordPolicy,
  onModeChange,
  onAuthenticated,
  onError
}: Omit<AuthFeaturePackProps, 'view' | 'account'>) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [emailError, setEmailError] = React.useState<string>();
  const [passwordError, setPasswordError] = React.useState<string>();
  const fieldId = React.useId();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const copy = modeCopy[mode];
  const modeAvailable = (candidate: AuthEntryMode) => {
    const action = actionForMode(candidate);
    return canPerform(policy, action) && Boolean(actions?.[action]);
  };
  const allowed = modeAvailable(mode);
  const canRecoverPassword = Boolean(onModeChange) && modeAvailable('recover-password');
  const canSignUp = Boolean(onModeChange) && modeAvailable('sign-up');
  const canSignIn = Boolean(onModeChange) && modeAvailable('sign-in');
  const requiresPassword = mode !== 'recover-password';
  const requiresStrongPassword = mode === 'sign-up' || mode === 'reset-password';
  const passwordHint = requiresStrongPassword
    ? authPasswordHint(password, passwordPolicy)
    : undefined;
  const minPasswordLength = normalizedPasswordLength(passwordPolicy?.minLength);
  const maxPasswordLength = normalizedPasswordLength(passwordPolicy?.maxLength);
  const activeNotice = notice ?? verificationNotice;

  React.useEffect(() => {
    setPassword('');
    setRememberMe(false);
    setError(undefined);
    setFeedback(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
    setShowPassword(false);
  }, [mode]);

  const focusFirstError = (next: Readonly<{ email?: string; password?: string }>) => {
    if (next.email) {
      emailRef.current?.focus();
      return;
    }
    if (next.password) {
      passwordRef.current?.focus();
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allowed) return;

    const nextEmailError =
      mode !== 'reset-password' && !email.trim()
        ? 'Enter an email address.'
        : undefined;
    const nextPasswordError = requiresPassword
      ? !password
        ? 'Enter a password.'
        : requiresStrongPassword
          ? authPasswordPolicyError(password, passwordPolicy)
          : undefined
      : undefined;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setError(undefined);
    setFeedback(undefined);

    if (nextEmailError || nextPasswordError) {
      focusFirstError({ email: nextEmailError, password: nextPasswordError });
      return;
    }

    setPending(true);

    try {
      if (mode === 'sign-in') {
        if (!actions?.signIn) return;
        await actions.signIn({ email: email.trim(), password, rememberMe });
        onAuthenticated?.();
      } else if (mode === 'sign-up') {
        if (!actions?.signUp) return;
        await actions.signUp({
          email: email.trim(),
          password,
          rememberMe
        });
        onAuthenticated?.();
      } else if (mode === 'recover-password') {
        if (!actions?.recoverPassword) return;
        await actions.recoverPassword({ email: email.trim() });
        setFeedback('If that address can receive recovery email, instructions are on the way.');
      } else {
        if (!actions?.resetPassword) return;
        await actions.resetPassword({ password });
        setFeedback('Your password has been reset. You can sign in now.');
      }
    } catch (cause) {
      const normalized = normalizeFeaturePackError(cause, 'Authentication could not be completed.');
      setError(normalized.message);
      onError?.(normalized);
      // Keep focus near the credentials so the alert is announced next to the action.
      if (requiresPassword) {
        passwordRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='flex min-h-[min(36rem,calc(100dvh-8rem))] items-center justify-center py-2 sm:py-6'>
      <Card className='w-full max-w-md border-border/70 shadow-sm' variant='flat'>
        <CardHeader className='pb-2'>
          <div className='bg-primary text-primary-foreground mb-3 flex size-10 items-center justify-center rounded-lg'>
            <KeyRoundIcon aria-hidden='true' />
          </div>
          <CardTitle>
            <h1 className='text-balance text-base font-semibold tracking-tight lg:text-xl'>
              {copy.title}
            </h1>
          </CardTitle>
          <CardDescription className='text-pretty'>{copy.description}</CardDescription>
        </CardHeader>
        <form noValidate onSubmit={(event) => void submit(event)}>
          <CardContent className='flex flex-col gap-4'>
            {activeNotice ? (
              <Alert variant={activeNotice.status === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{activeNotice.message}</AlertDescription>
              </Alert>
            ) : null}
            <FieldGroup>
              {mode !== 'reset-password' ? (
                <Field
                  error={emailError}
                  htmlFor={`${fieldId}-email`}
                  label='Email address'
                  required
                >
                  <InputGroup>
                    <InputGroupAddon>
                      <MailIcon aria-hidden='true' />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={emailError ? true : undefined}
                      autoComplete='email'
                      autoCapitalize='none'
                      id={`${fieldId}-email`}
                      name='email'
                      onChange={(event) => {
                        setEmail(event.currentTarget.value);
                        if (emailError) setEmailError(undefined);
                      }}
                      ref={emailRef}
                      required
                      spellCheck={false}
                      type='email'
                      value={email}
                    />
                  </InputGroup>
                </Field>
              ) : null}
              {requiresPassword ? (
                <Field
                  description={passwordHint}
                  error={passwordError}
                  htmlFor={`${fieldId}-password`}
                  label={mode === 'reset-password' ? 'New password' : 'Password'}
                  required
                >
                  <InputGroup>
                    <InputGroupAddon>
                      <LockKeyholeIcon aria-hidden='true' />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={passwordError ? true : undefined}
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      id={`${fieldId}-password`}
                      maxLength={requiresStrongPassword ? maxPasswordLength : undefined}
                      minLength={requiresStrongPassword ? minPasswordLength : undefined}
                      name='password'
                      onChange={(event) => {
                        setPassword(event.currentTarget.value);
                        if (passwordError) setPasswordError(undefined);
                      }}
                      ref={passwordRef}
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <InputGroupAddon align='inline-end'>
                      <Button
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className='size-7 p-0'
                        onClick={() => setShowPassword((value) => !value)}
                        size='sm'
                        type='button'
                        variant='ghost'
                      >
                        {showPassword
                          ? <EyeOffIcon aria-hidden='true' />
                          : <EyeIcon aria-hidden='true' />}
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              ) : null}
              {mode === 'sign-in' || mode === 'sign-up' ? (
                <Field orientation='horizontal'>
                  <Checkbox
                    checked={rememberMe}
                    id={`${fieldId}-remember-me`}
                    name='remember-me'
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <FieldLabel htmlFor={`${fieldId}-remember-me`}>
                    Keep me signed in on this device
                  </FieldLabel>
                </Field>
              ) : null}
            </FieldGroup>
            {error ? (
              <Alert role='alert' variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {feedback ? (
              <Alert>
                <AlertDescription>{feedback}</AlertDescription>
              </Alert>
            ) : null}
            {!allowed ? (
              <p className='text-muted-foreground text-pretty text-sm'>
                This authentication action is unavailable for the current app.
              </p>
            ) : null}
            <Button
              aria-busy={pending}
              disabled={!allowed || pending}
              type='submit'
            >
              {pending ? copy.pending : copy.submit}
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
