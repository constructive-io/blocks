import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../components/button';
import { InputOtp } from '../components/input-otp';

const meta: Meta<typeof InputOtp> = {
	title: 'UI/InputOtp',
	component: InputOtp,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		length: 6,
		groupEvery: 3,
		size: 'default',
		isInvalid: false,
		isDisabled: false,
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState('');
		return (
			<div className="w-[360px] space-y-2">
				<InputOtp {...args} value={value} onChange={setValue} aria-label="Verification code" />
				<p className="font-mono text-xs text-muted-foreground">{value || 'Type, paste, or autofill a code'}</p>
			</div>
		);
	},
};

export const Small: Story = {
	args: { size: 'sm' },
	render: Default.render,
};

export const Ungrouped: Story = {
	args: { groupEvery: undefined },
	render: Default.render,
};

export const FourDigits: Story = {
	args: { length: 4, groupEvery: undefined },
	render: Default.render,
};

export const Invalid: Story = {
	render: () => (
		<div className="w-[360px] space-y-2">
			<InputOtp defaultValue="000000" groupEvery={3} isInvalid aria-label="Verification code" />
			<p role="alert" className="text-xs text-destructive">
				That code didn’t work. Check the message and try again.
			</p>
		</div>
	),
};

export const Disabled: Story = {
	render: () => <InputOtp defaultValue="123456" groupEvery={3} isDisabled aria-label="Verification code" />,
};

/** Submits on completion as well as on the button, the way a verification step usually works. */
export const VerifyForm: Story = {
	render: function VerifyFormStory() {
		const [code, setCode] = useState('');
		const [status, setStatus] = useState<'idle' | 'verified' | 'wrong'>('idle');
		const verify = (value: string) => setStatus(value === '123456' ? 'verified' : 'wrong');
		return (
			<form
				className="w-[360px] space-y-3"
				onSubmit={(event) => {
					event.preventDefault();
					verify(code);
				}}
			>
				<p className="text-sm text-muted-foreground">Enter 123456 to verify.</p>
				<div className="flex items-center gap-3">
					<InputOtp
						size="sm"
						groupEvery={3}
						value={code}
						onChange={(next) => {
							setCode(next);
							setStatus('idle');
						}}
						onComplete={verify}
						isInvalid={status === 'wrong'}
						aria-label="Verification code"
					/>
					<Button type="submit" size="sm" className="h-9" disabled={!/^\d{6}$/.test(code)}>
						Verify
					</Button>
				</div>
				<p role="status" className="text-xs text-muted-foreground">
					{status === 'verified' ? 'Verified.' : status === 'wrong' ? 'That code didn’t work.' : '\u00a0'}
				</p>
			</form>
		);
	},
};
