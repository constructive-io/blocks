'use client';

import * as React from 'react';
import { EyeIcon, EyeOffIcon, LockKeyholeIcon, MailIcon } from 'lucide-react';

import { Button } from '../button';
import type { InputProps } from '../input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../input-group';

export type PasswordInputProps = Omit<InputProps, 'type' | 'ref'>;

/** A password input with a lock icon and a show/hide toggle. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(props, ref) {
	const [visible, setVisible] = React.useState(false);
	return (
		<InputGroup>
			<InputGroupAddon>
				<LockKeyholeIcon aria-hidden="true" />
			</InputGroupAddon>
			<InputGroupInput {...props} ref={ref} type={visible ? 'text' : 'password'} />
			<InputGroupAddon align="inline-end">
				<Button
					aria-label={visible ? 'Hide password' : 'Show password'}
					aria-pressed={visible}
					className="size-7 p-0"
					onClick={() => setVisible((value) => !value)}
					size="sm"
					type="button"
					variant="ghost"
				>
					{visible ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
				</Button>
			</InputGroupAddon>
		</InputGroup>
	);
});

export type EmailInputProps = Omit<InputProps, 'type' | 'ref'>;

/** An email input with a mail icon; the password input's sibling on every form. */
export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(function EmailInput(props, ref) {
	return (
		<InputGroup>
			<InputGroupAddon>
				<MailIcon aria-hidden="true" />
			</InputGroupAddon>
			<InputGroupInput autoCapitalize="none" autoComplete="email" spellCheck={false} {...props} ref={ref} type="email" />
		</InputGroup>
	);
});
