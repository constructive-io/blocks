import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from '../components/label';
import { RadioGroup, RadioGroupItem } from '../components/radio-group';

const meta: Meta<typeof RadioGroup> = {
	title: 'UI/RadioGroup',
	component: RadioGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		defaultValue: {
			control: { type: 'text' },
		},
		disabled: {
			control: { type: 'boolean' },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<RadioGroup defaultValue='option-one'>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-one' id='option-one' />
				<Label htmlFor='option-one'>Option One</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-two' id='option-two' />
				<Label htmlFor='option-two'>Option Two</Label>
			</div>
		</RadioGroup>
	),
};

export const WithDescriptions: Story = {
	render: () => (
		<RadioGroup defaultValue='comfortable'>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='default' id='r1' />
				<div className='grid gap-1.5 leading-none'>
					<Label htmlFor='r1'>Default</Label>
					<p className='text-muted-foreground text-xs'>Recommended for most websites</p>
				</div>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='comfortable' id='r2' />
				<div className='grid gap-1.5 leading-none'>
					<Label htmlFor='r2'>Comfortable</Label>
					<p className='text-muted-foreground text-xs'>More space between elements</p>
				</div>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='compact' id='r3' />
				<div className='grid gap-1.5 leading-none'>
					<Label htmlFor='r3'>Compact</Label>
					<p className='text-muted-foreground text-xs'>Less space between elements</p>
				</div>
			</div>
		</RadioGroup>
	),
};

export const Disabled: Story = {
	render: () => (
		<RadioGroup disabled>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-one' id='disabled-1' />
				<Label htmlFor='disabled-1'>Option One</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-two' id='disabled-2' />
				<Label htmlFor='disabled-2'>Option Two</Label>
			</div>
		</RadioGroup>
	),
};

export const WithDisabledItems: Story = {
	render: () => (
		<RadioGroup defaultValue='option-one'>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-one' id='enabled-1' />
				<Label htmlFor='enabled-1'>Available Option</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-two' id='disabled-item' disabled />
				<Label htmlFor='disabled-item' className='text-muted-foreground'>
					Disabled Option
				</Label>
			</div>
			<div className='flex items-center space-x-2'>
				<RadioGroupItem value='option-three' id='enabled-3' />
				<Label htmlFor='enabled-3'>Another Available Option</Label>
			</div>
		</RadioGroup>
	),
};

export const PaymentMethod: Story = {
	render: () => (
		<div className='space-y-4'>
			<h3 className='text-lg font-medium'>Payment Method</h3>
			<RadioGroup defaultValue='card'>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='card' id='card' />
					<Label htmlFor='card' className='flex items-center gap-2'>
						💳 Credit or Debit Card
					</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='paypal' id='paypal' />
					<Label htmlFor='paypal' className='flex items-center gap-2'>
						🟦 PayPal
					</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='apple' id='apple' />
					<Label htmlFor='apple' className='flex items-center gap-2'>
						🍎 Apple Pay
					</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='google' id='google' />
					<Label htmlFor='google' className='flex items-center gap-2'>
						🅿️ Google Pay
					</Label>
				</div>
			</RadioGroup>
		</div>
	),
};

export const PricingPlans: Story = {
	render: () => (
		<div className='space-y-4'>
			<h3 className='text-lg font-medium'>Choose a Plan</h3>
			<RadioGroup defaultValue='pro'>
				<div className='flex items-center space-x-2 rounded-md border p-3'>
					<RadioGroupItem value='free' id='free' />
					<div className='grid flex-1 gap-1.5 leading-none'>
						<Label htmlFor='free' className='text-base font-medium'>
							Free Plan
						</Label>
						<p className='text-muted-foreground text-sm'>Perfect for personal projects</p>
						<p className='text-lg font-bold'>$0/month</p>
					</div>
				</div>
				<div className='flex items-center space-x-2 rounded-md border p-3'>
					<RadioGroupItem value='pro' id='pro' />
					<div className='grid flex-1 gap-1.5 leading-none'>
						<Label htmlFor='pro' className='text-base font-medium'>
							Pro Plan
						</Label>
						<p className='text-muted-foreground text-sm'>Great for small teams</p>
						<p className='text-lg font-bold'>$19/month</p>
					</div>
				</div>
				<div className='flex items-center space-x-2 rounded-md border p-3'>
					<RadioGroupItem value='enterprise' id='enterprise' />
					<div className='grid flex-1 gap-1.5 leading-none'>
						<Label htmlFor='enterprise' className='text-base font-medium'>
							Enterprise Plan
						</Label>
						<p className='text-muted-foreground text-sm'>For large organizations</p>
						<p className='text-lg font-bold'>$99/month</p>
					</div>
				</div>
			</RadioGroup>
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<form className='w-full max-w-md space-y-6'>
			<div className='space-y-3'>
				<h3 className='text-lg font-medium'>Notification Preferences</h3>
				<div className='space-y-4'>
					<div>
						<Label className='text-base font-medium'>Email Frequency</Label>
						<RadioGroup defaultValue='weekly' className='mt-2'>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='daily' id='daily' />
								<Label htmlFor='daily'>Daily</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='weekly' id='weekly' />
								<Label htmlFor='weekly'>Weekly</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='monthly' id='monthly' />
								<Label htmlFor='monthly'>Monthly</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='never' id='never' />
								<Label htmlFor='never'>Never</Label>
							</div>
						</RadioGroup>
					</div>

					<div>
						<Label className='text-base font-medium'>Account Type</Label>
						<RadioGroup defaultValue='personal' className='mt-2'>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='personal' id='personal' />
								<Label htmlFor='personal'>Personal</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='business' id='business' />
								<Label htmlFor='business'>Business</Label>
							</div>
							<div className='flex items-center space-x-2'>
								<RadioGroupItem value='non-profit' id='non-profit' />
								<Label htmlFor='non-profit'>Non-profit</Label>
							</div>
						</RadioGroup>
					</div>
				</div>
			</div>
		</form>
	),
};

export const Horizontal: Story = {
	render: () => (
		<div className='space-y-4'>
			<h3 className='text-lg font-medium'>Size</h3>
			<RadioGroup defaultValue='medium' className='flex space-x-6'>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='small' id='size-small' />
					<Label htmlFor='size-small'>Small</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='medium' id='size-medium' />
					<Label htmlFor='size-medium'>Medium</Label>
				</div>
				<div className='flex items-center space-x-2'>
					<RadioGroupItem value='large' id='size-large' />
					<Label htmlFor='size-large'>Large</Label>
				</div>
			</RadioGroup>
		</div>
	),
};
