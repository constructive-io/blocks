import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../components/dialog';
import { ModalPortalScope, PortalRoot } from '../components/portal';

const meta: Meta = {
	title: 'UI/Portal',
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * PortalRoot is the shared mount point for overlays; the Storybook preview already
 * renders one inside the themed wrapper. ModalPortalScope marks a subtree as a
 * modal layer so nested floating elements portal to the right container.
 */
export const Overview: Story = {
	render: () => (
		<ModalPortalScope>
			<div className='w-[560px] space-y-4 rounded-md border p-4'>
				<p className='text-sm text-muted-foreground'>
					This subtree is wrapped in <code className='font-mono text-xs'>ModalPortalScope</code> —
					overlays opened from it layer correctly above any parent dialog.
				</p>
				<Dialog>
					<DialogTrigger render={<Button variant='outline' />}>Open nested dialog</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Nested overlay</DialogTitle>
							<DialogDescription>
								Portaled into #portal-root, above the modal scope layer.
							</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
				<div className='rounded-md border border-dashed p-2'>
					<p className='text-xs text-muted-foreground'>PortalRoot marker:</p>
					<PortalRoot />
				</div>
			</div>
		</ModalPortalScope>
	),
};
