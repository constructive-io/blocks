import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { UnlinkButton } from '../components/unlink-button';

const meta: Meta<typeof UnlinkButton> = {
	title: 'UI/UnlinkButton',
	component: UnlinkButton,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

function UnlinkDemo() {
	const [state, setState] = useState<'idle' | 'unlinking' | 'done'>('idle');
	return (
		<div className='flex items-center gap-3'>
			<span className='rounded-md border px-2 py-1 font-mono text-xs'>order_4471</span>
			{state === 'done' ? (
				<span className='text-xs text-muted-foreground'>Unlinked</span>
			) : (
				<UnlinkButton
					isUnlinking={state === 'unlinking'}
					onUnlink={() => {
						setState('unlinking');
						setTimeout(() => setState('done'), 900);
					}}
				/>
			)}
		</div>
	);
}

export const Default: Story = {
	render: () => <UnlinkButton onUnlink={() => {}} />,
};

export const Unlinking: Story = {
	render: () => <UnlinkButton isUnlinking onUnlink={() => {}} />,
};

export const Disabled: Story = {
	render: () => <UnlinkButton disabled onUnlink={() => {}} />,
};

export const Interactive: Story = {
	render: () => <UnlinkDemo />,
};
