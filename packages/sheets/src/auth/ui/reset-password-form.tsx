import * as React from 'react';
import { useForm } from '@tanstack/react-form';
import { CheckCircleIcon } from 'lucide-react';

import { parseGraphQLError } from '../utils/auth-errors';
import { resetPasswordSchema } from '../utils/schemas';
import { Button } from '@constructive-io/ui/button';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthLoadingButton } from './auth-loading-button';
import { AuthScreenHeader } from './auth-screen-header';
import { FormField } from './form-field';
import { PasswordStrength } from './password-strength';

export interface SheetsResetPasswordFormProps {
	resetToken: string;
	roleId?: string;
	onResetPassword: (input: { newPassword: string; resetToken: string; roleId?: string }) => Promise<unknown>;
	onShowLogin?: () => void;
}

export function SheetsResetPasswordForm({
	resetToken,
	roleId,
	onResetPassword,
	onShowLogin,
}: SheetsResetPasswordFormProps) {
	const [error, setError] = React.useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [isSuccess, setIsSuccess] = React.useState(false);

	const form = useForm({
		defaultValues: {
			password: '',
			confirmPassword: '',
			token: resetToken,
		},
		onSubmit: async ({ value }) => {
			setError(null);
			setIsSubmitting(true);

			try {
				const validatedData = resetPasswordSchema.parse(value);
				await onResetPassword({
					newPassword: validatedData.password,
					resetToken: validatedData.token,
					roleId,
				});
				setIsSuccess(true);
			} catch (err) {
				setError(parseGraphQLError(err).message);
			} finally {
				setIsSubmitting(false);
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = resetPasswordSchema.safeParse(value);
				if (!result.success) {
					return result.error.issues.map((issue) => issue.message).join(', ');
				}
				return undefined;
			},
		},
	});

	if (isSuccess) {
		return (
			<div className='space-y-5 text-center'>
				<div className='flex justify-center'>
					<div className='bg-success/10 flex h-12 w-12 items-center justify-center rounded-full'>
						<CheckCircleIcon className='text-success h-6 w-6' />
					</div>
				</div>
				<div className='space-y-1.5'>
					<h3 className='text-lg font-semibold'>Password reset successful</h3>
					<p className='text-muted-foreground text-sm'>
						Your password has been reset successfully. You can now sign in with your new password.
					</p>
				</div>
				{onShowLogin && (
					<div className='pt-1'>
						<Button type='button' onClick={onShowLogin} className='w-full'>
							Sign in
						</Button>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className='space-y-5'>
			<AuthScreenHeader title='Set a new password' description='Enter your new password below' />

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
					name='password'
					validators={{
						onChange: ({ value }) => {
							if (!value) return 'Password is required';
							if (value.length < 8) return 'Password must be at least 8 characters';
							if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
								return 'Password must contain uppercase, lowercase, number, and special character';
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className='space-y-2'>
							<FormField
								field={field}
								label='New Password'
								placeholder='Enter your new password'
								type='password'
							/>
							<PasswordStrength password={field.state.value} />
						</div>
					)}
				</form.Field>

				<form.Field
					name='confirmPassword'
					validators={{
						onChange: ({ value }) => {
							if (!value) return 'Please confirm your password';
							const password = form.getFieldValue('password');
							if (value !== password) return 'Passwords do not match';
							return undefined;
						},
					}}
				>
					{(field) => (
						<FormField
							field={field}
							label='Confirm New Password'
							placeholder='Confirm your new password'
							type='password'
						/>
					)}
				</form.Field>

				<div className='pt-2'>
					<AuthLoadingButton
						type='submit'
						className='w-full'
						isLoading={isSubmitting}
						disabled={!form.state.canSubmit || isSubmitting}
						data-testid='auth-reset-submit'
					>
						Reset Password
					</AuthLoadingButton>
				</div>
			</form>

			{onShowLogin && (
				<div className='text-muted-foreground text-center text-sm'>
					Remember your password?{' '}
					<Button
						variant='link'
						className='text-primary hover:text-primary/80 h-auto p-0 font-medium'
						onClick={onShowLogin}
						type='button'
					>
						Sign in
					</Button>
				</div>
			)}
		</div>
	);
}
