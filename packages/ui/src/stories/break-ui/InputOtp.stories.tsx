import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { InputOtp } from '../../components/input-otp';
import { caption } from './b-fixtures';
import { pickDataset } from './dataset';

const meta: Meta = {
	title: 'Break UI/InputOtp',
	parameters: { breakUi: true },
};
export default meta;

// Backup codes and some authenticator apps issue 8 to 12 digits; ten digits is the widest common SMS-over-voice code.
const demo = { length: 6, groupEvery: 3 as number | undefined, value: '123456' };
const worst = { length: 12, groupEvery: 4 as number | undefined, value: '123456789012' };

function Cell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
	return (
		<div style={{ width, maxWidth: '100%' }}>
			<div style={caption}>{title}</div>
			{children}
		</div>
	);
}

function Otp({
	length,
	groupEvery,
	initial,
	size,
	invalid,
	testId,
}: {
	length: number;
	groupEvery?: number;
	initial: string;
	size?: 'default' | 'sm';
	invalid?: boolean;
	testId: string;
}) {
	const [value, setValue] = useState(initial);
	return (
		<div style={{ display: 'grid', gap: 4 }} data-testid={testId}>
			<InputOtp
				length={length}
				groupEvery={groupEvery}
				value={value}
				onChange={setValue}
				size={size}
				isInvalid={invalid}
				aria-label="Verification code"
			/>
			<code style={{ fontSize: 11 }}>{value || '(empty)'}</code>
		</div>
	);
}

export const Stress: StoryObj = {
	render: (_args, context) => {
		const data = pickDataset(context, { demo, worst });

		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 56 }}>
				<Cell title="Default size, 360px" width={360}>
					<Otp length={data.length} groupEvery={data.groupEvery} initial={data.value} testId="otp-360" />
				</Cell>
				<Cell title="Default size, sidebar 240px, empty" width={240}>
					<Otp length={data.length} groupEvery={data.groupEvery} initial="" testId="otp-240" />
				</Cell>
				<Cell title="Small size, 240px, invalid" width={240}>
					<Otp length={data.length} groupEvery={data.groupEvery} initial={data.value} size="sm" invalid testId="otp-sm" />
				</Cell>
			</div>
		);
	},
};
