import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronRight, Database, Folder, ShieldCheck } from 'lucide-react';

import { Badge } from '../components/badge';
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from '../components/item';

const meta: Meta<typeof Item> = {
	title: 'UI/Item',
	component: Item,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className='w-80'>
			<Item variant='outline'>
				<ItemMedia variant='icon'>
					<Database />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>db-prod-eu-1</ItemTitle>
					<ItemDescription>Postgres 17 · eu-central-1 · 2 vCPU</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Badge variant='success'>Healthy</Badge>
				</ItemActions>
			</Item>
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<ItemGroup className='w-80'>
			<Item>
				<ItemContent>
					<ItemTitle>Default</ItemTitle>
				</ItemContent>
			</Item>
			<Item variant='outline'>
				<ItemContent>
					<ItemTitle>Outline</ItemTitle>
				</ItemContent>
			</Item>
			<Item variant='muted'>
				<ItemContent>
					<ItemTitle>Muted</ItemTitle>
				</ItemContent>
			</Item>
		</ItemGroup>
	),
};

export const Sizes: Story = {
	render: () => (
		<ItemGroup className='w-80'>
			<Item variant='muted' size='default'>
				<ItemMedia variant='icon'>
					<Folder />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Default size</ItemTitle>
					<ItemDescription>Standard row density</ItemDescription>
				</ItemContent>
			</Item>
			<Item variant='muted' size='sm'>
				<ItemMedia variant='icon'>
					<Folder />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Small</ItemTitle>
				</ItemContent>
			</Item>
			<Item variant='muted' size='xs'>
				<ItemContent>
					<ItemTitle>Extra small</ItemTitle>
				</ItemContent>
			</Item>
		</ItemGroup>
	),
};

export const WithSeparator: Story = {
	render: () => (
		<ItemGroup className='w-80'>
			<Item size='sm'>
				<ItemMedia variant='icon'>
					<ShieldCheck />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Policies</ItemTitle>
				</ItemContent>
				<ItemActions>
					<ChevronRight className='size-4 text-muted-foreground' />
				</ItemActions>
			</Item>
			<ItemSeparator />
			<Item size='sm'>
				<ItemMedia variant='icon'>
					<Database />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Tables</ItemTitle>
				</ItemContent>
				<ItemActions>
					<ChevronRight className='size-4 text-muted-foreground' />
				</ItemActions>
			</Item>
		</ItemGroup>
	),
};
