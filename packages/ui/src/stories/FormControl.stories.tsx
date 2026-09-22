import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormControl } from '../components/form-control';
import { Input } from '../components/input';

const meta: Meta<typeof FormControl> = {
	title: 'UI/FormControl',
	component: FormControl,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Stacked: Story = {
	render: () => (
		<div className='w-72'>
			<FormControl label='Project name' id='fc-name'>
				<Input defaultValue='production-db' />
			</FormControl>
		</div>
	),
};

export const Floating: Story = {
	render: () => (
		<div className='w-72'>
			<FormControl label='Endpoint URL' id='fc-url' layout='floating'>
				<Input defaultValue='https://db.internal:5432' />
			</FormControl>
		</div>
	),
};

export const WithError: Story = {
	render: () => (
		<div className='w-72'>
			<FormControl label='Slug' id='fc-slug' error='Slug is already taken'>
				<Input defaultValue='acme' aria-invalid />
			</FormControl>
		</div>
	),
};
