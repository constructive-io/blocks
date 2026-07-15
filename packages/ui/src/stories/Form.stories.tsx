import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, Toaster } from 'sonner';

import { Button } from '../components/button';
import { Checkbox } from '../components/checkbox';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../components/form';
import { Input } from '../components/input';
import { RadioGroup, RadioGroupItem } from '../components/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select';
import { Separator } from '../components/separator';
import { Switch } from '../components/switch';
import { Textarea } from '../components/textarea';

// =============================================================================
// Schema Definition
// =============================================================================

const formSchema = z
	.object({
		// Account Information
		firstName: z.string().min(1, 'First name is required'),
		lastName: z.string().min(1, 'Last name is required'),
		email: z.string().email('Please enter a valid email address'),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string(),

		// Preferences
		theme: z.enum(['light', 'dark', 'system']),
		language: z.string().min(1, 'Please select a language'),
		notifications: z.boolean(),
		marketing: z.boolean(),

		// Profile
		bio: z.string().max(160, 'Bio must not exceed 160 characters').optional(),
		website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),

		// Terms
		terms: z.boolean().refine((val) => val === true, {
			message: 'You must accept the terms and conditions',
		}),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type FormValues = z.infer<typeof formSchema>;

// =============================================================================
// Form Demo Component
// =============================================================================

function CompleteFormDemo() {
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			firstName: '',
			lastName: '',
			email: '',
			password: '',
			confirmPassword: '',
			theme: 'system',
			language: '',
			notifications: true,
			marketing: false,
			bio: '',
			website: '',
			terms: false,
		},
		mode: 'onBlur',
	});

	const onSubmit = (data: FormValues) => {
		console.log('Form submitted:', data);
		toast.success('Account created successfully!', {
			description: `Welcome, ${data.firstName}! Check console for full data.`,
		});
	};

	return (
		<div className="mx-auto max-w-2xl">
			<Toaster position="top-right" richColors />

			{/* Header */}
			<div className="mb-8">
				<h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
				<p className="text-muted-foreground mt-2">
					Fill out the form below to get started. All fields marked with * are required.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					{/* =========================================================
					    Section 1: Account Information
					    ========================================================= */}
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold">Account Information</h2>
							<p className="text-muted-foreground text-sm">Your basic account details</p>
						</div>

						{/* Name Fields - Side by Side */}
						<div className="grid grid-cols-2 gap-4 items-start">
							<FormField
								control={form.control}
								name="firstName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>First Name *</FormLabel>
										<FormControl>
											<Input placeholder="John" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="lastName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Last Name *</FormLabel>
										<FormControl>
											<Input placeholder="Doe" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Email */}
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email *</FormLabel>
									<FormControl>
										<Input type="email" placeholder="john@example.com" {...field} />
									</FormControl>
									<FormDescription>We'll use this to send you important updates.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Password Fields */}
						<div className="grid grid-cols-2 gap-4 items-start">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password *</FormLabel>
										<FormControl>
											<Input type="password" placeholder="••••••••" {...field} />
										</FormControl>
										<FormDescription>Minimum 8 characters</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm Password *</FormLabel>
										<FormControl>
											<Input type="password" placeholder="••••••••" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<Separator />

					{/* =========================================================
					    Section 2: Preferences
					    ========================================================= */}
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold">Preferences</h2>
							<p className="text-muted-foreground text-sm">Customize your experience</p>
						</div>

						{/* Theme Selection - Radio Group */}
						<FormField
							control={form.control}
							name="theme"
							render={({ field }) => (
								<FormItem className="space-y-3">
									<FormLabel>Theme *</FormLabel>
									<FormControl>
										<RadioGroup
											onValueChange={field.onChange}
											defaultValue={field.value}
											className="flex gap-4"
										>
											<FormItem className="flex items-center space-x-2 space-y-0">
												<FormControl>
													<RadioGroupItem value="light" />
												</FormControl>
												<FormLabel className="cursor-pointer font-normal">Light</FormLabel>
											</FormItem>
											<FormItem className="flex items-center space-x-2 space-y-0">
												<FormControl>
													<RadioGroupItem value="dark" />
												</FormControl>
												<FormLabel className="cursor-pointer font-normal">Dark</FormLabel>
											</FormItem>
											<FormItem className="flex items-center space-x-2 space-y-0">
												<FormControl>
													<RadioGroupItem value="system" />
												</FormControl>
												<FormLabel className="cursor-pointer font-normal">System</FormLabel>
											</FormItem>
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Language Selection - Select */}
						<FormField
							control={form.control}
							name="language"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Language *</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a language" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="en">English</SelectItem>
											<SelectItem value="es">Spanish</SelectItem>
											<SelectItem value="fr">French</SelectItem>
											<SelectItem value="de">German</SelectItem>
											<SelectItem value="ja">Japanese</SelectItem>
											<SelectItem value="zh">Chinese</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>This will be used throughout the application.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Notification Toggles - Switch */}
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="notifications"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">Push Notifications</FormLabel>
											<FormDescription>
												Receive notifications about account activity and updates.
											</FormDescription>
										</div>
										<FormControl>
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="marketing"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">Marketing Emails</FormLabel>
											<FormDescription>
												Receive emails about new features, tips, and promotions.
											</FormDescription>
										</div>
										<FormControl>
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
					</div>

					<Separator />

					{/* =========================================================
					    Section 3: Profile
					    ========================================================= */}
					<div className="space-y-6">
						<div>
							<h2 className="text-lg font-semibold">Profile</h2>
							<p className="text-muted-foreground text-sm">Tell us about yourself</p>
						</div>

						{/* Bio - Textarea */}
						<FormField
							control={form.control}
							name="bio"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Bio</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Tell us a little bit about yourself..."
											className="min-h-[100px] resize-none"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{field.value?.length || 0}/160 characters
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Website - URL Input */}
						<FormField
							control={form.control}
							name="website"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Website</FormLabel>
									<FormControl>
										<Input type="url" placeholder="https://example.com" {...field} />
									</FormControl>
									<FormDescription>Your personal or company website.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<Separator />

					{/* =========================================================
					    Section 4: Terms & Submit
					    ========================================================= */}
					<div className="space-y-6">
						{/* Terms Checkbox */}
						<FormField
							control={form.control}
							name="terms"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3 space-y-0">
									<FormControl>
										<Checkbox checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel>Accept terms and conditions *</FormLabel>
										<FormDescription>
											By checking this box, you agree to our{' '}
											<a href="#" className="text-primary underline underline-offset-4">
												Terms of Service
											</a>{' '}
											and{' '}
											<a href="#" className="text-primary underline underline-offset-4">
												Privacy Policy
											</a>
											.
										</FormDescription>
										<FormMessage />
									</div>
								</FormItem>
							)}
						/>

						{/* Submit Buttons */}
						<div className="flex gap-4">
							<Button type="submit" className="flex-1">
								Create Account
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset()}
							>
								Reset
							</Button>
						</div>
					</div>
				</form>
			</Form>

			{/* Debug: Show form state */}
			<div className="mt-8 rounded-lg border bg-muted/50 p-4">
				<p className="text-muted-foreground mb-2 text-sm font-medium">Form State (for debugging)</p>
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span className="text-muted-foreground">Valid:</span>{' '}
						<span className={form.formState.isValid ? 'text-green-600' : 'text-red-600'}>
							{form.formState.isValid ? 'Yes' : 'No'}
						</span>
					</div>
					<div>
						<span className="text-muted-foreground">Dirty:</span>{' '}
						{form.formState.isDirty ? 'Yes' : 'No'}
					</div>
					<div>
						<span className="text-muted-foreground">Submitting:</span>{' '}
						{form.formState.isSubmitting ? 'Yes' : 'No'}
					</div>
					<div>
						<span className="text-muted-foreground">Errors:</span>{' '}
						{Object.keys(form.formState.errors).length}
					</div>
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// Storybook Meta & Stories
// =============================================================================

const meta: Meta<typeof Form> = {
	title: 'UI/Form',
	component: Form,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A comprehensive form example demonstrating all form components working together
 * with react-hook-form and zod validation.
 *
 * **Features demonstrated:**
 * - `Form` wrapper (FormProvider from react-hook-form)
 * - `FormField` with control, name, and render props
 * - `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`
 * - Integration with Input, Textarea, Select, RadioGroup, Switch, Checkbox
 * - Zod schema validation with custom error messages
 * - Cross-field validation (password confirmation)
 * - Real-time validation feedback
 * - Toast notifications on submit
 * - Form reset functionality
 *
 * **Try it out:**
 * 1. Submit the empty form to see validation errors
 * 2. Fill out fields and watch errors clear
 * 3. Enter mismatched passwords to see cross-field validation
 * 4. Successfully submit to see the toast notification
 * 5. Click Reset to clear the form
 */
export const CompleteForm: Story = {
	render: () => <CompleteFormDemo />,
};
