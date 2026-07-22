import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { parseGraphQLError } from '../utils/auth-errors';
import type { RegisterFormData } from '../utils/schemas';
import { registerSchema } from '../utils/schemas';
import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthLoadingButton } from './auth-loading-button';
import { FormField } from './form-field';

export interface SheetsRegisterFormProps {
	onRegister: (formData: RegisterFormData) => Promise<unknown>;
	onShowLogin?: () => void;
	defaultEmail?: string;
}

export function SheetsRegisterForm({ onRegister, onShowLogin, defaultEmail = '' }: SheetsRegisterFormProps) {
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const passwordInputRef = useRef<HTMLInputElement>(null);

	const form = useForm({
		defaultValues: {
			email: defaultEmail,
			password: '',
			confirmPassword: '',
			rememberMe: true,
		},
		onSubmit: async ({ value }) => {
			setError(null);
			setIsSubmitting(true);

			try {
				const validatedData = registerSchema.parse(value);
				await onRegister(validatedData);
			} catch (err) {
				setError(parseGraphQLError(err).message);
			} finally {
				setIsSubmitting(false);
			}
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
				className='space-y-4 px-8 pb-2'
			>
				<AuthErrorAlert error={error} />
				<form.Field name='email'>
					{(field) => (
						<FormField
							field={field}
							label='Email'
							placeholder='Enter your email'
							type='email'
						/>
					)}
				</form.Field>

				<form.Field name='password'>
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

				<form.Field name='confirmPassword'>
					{(field) => (
						<FormField
							field={field}
							label='Confirm Password'
							placeholder='Confirm your password'
							type='password'
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

				<div className='pt-2'>
					<AuthLoadingButton
						type='submit'
						className='w-full'
						isLoading={isSubmitting}
						disabled={isSubmitting}
						data-testid='auth-signup-submit'
					>
						Create Account
					</AuthLoadingButton>
				</div>
			</form>

			{onShowLogin && (
				<div className='border-border/40 border-t pt-5'>
					<p className='text-muted-foreground text-center text-sm'>
						Already have an account?{' '}
						<Button
							variant='link'
							className='text-primary hover:text-primary/80 h-auto p-0 font-medium'
							onClick={onShowLogin}
							type='button'
							data-testid='auth-signup-login-link'
						>
							Sign in
						</Button>
					</p>
				</div>
			)}
		</div>
	);
}
