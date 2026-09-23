'use client';

import { useCallback, useId, type FormEvent } from 'react';
import {
  CheckIcon,
  CircleAlertIcon,
  CircleDashedIcon,
  Loader2Icon,
  PlusIcon,
  SmartphoneIcon,
  StarIcon,
  Trash2Icon
} from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { InputOtp } from '@constructive-io/ui/input-otp';
import { CountryFlag, formatPhoneNumber, PhoneInput, type PhoneCountry } from '@constructive-io/ui/phone-input';
import { Skeleton } from '@constructive-io/ui/skeleton';
import { cn } from '@/lib/utils';

import type {
  AccountPhoneNumber,
  AccountPhoneNumbersBusy,
  AccountPhoneNumbersCodeEntry,
  AccountPhoneNumbersFeedback
} from './account-phone-numbers-contracts';
import {
  interpolateAccountPhoneNumbersMessage as interpolate,
  mergeAccountPhoneNumbersMessages,
  type AccountPhoneNumbersMessageOverrides,
  type AccountPhoneNumbersMessages
} from './messages';

export type AccountPhoneNumbersViewProps = {
  /** `null` until the first list load succeeds. */
  phones: readonly AccountPhoneNumber[] | null;
  loading: boolean;
  /** The backend has no phone support: a quiet notice replaces the list. */
  unavailable?: boolean;
  feedback?: AccountPhoneNumbersFeedback;
  /** E.164, or '' when empty. */
  draft: string;
  busy?: AccountPhoneNumbersBusy;
  codeEntry?: AccountPhoneNumbersCodeEntry;
  codeLength?: number;
  defaultCountry?: PhoneCountry;
  messages?: AccountPhoneNumbersMessageOverrides;
  className?: string;
  onDraftChange: (value: string) => void;
  onCodeChange: (code: string) => void;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onSendCode: (phone: AccountPhoneNumber) => void;
  onVerify: (phone: AccountPhoneNumber, event: FormEvent<HTMLFormElement>) => void;
  onCancelCode: () => void;
  onRemove: (phone: AccountPhoneNumber) => void;
  onRetry: () => void;
};

type RowAction = Extract<AccountPhoneNumbersBusy, { scope: 'phone' }>['action'];

const spinner = <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden />;
/**
 * The add field sits on the panel's 16px inset (10px in a narrow panel); its country picker then pads its flag by
 * 1px border + 12px.
 */
const inset = 'px-4 @max-xs/phones:px-2.5';
/**
 * Rows put their flag on the picker flag's column (16 + 1 + 12 = 29px, or 23px narrow) and use the picker's
 * flag→code gap, so each number's calling code lands exactly under the picker's: one optical axis instead of two
 * edges 13px apart.
 */
const rowInset = 'ps-[29px] pe-4 @max-xs/phones:ps-[23px] @max-xs/phones:pe-2.5';
const lead = 'gap-2';
/** Text under a number starts where the number does (18px flag + 8px gap) once the panel is wide enough. */
const indent = '@sm/phones:ps-6.5';
/** Every inline message is one quiet line in the same slot and size as the helper text it replaces. */
const helper = 'text-xs text-pretty';
/** Entrances use @starting-style, so they need no animation library and settle instantly with reduced motion. */
const enter = 'transition-[opacity,translate] duration-200 ease-out starting:opacity-0 motion-reduce:transition-none';
const DIGITS = /^\d+$/;

function StatusRegion({ notice }: { notice?: string }) {
  return notice ? (
    <p role="status" className="sr-only">
      {notice}
    </p>
  ) : null;
}

/** Quiet labels on the number's own line; each leads with its icon, which is also what separates them. */
function PhoneStatus({
  phone,
  justVerified,
  messages
}: {
  phone: AccountPhoneNumber;
  justVerified: boolean;
  messages: AccountPhoneNumbersMessages;
}) {
  return (
    <span
      // Remounts when verification flips, so the new label can fade in once.
      key={phone.isVerified ? 'verified' : 'unverified'}
      className={cn(
        'flex items-center gap-3 text-xs [&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:stroke-[2.5]',
        justVerified && cn(enter, 'duration-300')
      )}
    >
      {phone.isVerified ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <CheckIcon className="text-success" aria-hidden />
          <span>{messages.verified}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-warning-foreground">
          <CircleDashedIcon aria-hidden />
          <span>{messages.unverified}</span>
        </span>
      )}
      {phone.isPrimary ? (
        <span className="flex items-center gap-1 text-muted-foreground">
          <StarIcon className="fill-current" aria-hidden />
          <span>{messages.primary}</span>
        </span>
      ) : null}
    </span>
  );
}

