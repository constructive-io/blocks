import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { parseGraphQLError } from '../utils/auth-errors';
import type { LoginFormData } from '../utils/schemas';
import { loginSchema } from '../utils/schemas';
import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthLoadingButton } from './auth-loading-button';
import { FormField } from './form-field';

export interface SheetsLoginFormProps {
	onLogin: (credentials: LoginFormData) => Promise<void>;
	onShowForgot?: () => void;
	onShowRegister?: () => void;
	defaultEmail?: string;
}

export function SheetsLoginForm({ onLogin, onShowForgot, onShowRegister, defaultEmail = '' }: SheetsLoginFormProps) {
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const passwordInputRef = useRef<HTMLInputElement>(null);

	const form = useForm({
		defaultValues: {
			email: defaultEmail,
			password: '',
			rememberMe: true,
		},
		onSubmit: async ({ value }) => {
			setError(null);
			setIsSubmitting(true);

			try {
				const validatedData = loginSchema.parse(value);
				await onLogin(validatedData);
			} catch (err) {
				setError(parseGraphQLError(err).message);
			} finally {
				setIsSubmitting(false);
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = loginSchema.safeParse(value);
				if (!result.success) {
					return result.error.issues.map((issue) => issue.message).join(', ');
				}
				return undefined;
			},
		},
	});

	return (
		<div className='space-y-5'>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className='space-y-4 px-8'
			>
				<AuthErrorAlert error={error} />
				<form.Field
					name='email'
					validators={{
						onChange: ({ value }) => {
							if (!value) return 'Email is required';
							if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
							return undefined;
						},
					}}
				>
					{(field) => (
						<FormField
							field={field}
							label='Email'
							placeholder='Enter your email'
							type='email'
						/>
					)}
				</form.Field>

				<form.Field
					name='password'
					validators={{
						onChange: ({ value }) => {
							if (!value) return 'Password is required';
							return undefined;
						},
					}}
				>
					{(field) => (
						<FormField
							field={field}
							label='Password'
							placeholder='Enter your password'
							type='password'
							inputRef={passwordInputRef}
						/>
					)}
				</form.Field>

				<form.Field name='rememberMe'>
					{(field) => (
						<div className='flex items-center space-x-2'>
							<Checkbox
								id='rememberMe'
								checked={field.state.value}
								onCheckedChange={(checked) => {
									field.handleChange(checked === true);
								}}
							/>
							<label
								htmlFor='rememberMe'
								className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
							>
								Remember me
							</label>
						</div>
					)}
				</form.Field>

				<div className='space-y-3 pt-2'>
					<AuthLoadingButton
						type='submit'
						className='w-full'
						isLoading={isSubmitting}
						disabled={isSubmitting}
						data-testid='auth-login-submit'
					>
						Sign In
					</AuthLoadingButton>

					{onShowForgot && (
						<div className='text-center'>
							<Button
								variant='link'
								className='text-muted-foreground hover:text-foreground h-auto p-0 text-sm'
								onClick={onShowForgot}
								type='button'
								data-testid='auth-forgot-link'
							>
								Forgot your password?
							</Button>
						</div>
					)}
				</div>
			</form>

			{onShowRegister && (
				<div className='border-border/40 border-t pt-5'>
					<p className='text-muted-foreground text-center text-sm'>
						Don&apos;t have an account?{' '}
						<Button
							variant='link'
							className='text-primary hover:text-primary/80 h-auto p-0 font-medium'
							onClick={onShowRegister}
							type='button'
						>
							Sign up
						</Button>
					</p>
				</div>
			)}
		</div>
	);
}
