import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { JsonInput } from '../components/json-input';

const meta: Meta<typeof JsonInput> = {
	title: 'UI/JsonInput',
	component: JsonInput,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE = `{
  "name": "production-db",
  "region": "us-east-1",
  "replicas": 2,
  "features": ["rls", "point-in-time-recovery"]
}`;

function JsonDemo({ initial, minLines = 12 }: { initial: string; minLines?: number }) {
	const [value, setValue] = useState(initial);
	return (
		<div className='w-[520px]'>
			<JsonInput value={value} setValue={setValue} minLines={minLines} />
		</div>
	);
}

export const Default: Story = {
	render: () => <JsonDemo initial={SAMPLE} />,
};

export const Empty: Story = {
	render: () => <JsonDemo initial='' minLines={8} />,
};
