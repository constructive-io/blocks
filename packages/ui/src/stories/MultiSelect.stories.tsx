import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatabaseIcon, KeyIcon, TableIcon, UsersIcon } from 'lucide-react';

import { MultiSelect, type MultiSelectGroup, type MultiSelectOption } from '../components/multi-select';

const meta: Meta<typeof MultiSelect> = {
	title: 'UI/MultiSelect',
	component: MultiSelect,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const RESOURCES: MultiSelectOption[] = [
	{ value: 'tables', label: 'Tables', icon: TableIcon },
	{ value: 'views', label: 'Views', icon: DatabaseIcon },
	{ value: 'roles', label: 'Roles', icon: UsersIcon },
	{ value: 'keys', label: 'API keys', icon: KeyIcon },
	{ value: 'audit', label: 'Audit log', disabled: true },
];

const GROUPED: MultiSelectGroup[] = [
	{
		heading: 'Data',
		options: [
			{ value: 'tables', label: 'Tables' },
			{ value: 'views', label: 'Views' },
			{ value: 'functions', label: 'Functions' },
		],
	},
	{
		heading: 'Access',
		options: [
			{ value: 'roles', label: 'Roles' },
			{ value: 'policies', label: 'Policies' },
		],
	},
];

export const Default: Story = {
	render: () => (
		<div className='w-80'>
			<MultiSelect options={RESOURCES} onValueChange={() => {}} placeholder='Select resources' />
		</div>
	),
};

export const WithSelection: Story = {
	render: () => (
		<div className='w-80'>
			<MultiSelect
				options={RESOURCES}
				defaultValue={['tables', 'roles', 'views', 'keys']}
				onValueChange={() => {}}
				maxCount={2}
			/>
		</div>
	),
};

export const Grouped: Story = {
	render: () => (
		<div className='w-80'>
			<MultiSelect options={GROUPED} onValueChange={() => {}} placeholder='Select resources' />
		</div>
	),
};

export const SelectionEcho: Story = {
	render: () => {
		const [value, setValue] = useState<string[]>(['tables']);
		return (
			<div className='w-80 space-y-2'>
				<MultiSelect
					options={RESOURCES}
					defaultValue={value}
					onValueChange={setValue}
					placeholder='Select resources'
				/>
				<p className='font-mono text-xs text-muted-foreground'>[{value.join(', ')}]</p>
			</div>
		);
	},
};

export const Disabled: Story = {
	render: () => (
		<div className='w-80'>
			<MultiSelect options={RESOURCES} defaultValue={['tables']} onValueChange={() => {}} disabled />
		</div>
	),
};