function CodeEntryForm({
  phone,
  display,
  code,
  codeLength,
  error,
  rowBusy,
  messages,
  onCodeChange,
  onVerify,
  onCancel,
  onResend
}: {
  phone: AccountPhoneNumber;
  display: string;
  code: string;
  codeLength: number;
  error?: string;
  rowBusy?: RowAction;
  messages: AccountPhoneNumbersMessages;
  onCodeChange: (code: string) => void;
  onVerify: (phone: AccountPhoneNumber, event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onResend: () => void;
}) {
  const hintId = useId();
  // Stable, so it runs once when the field mounts rather than stealing focus on every keystroke.
  const focusFirstDigit = useCallback((node: HTMLDivElement | null) => node?.querySelector('input')?.focus(), []);
  const complete = code.length === codeLength && DIGITS.test(code);

  return (
    <form className={cn('mt-3 space-y-2.5 starting:-translate-y-1', indent, enter)} onSubmit={(event) => onVerify(phone, event)}>
      <p id={hintId} className={cn(helper, 'tabular-nums text-muted-foreground')}>
        {/* No-break spaces keep the number on one line when the hint wraps. */}
        {interpolate(messages.codeHint, { length: codeLength, number: display.replace(/ /g, '\u00a0') })}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <InputOtp
          ref={focusFirstDigit}
          size="sm"
          length={codeLength}
          groupEvery={codeLength % 3 === 0 ? 3 : undefined}
          className="max-w-[16rem]"
          value={code}
          onChange={onCodeChange}
          isInvalid={Boolean(error)}
          isDisabled={rowBusy === 'verify'}
          aria-label={messages.codeLabel}
          aria-describedby={hintId}
        />
        <div className="flex items-center gap-1">
          {/* 36px, the height of the code boxes beside them. */}
          <Button type="submit" size="sm" className="h-9" disabled={Boolean(rowBusy) || !complete}>
            {rowBusy === 'verify' ? spinner : null}
            {rowBusy === 'verify' ? messages.verifyingButton : messages.verifyButton}
          </Button>
          <Button size="sm" variant="ghost" className="h-9 text-muted-foreground" disabled={Boolean(rowBusy)} onClick={onCancel}>
            {messages.cancelButton}
          </Button>
        </div>
      </div>
      <p role={error ? 'alert' : undefined} className={cn(helper, error ? 'text-destructive' : 'text-muted-foreground')}>
        {error ?? messages.codeHelp}{' '}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-64"
          disabled={Boolean(rowBusy)}
          onClick={onResend}
        >
          {rowBusy === 'send' ? messages.sendingCodeButton : messages.resendCodeButton}
        </button>
      </p>
    </form>
  );
}

function PhoneRow({
  phone,
  feedback,
  rowBusy,
  code,
  codeLength,
  messages,
  onCodeChange,
  onSendCode,
  onVerify,
  onCancelCode,
  onRemove
}: {
  phone: AccountPhoneNumber;
  feedback?: AccountPhoneNumbersFeedback;
  rowBusy?: RowAction;
  /** Set while this row's code field is open. */
  code?: string;
  codeLength: number;
  messages: AccountPhoneNumbersMessages;
} & Pick<AccountPhoneNumbersViewProps, 'onCodeChange' | 'onSendCode' | 'onVerify' | 'onCancelCode' | 'onRemove'>) {
  const display = formatPhoneNumber(phone.number);
  const codeOpen = !phone.isVerified && code !== undefined;
  const error = feedback?.error;

  return (
    <li className={cn('py-3', rowInset)} data-slot="account-phone-number">
      <div className={cn('flex items-center', lead)}>
        {/* The one thing that differs between rows is where the number is from, so that leads. */}
        <CountryFlag number={phone.number} />
        {/* One line; the labels drop under the number only when the row runs out of room. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <p className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">{display}</p>
          <PhoneStatus phone={phone} justVerified={Boolean(feedback?.notice) && phone.isVerified} messages={messages} />
        </div>
        {/* -me pulls the trash glyph onto the row's text edge; its button padding is air. */}
        <div className="-me-1.5 flex shrink-0 items-center gap-1">
          {!phone.isVerified && !codeOpen ? (
            <Button
              size="xs"
              variant="outline"
              // Narrow panels: a compact button so the number, not the action, keeps the room.
              className="@max-xs/phones:h-6 @max-xs/phones:px-2"
              disabled={Boolean(rowBusy)}
              onClick={() => onSendCode(phone)}
            >
              {rowBusy === 'send' ? spinner : null}
              {rowBusy === 'send' ? messages.sendingCodeButton : messages.sendCodeButton}
            </Button>
          ) : null}
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
            disabled={Boolean(rowBusy)}
            onClick={() => onRemove(phone)}
            aria-label={interpolate(messages.removeLabel, { number: display })}
          >
            {rowBusy === 'remove' ? spinner : <Trash2Icon aria-hidden />}
          </Button>
        </div>
      </div>

      <StatusRegion notice={feedback?.notice} />

      {codeOpen ? (
        <CodeEntryForm
          phone={phone}
          display={display}
          code={code}
          codeLength={codeLength}
          error={error}
          rowBusy={rowBusy}
          messages={messages}
          onCodeChange={onCodeChange}
          onVerify={onVerify}
          onCancel={onCancelCode}
          onResend={() => onSendCode(phone)}
        />
      ) : error ? (
        <p role="alert" className={cn(helper, 'mt-2 text-destructive', indent)}>
          {error}
        </p>
      ) : null}
    </li>
  );
}

function AddPhoneForm({
  draft,
  error,
  adding,
  disabled,
  primary,
  defaultCountry,
  messages,
  onDraftChange,
  onAdd
}: {
  draft: string;
  error?: string;
  adding: boolean;
  disabled: boolean;
  /** The first number is the main action, so its button carries the primary style. */
  primary: boolean;
  defaultCountry?: PhoneCountry;
  messages: AccountPhoneNumbersMessages;
} & Pick<AccountPhoneNumbersViewProps, 'onDraftChange' | 'onAdd'>) {
  const id = useId();
  return (
    <form className={cn('space-y-1.5 bg-muted/40 py-3', inset)} onSubmit={onAdd}>
      <label htmlFor={id} className="sr-only">
        {messages.addLabel}
      </label>
      <div className="flex gap-2">
        <PhoneInput
          id={id}
          className="flex-1"
          placeholder={messages.addPlaceholder}
          autoComplete="tel"
          value={draft}
          onChange={onDraftChange}
          defaultCountry={defaultCountry}
          disabled={adding || disabled}
          invalid={Boolean(error)}
          labels={messages.phoneInput}
          aria-describedby={`${id}-hint`}
        />
        <Button
          type="submit"
          size="sm"
          variant={primary ? 'default' : 'outline'}
          // Stretch to the field's height at every breakpoint instead of a fixed 32px.
          className="h-auto self-stretch @max-xs/phones:px-2"
          disabled={adding || disabled || !draft}
        >
          {adding ? spinner : <PlusIcon aria-hidden />}
          {/* In a narrow panel the number needs the room; the icon carries the action. */}
          <span className="@max-xs/phones:sr-only">{adding ? messages.addingButton : messages.addButton}</span>
        </Button>
      </div>
      <p
        id={`${id}-hint`}
        role={error ? 'alert' : undefined}
        className={cn(helper, error ? 'text-destructive' : 'text-muted-foreground')}
      >
        {error ?? messages.addHint}
      </p>
    </form>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div role="status" className="divide-y divide-border/60">
      <span className="sr-only">{label}</span>
      {[0, 1].map((row) => (
        <div key={row} className={cn('flex h-13 items-center', lead, rowInset)} aria-hidden>
          <Skeleton className="h-3 w-4.5 rounded-[2px]" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ messages }: { messages: AccountPhoneNumbersMessages }) {
  return (
    <div className={cn('flex items-start py-3.5', lead, rowInset)}>
      {/* The same 18px slot a flag takes, so the first number added lands where this text sits. */}
      <span className="flex h-5 w-4.5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
        <SmartphoneIcon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{messages.emptyTitle}</p>
        <p className="text-xs text-muted-foreground">{messages.emptyDescription}</p>
      </div>
    </div>
  );
}

/** Controlled presentation for every state of the phone numbers card; pair it with `useAccountPhoneNumbers`. */
export function AccountPhoneNumbersView({
  phones,
  loading,
  unavailable = false,
  feedback,
  draft,
  busy,
  codeEntry,
  codeLength = 6,
  defaultCountry,
  messages: messageOverrides,
  className,
  onDraftChange,
  onCodeChange,
  onAdd,
  onSendCode,
  onVerify,
  onCancelCode,
  onRemove,
  onRetry
}: AccountPhoneNumbersViewProps) {
  const messages = mergeAccountPhoneNumbersMessages(messageOverrides);
  const cardFeedback = feedback?.scope === 'card' ? feedback : undefined;
  const empty = phones !== null && phones.length === 0;

  return (
    <Card className={cn('gap-5', className)} data-slot="account-phone-numbers">
      <CardHeader className="gap-1">
        <CardTitle className="text-sm font-medium leading-5 tracking-normal">{messages.title}</CardTitle>
        <CardDescription>{messages.description}</CardDescription>
      </CardHeader>

      {/* One measure for everything inside: rows, code entry and the add field share a width, so each action stays
          a short reach from its number on any screen. 36rem fits the widest row (the code entry, ~31rem) with room
          for longer labels; box-content keeps the card's own padding outside it. */}
      <CardContent className="box-content max-w-xl space-y-3">
        {cardFeedback?.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            {/* The alert pins its icon to the first text line, so the row is top-aligned rather than centred on the
                28px button; -3px margins centre the button on that 22.75px line without making the row taller. */}
            <AlertDescription className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <span>{cardFeedback.error}</span>
              {phones === null ? (
                <Button size="xs" variant="outline" className="-my-[3px]" onClick={onRetry} disabled={loading}>
                  {loading ? spinner : null}
                  {messages.retryButton}
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        <StatusRegion notice={cardFeedback?.notice} />

        {unavailable ? (
          <Alert>
            <CircleAlertIcon aria-hidden />
            <AlertDescription>{messages.unavailable}</AlertDescription>
          </Alert>
        ) : (
          // One surface: the numbers you have, then the way to add another. Its 8px radius sits inside the card's
          // 10px; overflow clips the footer tint to the corners.
          <div className="@container/phones divide-y divide-border/60 overflow-hidden rounded-md border border-border/70 bg-card">
            {phones === null && loading ? <LoadingRows label={messages.loadingLabel} /> : null}
            {empty ? <EmptyRow messages={messages} /> : null}
            {phones && phones.length > 0 ? (
              <ul aria-busy={loading || undefined} className="divide-y divide-border/60">
                {phones.map((phone) => (
                  <PhoneRow
                    key={phone.id}
                    phone={phone}
                    feedback={feedback?.scope === 'phone' && feedback.phoneId === phone.id ? feedback : undefined}
                    rowBusy={busy?.scope === 'phone' && busy.phoneId === phone.id ? busy.action : undefined}
                    code={codeEntry?.phoneId === phone.id ? codeEntry.code : undefined}
                    codeLength={codeLength}
                    messages={messages}
                    onCodeChange={onCodeChange}
                    onSendCode={onSendCode}
                    onVerify={onVerify}
                    onCancelCode={onCancelCode}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            ) : null}
            <AddPhoneForm
              draft={draft}
              error={feedback?.scope === 'add' ? feedback.error : undefined}
              adding={busy?.scope === 'add'}
              disabled={loading}
              primary={empty}
              defaultCountry={defaultCountry}
              messages={messages}
              onDraftChange={onDraftChange}
              onAdd={onAdd}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
