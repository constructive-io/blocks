import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Button } from '../components/button';
import { Input } from '../components/input';
import { Label } from '../components/label';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetStackProvider,
	SheetTitle,
	SheetTrigger,
} from '../components/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select';
import { Textarea } from '../components/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';

const meta: Meta<typeof Sheet> = {
	title: 'UI/Sheet',
	component: Sheet,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>Open Sheet</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit Profile</SheetTitle>
					<SheetDescription>Make changes to your profile here. Click save when you&apos;re done.</SheetDescription>
				</SheetHeader>
				<div className='grid gap-4 py-4'>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label htmlFor='name' className='text-right'>
							Name
						</Label>
						<Input id='name' defaultValue='Pedro Duarte' className='col-span-3' />
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label htmlFor='username' className='text-right'>
							Username
						</Label>
						<Input id='username' defaultValue='@peduarte' className='col-span-3' />
					</div>
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button type='submit'>Save changes</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const DifferentSides: Story = {
	render: () => (
		<div className='flex flex-wrap gap-4'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Left Side</Button>
				</SheetTrigger>
				<SheetContent side='left'>
					<SheetHeader>
						<SheetTitle>Left Side Sheet</SheetTitle>
						<SheetDescription>This sheet opens from the left side.</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<p className='text-sm'>Content for left side sheet.</p>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Right Side</Button>
				</SheetTrigger>
				<SheetContent side='right'>
					<SheetHeader>
						<SheetTitle>Right Side Sheet</SheetTitle>
						<SheetDescription>This sheet opens from the right side.</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<p className='text-sm'>Content for right side sheet.</p>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Top Side</Button>
				</SheetTrigger>
				<SheetContent side='top'>
					<SheetHeader>
						<SheetTitle>Top Side Sheet</SheetTitle>
						<SheetDescription>This sheet opens from the top.</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<p className='text-sm'>Content for top side sheet.</p>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Bottom Side</Button>
				</SheetTrigger>
				<SheetContent side='bottom'>
					<SheetHeader>
						<SheetTitle>Bottom Side Sheet</SheetTitle>
						<SheetDescription>This sheet opens from the bottom.</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<p className='text-sm'>Content for bottom side sheet.</p>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	),
};

export const CustomTransition: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>Custom Transition</Button>
			</SheetTrigger>
			<SheetContent
				transition={{
					type: 'spring',
					stiffness: 300,
					damping: 30,
				}}
			>
				<SheetHeader>
					<SheetTitle>Custom Transition</SheetTitle>
					<SheetDescription>
						This sheet uses a custom spring transition with higher stiffness and lower damping.
					</SheetDescription>
				</SheetHeader>
				<div className='py-4'>
					<p className='text-sm'>The animation should feel more bouncy and energetic.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const ContactForm: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>Contact Us</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Get in Touch</SheetTitle>
					<SheetDescription>Send us a message and we&apos;ll get back to you as soon as possible.</SheetDescription>
				</SheetHeader>
				<div className='grid gap-4 py-4'>
					<div className='grid gap-2'>
						<Label htmlFor='contact-name'>Name</Label>
						<Input id='contact-name' placeholder='Your name' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='contact-email'>Email</Label>
						<Input id='contact-email' type='email' placeholder='your@email.com' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='contact-subject'>Subject</Label>
						<Input id='contact-subject' placeholder='What is this about?' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='contact-message'>Message</Label>
						<Textarea id='contact-message' placeholder='Your message...' rows={4} />
					</div>
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button variant='outline'>Cancel</Button>
					</SheetClose>
					<SheetClose asChild>
						<Button type='submit'>Send Message</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const WithoutOverlay: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>No Overlay</Button>
			</SheetTrigger>
			<SheetContent overlay={false}>
				<SheetHeader>
					<SheetTitle>No Overlay Sheet</SheetTitle>
					<SheetDescription>This sheet opens without a backdrop overlay.</SheetDescription>
				</SheetHeader>
				<div className='py-4'>
					<p className='text-sm'>Notice there&apos;s no darkened backdrop behind this sheet.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const SimpleNotification: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>Show Notification</Button>
			</SheetTrigger>
			<SheetContent side='top'>
				<SheetHeader>
					<SheetTitle>🎉 Success!</SheetTitle>
					<SheetDescription>Your changes have been saved successfully.</SheetDescription>
				</SheetHeader>
				<div className='py-4'>
					<p className='text-muted-foreground text-sm'>
						This is a notification-style sheet that slides down from the top.
					</p>
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button variant='outline'>Dismiss</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const MobileMenu: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>☰ Menu</Button>
			</SheetTrigger>
			<SheetContent side='left'>
				<SheetHeader>
					<SheetTitle>Navigation Menu</SheetTitle>
					<SheetDescription>Access all sections of the application.</SheetDescription>
				</SheetHeader>
				<div className='py-4'>
					<nav className='space-y-2'>
						<Button variant='ghost' className='w-full justify-start'>
							🏠 Home
						</Button>
						<Button variant='ghost' className='w-full justify-start'>
							📊 Dashboard
						</Button>
						<Button variant='ghost' className='w-full justify-start'>
							👥 Users
						</Button>
						<Button variant='ghost' className='w-full justify-start'>
							⚙️ Settings
						</Button>
						<Button variant='ghost' className='w-full justify-start'>
							📞 Support
						</Button>
					</nav>
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button variant='outline' className='w-full'>
							Close Menu
						</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const SlideTransition: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>Slide Transition</Button>
			</SheetTrigger>
			<SheetContent
				transition={{
					type: 'tween',
					duration: 0.3,
					ease: 'easeInOut',
				}}
			>
				<SheetHeader>
					<SheetTitle>Slide Animation</SheetTitle>
					<SheetDescription>This sheet uses a smooth slide transition instead of spring physics.</SheetDescription>
				</SheetHeader>
				<div className='py-4'>
					<p className='text-sm'>The animation uses a tween instead of spring for a linear feel.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const QuickActions: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>Quick Actions</Button>
			</SheetTrigger>
			<SheetContent side='bottom'>
				<SheetHeader>
					<SheetTitle>Quick Actions</SheetTitle>
					<SheetDescription>Choose an action to perform.</SheetDescription>
				</SheetHeader>
				<div className='grid grid-cols-2 gap-4 py-4'>
					<Button variant='outline' className='h-20 flex-col'>
						📝
						<span className='mt-2'>Create</span>
					</Button>
					<Button variant='outline' className='h-20 flex-col'>
						📁
						<span className='mt-2'>Upload</span>
					</Button>
					<Button variant='outline' className='h-20 flex-col'>
						📤
						<span className='mt-2'>Share</span>
					</Button>
					<Button variant='outline' className='h-20 flex-col'>
						🗑️
						<span className='mt-2'>Delete</span>
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	),
};

// ============================================================================
// Stacked Sheets Stories
// ============================================================================

export const StackedSheets: Story = {
	render: () => (
		<SheetStackProvider>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open First Sheet</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>First Sheet (Level 1)</SheetTitle>
						<SheetDescription>
							This is the first sheet. Click the button below to open a nested sheet on top.
						</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<p className='text-muted-foreground mb-4 text-sm'>
							When you open the next sheet, this one will slide slightly to the left to indicate there&apos;s
							another sheet underneath.
						</p>

						{/* Nested Sheet */}
						<Sheet>
							<SheetTrigger asChild>
								<Button>Open Second Sheet</Button>
							</SheetTrigger>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Second Sheet (Level 2)</SheetTitle>
									<SheetDescription>
										This sheet is stacked on top of the first one. Notice the first sheet has shifted.
									</SheetDescription>
								</SheetHeader>
								<div className='py-4'>
									<p className='text-muted-foreground mb-4 text-sm'>
										You can continue stacking more sheets. Each new sheet pushes the previous ones.
									</p>

									{/* Third level sheet */}
									<Sheet>
										<SheetTrigger asChild>
											<Button>Open Third Sheet</Button>
										</SheetTrigger>
										<SheetContent>
											<SheetHeader>
												<SheetTitle>Third Sheet (Level 3)</SheetTitle>
												<SheetDescription>This is the third level of nesting.</SheetDescription>
											</SheetHeader>
											<div className='py-4'>
												<p className='text-muted-foreground text-sm'>
													You can see the visual stacking effect with multiple sheets now. Close this sheet
													to see the animation reverse.
												</p>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Close</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Close</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const StackedSheetsLeft: Story = {
	render: () => (
		<SheetStackProvider>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open Left Sheet Stack</Button>
				</SheetTrigger>
				<SheetContent side='left'>
					<SheetHeader>
						<SheetTitle>Navigation Menu</SheetTitle>
						<SheetDescription>Main navigation for the application.</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<nav className='space-y-2'>
							<Button variant='ghost' className='w-full justify-start'>
								Dashboard
							</Button>
							<Button variant='ghost' className='w-full justify-start'>
								Projects
							</Button>

							{/* Settings nested sheet */}
							<Sheet>
								<SheetTrigger asChild>
									<Button variant='ghost' className='w-full justify-start'>
										Settings →
									</Button>
								</SheetTrigger>
								<SheetContent side='left'>
									<SheetHeader>
										<SheetTitle>Settings</SheetTitle>
										<SheetDescription>Configure your preferences.</SheetDescription>
									</SheetHeader>
									<div className='py-4'>
										<nav className='space-y-2'>
											<Button variant='ghost' className='w-full justify-start'>
												General
											</Button>
											<Button variant='ghost' className='w-full justify-start'>
												Security
											</Button>

											{/* Deep nested sheet */}
											<Sheet>
												<SheetTrigger asChild>
													<Button variant='ghost' className='w-full justify-start'>
														Advanced →
													</Button>
												</SheetTrigger>
												<SheetContent side='left'>
													<SheetHeader>
														<SheetTitle>Advanced Settings</SheetTitle>
														<SheetDescription>For power users only.</SheetDescription>
													</SheetHeader>
													<div className='py-4'>
														<div className='space-y-4'>
															<div className='flex items-center justify-between'>
																<Label>Debug Mode</Label>
																<Input type='checkbox' className='h-4 w-4' />
															</div>
															<div className='flex items-center justify-between'>
																<Label>API Logging</Label>
																<Input type='checkbox' className='h-4 w-4' />
															</div>
														</div>
													</div>
													<SheetFooter>
														<SheetClose asChild>
															<Button variant='outline'>Back</Button>
														</SheetClose>
													</SheetFooter>
												</SheetContent>
											</Sheet>
										</nav>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Back</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</nav>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close Menu</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const StackedSheetsWithForm: Story = {
	render: () => (
		<SheetStackProvider>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Create New Item</Button>
				</SheetTrigger>
				<SheetContent className='sm:max-w-md'>
					<SheetHeader>
						<SheetTitle>Create Item</SheetTitle>
						<SheetDescription>Fill in the basic information for your new item.</SheetDescription>
					</SheetHeader>
					<div className='grid gap-4 py-4'>
						<div className='grid gap-2'>
							<Label htmlFor='item-name'>Name</Label>
							<Input id='item-name' placeholder='Enter item name' />
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='item-description'>Description</Label>
							<Textarea id='item-description' placeholder='Describe your item' rows={3} />
						</div>

						{/* Advanced options sheet */}
						<Sheet>
							<SheetTrigger asChild>
								<Button variant='outline' className='w-full'>
									Configure Advanced Options
								</Button>
							</SheetTrigger>
							<SheetContent className='sm:max-w-md'>
								<SheetHeader>
									<SheetTitle>Advanced Options</SheetTitle>
									<SheetDescription>Configure additional settings for your item.</SheetDescription>
								</SheetHeader>
								<div className='grid gap-4 py-4'>
									<div className='grid gap-2'>
										<Label htmlFor='item-category'>Category</Label>
										<Input id='item-category' placeholder='Select category' />
									</div>
									<div className='grid gap-2'>
										<Label htmlFor='item-tags'>Tags</Label>
										<Input id='item-tags' placeholder='Add tags (comma separated)' />
									</div>

									{/* Permissions sheet */}
									<Sheet>
										<SheetTrigger asChild>
											<Button variant='outline' className='w-full'>
												Set Permissions
											</Button>
										</SheetTrigger>
										<SheetContent className='sm:max-w-md'>
											<SheetHeader>
												<SheetTitle>Permissions</SheetTitle>
												<SheetDescription>Control who can access this item.</SheetDescription>
											</SheetHeader>
											<div className='grid gap-4 py-4'>
												<div className='flex items-center justify-between'>
													<Label>Public</Label>
													<Input type='checkbox' className='h-4 w-4' />
												</div>
												<div className='flex items-center justify-between'>
													<Label>Allow Comments</Label>
													<Input type='checkbox' className='h-4 w-4' />
												</div>
												<div className='flex items-center justify-between'>
													<Label>Allow Sharing</Label>
													<Input type='checkbox' className='h-4 w-4' />
												</div>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Cancel</Button>
												</SheetClose>
												<SheetClose asChild>
													<Button>Save Permissions</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Cancel</Button>
									</SheetClose>
									<SheetClose asChild>
										<Button>Save Options</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Cancel</Button>
						</SheetClose>
						<SheetClose asChild>
							<Button type='submit'>Create Item</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const StackedSheetsFourLevels: Story = {
	render: () => (
		<SheetStackProvider>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open 4-Level Stack Demo</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Level 1</SheetTitle>
						<SheetDescription>First sheet in the stack.</SheetDescription>
					</SheetHeader>
					<div className='flex flex-col gap-4 py-4'>
						<div className='bg-muted/50 rounded-lg p-4'>
							<p className='text-muted-foreground text-sm'>
								This demo shows 4 levels of stacked sheets. Each level pushes the previous sheets by 24px,
								creating a visual depth effect.
							</p>
						</div>
						<Sheet>
							<SheetTrigger asChild>
								<Button className='w-full'>Open Level 2</Button>
							</SheetTrigger>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Level 2</SheetTitle>
									<SheetDescription>Second sheet - Level 1 is pushed 24px left.</SheetDescription>
								</SheetHeader>
								<div className='flex flex-col gap-4 py-4'>
									<div className='bg-muted/50 rounded-lg p-4'>
										<p className='text-muted-foreground text-sm'>
											Notice how Level 1 has shifted to reveal there&apos;s a sheet underneath.
										</p>
									</div>
									<Sheet>
										<SheetTrigger asChild>
											<Button className='w-full'>Open Level 3</Button>
										</SheetTrigger>
										<SheetContent>
											<SheetHeader>
												<SheetTitle>Level 3</SheetTitle>
												<SheetDescription>Third sheet - previous sheets pushed further.</SheetDescription>
											</SheetHeader>
											<div className='flex flex-col gap-4 py-4'>
												<div className='bg-muted/50 rounded-lg p-4'>
													<p className='text-muted-foreground text-sm'>
														Level 1 is now pushed 48px, Level 2 is pushed 24px.
													</p>
												</div>
												<Sheet>
													<SheetTrigger asChild>
														<Button className='w-full'>Open Level 4</Button>
													</SheetTrigger>
													<SheetContent>
														<SheetHeader>
															<SheetTitle>Level 4</SheetTitle>
															<SheetDescription>Maximum depth reached!</SheetDescription>
														</SheetHeader>
														<div className='flex flex-col gap-4 py-4'>
															<div className='bg-muted/50 rounded-lg p-4'>
																<p className='text-muted-foreground text-sm'>
																	This is the deepest level. You can see the cascading push effect on all
																	previous sheets. Close sheets in reverse order to see the smooth animation.
																</p>
															</div>
														</div>
														<SheetFooter>
															<SheetClose asChild>
																<Button variant='outline'>Close Level 4</Button>
															</SheetClose>
														</SheetFooter>
													</SheetContent>
												</Sheet>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Close Level 3</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Close Level 2</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close Level 1</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

// ============================================================================
// Collapse Mode Stories - Full-width push for the sheet directly below top
// ============================================================================

export const StackedSheetsCollapse: Story = {
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open Collapse Mode Demo</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Level 1 (Collapse Mode)</SheetTitle>
						<SheetDescription>
							In collapse mode, only the sheet directly below the top gets full-width push.
						</SheetDescription>
					</SheetHeader>
					<div className='flex flex-col gap-4 py-4'>
						<div className='bg-muted/50 rounded-lg p-4'>
							<p className='text-muted-foreground text-sm'>
								When you open Level 2, this sheet will be pushed completely off-screen (full width). This
								creates a clean &quot;replacement&quot; feel while maintaining the stack.
							</p>
						</div>
						<Sheet>
							<SheetTrigger asChild>
								<Button className='w-full'>Open Level 2</Button>
							</SheetTrigger>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Level 2</SheetTitle>
									<SheetDescription>Level 1 is now collapsed (pushed full-width off-screen).</SheetDescription>
								</SheetHeader>
								<div className='flex flex-col gap-4 py-4'>
									<div className='bg-muted/50 rounded-lg p-4'>
										<p className='text-muted-foreground text-sm'>
											Notice Level 1 is completely hidden. When you open Level 3, THIS sheet will collapse.
										</p>
									</div>
									<Sheet>
										<SheetTrigger asChild>
											<Button className='w-full'>Open Level 3</Button>
										</SheetTrigger>
										<SheetContent>
											<SheetHeader>
												<SheetTitle>Level 3</SheetTitle>
												<SheetDescription>Level 2 is now collapsed. Level 1 has a small indent.</SheetDescription>
											</SheetHeader>
											<div className='flex flex-col gap-4 py-4'>
												<div className='bg-muted/50 rounded-lg p-4'>
													<p className='text-muted-foreground text-sm'>
														In collapse mode with 3 levels: Level 2 (directly below) is full-width pushed,
														Level 1 has 24px indent relative to Level 2.
													</p>
												</div>
												<Sheet>
													<SheetTrigger asChild>
														<Button className='w-full'>Open Level 4</Button>
													</SheetTrigger>
													<SheetContent>
														<SheetHeader>
															<SheetTitle>Level 4</SheetTitle>
															<SheetDescription>Maximum depth in collapse mode.</SheetDescription>
														</SheetHeader>
														<div className='flex flex-col gap-4 py-4'>
															<div className='bg-muted/50 rounded-lg p-4'>
																<p className='text-muted-foreground text-sm'>
																	Level 3 is now collapsed. Level 2 has 24px indent. Level 1 has 48px indent.
																	Close this to see Level 3 animate back from full-width.
																</p>
															</div>
														</div>
														<SheetFooter>
															<SheetClose asChild>
																<Button variant='outline'>Close Level 4</Button>
															</SheetClose>
														</SheetFooter>
													</SheetContent>
												</Sheet>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Close Level 3</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Close Level 2</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close Level 1</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const StackedSheetsCollapseDynamicWidths: Story = {
	parameters: {
		layout: 'fullscreen',
	},
	render: () => {
		const [level2Width, setLevel2Width] = useState(420);
		const [level3Width, setLevel3Width] = useState(520);

		return (
			<SheetStackProvider stackMode='collapse'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>Open Dynamic Width Stack</Button>
					</SheetTrigger>
					<SheetContent
						className='h-full overflow-hidden'
						style={{ width: 'min(1100px, 95vw)' }}
					>
						<SheetHeader>
							<SheetTitle>Level 1 (Wide)</SheetTitle>
							<SheetDescription>
								Open Level 2/3 and tweak widths to verify collapse stacking stays flush.
							</SheetDescription>
						</SheetHeader>
						<div className='flex flex-col gap-4 py-4'>
							<div className='bg-muted/50 rounded-lg p-4'>
								<p className='text-muted-foreground text-sm'>Expected: no visible gap between top 2 sheets.</p>
							</div>
							<Sheet>
								<SheetTrigger asChild>
									<Button className='w-full'>Open Level 2</Button>
								</SheetTrigger>
								<SheetContent className='h-full overflow-hidden' style={{ width: `${level2Width}px` }}>
									<SheetHeader>
										<SheetTitle>Level 2</SheetTitle>
										<SheetDescription>Width: {level2Width}px</SheetDescription>
									</SheetHeader>
									<div className='flex flex-col gap-3 py-4'>
										<div className='flex flex-wrap gap-2'>
											<Button size='sm' variant='outline' onClick={() => setLevel2Width(360)}>
												360
											</Button>
											<Button size='sm' variant='outline' onClick={() => setLevel2Width(420)}>
												420
											</Button>
											<Button size='sm' variant='outline' onClick={() => setLevel2Width(680)}>
												680
											</Button>
										</div>
										<Sheet>
											<SheetTrigger asChild>
												<Button className='w-full'>Open Level 3</Button>
											</SheetTrigger>
											<SheetContent className='h-full overflow-hidden' style={{ width: `${level3Width}px` }}>
												<SheetHeader>
													<SheetTitle>Level 3 (Top)</SheetTitle>
													<SheetDescription>Width: {level3Width}px</SheetDescription>
												</SheetHeader>
												<div className='flex flex-col gap-3 py-4'>
													<div className='flex flex-wrap gap-2'>
														<Button size='sm' variant='outline' onClick={() => setLevel3Width(320)}>
															320
														</Button>
														<Button size='sm' variant='outline' onClick={() => setLevel3Width(520)}>
															520
														</Button>
														<Button size='sm' variant='outline' onClick={() => setLevel3Width(900)}>
															900
														</Button>
													</div>
													<div className='bg-muted/50 rounded-lg p-4'>
														<p className='text-muted-foreground text-sm'>Resize Level 2/3 widths; underlying sheets should stay tight.</p>
													</div>
												</div>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close Level 3</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close Level 2</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close Level 1</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>
		);
	},
};

export const StackedSheetsCollapsePoppers: Story = {
	parameters: {
		layout: 'fullscreen',
	},
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open Stack (Poppers)</Button>
				</SheetTrigger>
				<SheetContent className='h-full overflow-hidden' style={{ width: 'min(900px, 95vw)' }}>
					<SheetHeader>
						<SheetTitle>Level 1</SheetTitle>
						<SheetDescription>
							Open Level 2/3 and verify popovers/select/dropdowns render above the top sheet.
						</SheetDescription>
					</SheetHeader>
					<div className='flex flex-col gap-4 py-4'>
						<Sheet>
							<SheetTrigger asChild>
								<Button className='w-full'>Open Level 2</Button>
							</SheetTrigger>
							<SheetContent className='h-full overflow-hidden' style={{ width: '520px' }}>
								<SheetHeader>
									<SheetTitle>Level 2</SheetTitle>
									<SheetDescription>Open Level 3 (top) and interact with poppers.</SheetDescription>
								</SheetHeader>
								<div className='flex flex-col gap-4 py-4'>
									<Sheet>
										<SheetTrigger asChild>
											<Button className='w-full'>Open Level 3 (Top)</Button>
										</SheetTrigger>
										<SheetContent className='h-full overflow-hidden' style={{ width: '420px' }}>
											<SheetHeader>
												<SheetTitle>Level 3 (Top)</SheetTitle>
												<SheetDescription>
													Expected: dropdowns/popovers/tooltips are not hidden behind the sheet.
												</SheetDescription>
											</SheetHeader>
											<div className='flex flex-col gap-4 py-4'>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant='outline'>Open Dropdown Menu</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<DropdownMenuItem>Item A</DropdownMenuItem>
														<DropdownMenuItem>Item B</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>

												<Popover>
													<PopoverTrigger asChild>
														<Button variant='outline'>Open Popover</Button>
													</PopoverTrigger>
													<PopoverContent className='w-80'>
														<div className='space-y-2'>
															<p className='text-sm font-semibold'>Popover Content</p>
															<p className='text-muted-foreground text-sm'>Should render above the sheet stack.</p>
														</div>
													</PopoverContent>
												</Popover>

												<Select defaultValue='b'>
													<SelectTrigger className='w-[240px]'>
														<SelectValue placeholder='Select an option' />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value='a'>Option A</SelectItem>
														<SelectItem value='b'>Option B</SelectItem>
														<SelectItem value='c'>Option C</SelectItem>
													</SelectContent>
												</Select>

												<Tooltip>
													<TooltipTrigger asChild>
														<Button variant='outline'>Hover Tooltip</Button>
													</TooltipTrigger>
													<TooltipContent showArrow>
														Tooltip should appear above the sheet.
													</TooltipContent>
												</Tooltip>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Close Level 3</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Close Level 2</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close Level 1</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const StackedSheetsCollapseLeft: Story = {
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open Left Collapse Demo</Button>
				</SheetTrigger>
				<SheetContent side='left'>
					<SheetHeader>
						<SheetTitle>Navigation (Level 1)</SheetTitle>
						<SheetDescription>Left-side collapse mode navigation.</SheetDescription>
					</SheetHeader>
					<div className='py-4'>
						<nav className='space-y-2'>
							<Button variant='ghost' className='w-full justify-start'>
								Dashboard
							</Button>
							<Sheet>
								<SheetTrigger asChild>
									<Button variant='ghost' className='w-full justify-start'>
										Settings →
									</Button>
								</SheetTrigger>
								<SheetContent side='left'>
									<SheetHeader>
										<SheetTitle>Settings (Level 2)</SheetTitle>
										<SheetDescription>Navigation is now collapsed off-screen.</SheetDescription>
									</SheetHeader>
									<div className='py-4'>
										<nav className='space-y-2'>
											<Button variant='ghost' className='w-full justify-start'>
												General
											</Button>
											<Sheet>
												<SheetTrigger asChild>
													<Button variant='ghost' className='w-full justify-start'>
														Advanced →
													</Button>
												</SheetTrigger>
												<SheetContent side='left'>
													<SheetHeader>
														<SheetTitle>Advanced (Level 3)</SheetTitle>
														<SheetDescription>Settings sheet is now collapsed.</SheetDescription>
													</SheetHeader>
													<div className='py-4'>
														<div className='bg-muted/50 rounded-lg p-4'>
															<p className='text-muted-foreground text-sm'>
																In collapse mode, each new sheet &quot;replaces&quot; the previous one visually,
																while the full stack is preserved for back navigation.
															</p>
														</div>
													</div>
													<SheetFooter>
														<SheetClose asChild>
															<Button variant='outline'>Back to Settings</Button>
														</SheetClose>
													</SheetFooter>
												</SheetContent>
											</Sheet>
										</nav>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Back to Navigation</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</nav>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close Menu</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const StackModeComparison: Story = {
	render: () => (
		<div className='flex gap-4'>
			{/* Cascade Mode */}
			<SheetStackProvider stackMode='cascade'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>Cascade Mode</Button>
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle>Cascade Mode</SheetTitle>
							<SheetDescription>Each sheet is incrementally indented.</SheetDescription>
						</SheetHeader>
						<div className='flex flex-col gap-4 py-4'>
							<div className='bg-blue-500/10 rounded-lg p-4'>
								<p className='text-sm'>All sheets remain visible with staggered indents.</p>
							</div>
							<Sheet>
								<SheetTrigger asChild>
									<Button className='w-full'>Open Level 2</Button>
								</SheetTrigger>
								<SheetContent>
									<SheetHeader>
										<SheetTitle>Cascade - Level 2</SheetTitle>
										<SheetDescription>Level 1 is pushed 24px.</SheetDescription>
									</SheetHeader>
									<div className='flex flex-col gap-4 py-4'>
										<Sheet>
											<SheetTrigger asChild>
												<Button className='w-full'>Open Level 3</Button>
											</SheetTrigger>
											<SheetContent>
												<SheetHeader>
													<SheetTitle>Cascade - Level 3</SheetTitle>
													<SheetDescription>Level 1: 48px, Level 2: 24px</SheetDescription>
												</SheetHeader>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>

			{/* Collapse Mode */}
			<SheetStackProvider stackMode='collapse'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>Collapse Mode</Button>
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle>Collapse Mode</SheetTitle>
							<SheetDescription>Previous sheet is pushed full-width.</SheetDescription>
						</SheetHeader>
						<div className='flex flex-col gap-4 py-4'>
							<div className='bg-purple-500/10 rounded-lg p-4'>
								<p className='text-sm'>Only the sheet below top is fully collapsed.</p>
							</div>
							<Sheet>
								<SheetTrigger asChild>
									<Button className='w-full'>Open Level 2</Button>
								</SheetTrigger>
								<SheetContent>
									<SheetHeader>
										<SheetTitle>Collapse - Level 2</SheetTitle>
										<SheetDescription>Level 1 is pushed full-width (hidden).</SheetDescription>
									</SheetHeader>
									<div className='flex flex-col gap-4 py-4'>
										<Sheet>
											<SheetTrigger asChild>
												<Button className='w-full'>Open Level 3</Button>
											</SheetTrigger>
											<SheetContent>
												<SheetHeader>
													<SheetTitle>Collapse - Level 3</SheetTitle>
													<SheetDescription>Level 2: collapsed, Level 1: 24px</SheetDescription>
												</SheetHeader>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>
		</div>
	),
};

export const CollapseModeFiveLevels: Story = {
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open 5-Level Collapse Demo</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Level 1</SheetTitle>
						<SheetDescription>Deep nesting with collapse mode.</SheetDescription>
					</SheetHeader>
					<div className='flex flex-col gap-4 py-4'>
						<div className='bg-gradient-to-r from-red-500/20 to-red-500/10 rounded-lg p-4'>
							<p className='text-sm font-medium'>Level 1 - Red</p>
							<p className='text-muted-foreground text-xs'>Each level has a different color to track depth.</p>
						</div>
						<Sheet>
							<SheetTrigger asChild>
								<Button className='w-full'>Open Level 2</Button>
							</SheetTrigger>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Level 2</SheetTitle>
									<SheetDescription>Level 1 is collapsed.</SheetDescription>
								</SheetHeader>
								<div className='flex flex-col gap-4 py-4'>
									<div className='bg-gradient-to-r from-orange-500/20 to-orange-500/10 rounded-lg p-4'>
										<p className='text-sm font-medium'>Level 2 - Orange</p>
									</div>
									<Sheet>
										<SheetTrigger asChild>
											<Button className='w-full'>Open Level 3</Button>
										</SheetTrigger>
										<SheetContent>
											<SheetHeader>
												<SheetTitle>Level 3</SheetTitle>
												<SheetDescription>L2 collapsed, L1 peeks 24px.</SheetDescription>
											</SheetHeader>
											<div className='flex flex-col gap-4 py-4'>
												<div className='bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 rounded-lg p-4'>
													<p className='text-sm font-medium'>Level 3 - Yellow</p>
												</div>
												<Sheet>
													<SheetTrigger asChild>
														<Button className='w-full'>Open Level 4</Button>
													</SheetTrigger>
													<SheetContent>
														<SheetHeader>
															<SheetTitle>Level 4</SheetTitle>
															<SheetDescription>L3 collapsed, L2 peeks 24px, L1 peeks 48px.</SheetDescription>
														</SheetHeader>
														<div className='flex flex-col gap-4 py-4'>
															<div className='bg-gradient-to-r from-green-500/20 to-green-500/10 rounded-lg p-4'>
																<p className='text-sm font-medium'>Level 4 - Green</p>
															</div>
															<Sheet>
																<SheetTrigger asChild>
																	<Button className='w-full'>Open Level 5</Button>
																</SheetTrigger>
																<SheetContent>
																	<SheetHeader>
																		<SheetTitle>Level 5</SheetTitle>
																		<SheetDescription>Maximum depth!</SheetDescription>
																	</SheetHeader>
																	<div className='flex flex-col gap-4 py-4'>
																		<div className='bg-gradient-to-r from-blue-500/20 to-blue-500/10 rounded-lg p-4'>
																			<p className='text-sm font-medium'>Level 5 - Blue (Top)</p>
																			<p className='text-muted-foreground text-xs mt-2'>
																				L4 is collapsed. L3 peeks 24px. L2 peeks 48px. L1 peeks 72px.
																			</p>
																		</div>
																	</div>
																	<SheetFooter>
																		<SheetClose asChild>
																			<Button variant='outline'>Close Level 5</Button>
																		</SheetClose>
																	</SheetFooter>
																</SheetContent>
															</Sheet>
														</div>
														<SheetFooter>
															<SheetClose asChild>
																<Button variant='outline'>Close Level 4</Button>
															</SheetClose>
														</SheetFooter>
													</SheetContent>
												</Sheet>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Close Level 3</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Close Level 2</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close Level 1</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const CollapseModeTopSide: Story = {
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open Top Collapse Demo</Button>
				</SheetTrigger>
				<SheetContent side='top'>
					<SheetHeader>
						<SheetTitle>Top Sheet - Level 1</SheetTitle>
						<SheetDescription>Collapse mode works on all sides.</SheetDescription>
					</SheetHeader>
					<div className='flex gap-4 py-4'>
						<div className='bg-muted/50 flex-1 rounded-lg p-4'>
							<p className='text-muted-foreground text-sm'>
								Top-anchored sheets collapse downward. The collapsed sheet slides off the top of the screen.
							</p>
						</div>
						<Sheet>
							<SheetTrigger asChild>
								<Button>Open Level 2</Button>
							</SheetTrigger>
							<SheetContent side='top'>
								<SheetHeader>
									<SheetTitle>Top Sheet - Level 2</SheetTitle>
									<SheetDescription>Level 1 is collapsed above.</SheetDescription>
								</SheetHeader>
								<div className='flex gap-4 py-4'>
									<div className='bg-muted/50 flex-1 rounded-lg p-4'>
										<p className='text-muted-foreground text-sm'>Level 1 is pushed off the top of the screen.</p>
									</div>
									<Sheet>
										<SheetTrigger asChild>
											<Button>Open Level 3</Button>
										</SheetTrigger>
										<SheetContent side='top'>
											<SheetHeader>
												<SheetTitle>Top Sheet - Level 3</SheetTitle>
												<SheetDescription>L2 collapsed, L1 peeks.</SheetDescription>
											</SheetHeader>
											<div className='py-4'>
												<div className='bg-muted/50 rounded-lg p-4'>
													<p className='text-muted-foreground text-sm'>
														You can see Level 1 peeking from above Level 2.
													</p>
												</div>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Close</Button>
												</SheetClose>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Close</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Close</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const CollapseModeBottomSide: Story = {
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Open Bottom Collapse Demo</Button>
				</SheetTrigger>
				<SheetContent side='bottom'>
					<SheetHeader>
						<SheetTitle>Bottom Sheet - Level 1</SheetTitle>
						<SheetDescription>Mobile-style bottom sheet with collapse.</SheetDescription>
					</SheetHeader>
					<div className='grid grid-cols-2 gap-4 py-4'>
						<Sheet>
							<SheetTrigger asChild>
								<Button variant='outline' className='h-20 flex-col'>
									<span className='text-2xl'>📝</span>
									<span className='mt-1 text-xs'>Details</span>
								</Button>
							</SheetTrigger>
							<SheetContent side='bottom'>
								<SheetHeader>
									<SheetTitle>Details - Level 2</SheetTitle>
									<SheetDescription>Level 1 collapsed below.</SheetDescription>
								</SheetHeader>
								<div className='py-4'>
									<div className='space-y-4'>
										<div className='grid gap-2'>
											<Label>Item Name</Label>
											<Input placeholder='Enter name...' />
										</div>
										<Sheet>
											<SheetTrigger asChild>
												<Button variant='outline' className='w-full'>
													Advanced Options
												</Button>
											</SheetTrigger>
											<SheetContent side='bottom'>
												<SheetHeader>
													<SheetTitle>Advanced - Level 3</SheetTitle>
													<SheetDescription>L2 collapsed, L1 peeks from bottom.</SheetDescription>
												</SheetHeader>
												<div className='py-4'>
													<div className='space-y-4'>
														<div className='flex items-center justify-between'>
															<Label>Enable notifications</Label>
															<Input type='checkbox' className='h-4 w-4' />
														</div>
														<div className='flex items-center justify-between'>
															<Label>Auto-save</Label>
															<Input type='checkbox' className='h-4 w-4' />
														</div>
													</div>
												</div>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Back</Button>
													</SheetClose>
													<SheetClose asChild>
														<Button>Save</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Back</Button>
									</SheetClose>
									<SheetClose asChild>
										<Button>Continue</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>
						<Button variant='outline' className='h-20 flex-col'>
							<span className='text-2xl'>📤</span>
							<span className='mt-1 text-xs'>Share</span>
						</Button>
						<Button variant='outline' className='h-20 flex-col'>
							<span className='text-2xl'>⭐</span>
							<span className='mt-1 text-xs'>Favorite</span>
						</Button>
						<Button variant='outline' className='h-20 flex-col'>
							<span className='text-2xl'>🗑️</span>
							<span className='mt-1 text-xs'>Delete</span>
						</Button>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline' className='w-full'>
								Cancel
							</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};

export const CollapseModeAllSides: Story = {
	render: () => (
		<div className='flex flex-wrap gap-4'>
			{/* Right Side */}
			<SheetStackProvider stackMode='collapse'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>Right →</Button>
					</SheetTrigger>
					<SheetContent side='right'>
						<SheetHeader>
							<SheetTitle>Right - L1</SheetTitle>
						</SheetHeader>
						<div className='py-4'>
							<Sheet>
								<SheetTrigger asChild>
									<Button className='w-full'>Open L2</Button>
								</SheetTrigger>
								<SheetContent side='right'>
									<SheetHeader>
										<SheetTitle>Right - L2</SheetTitle>
									</SheetHeader>
									<div className='py-4'>
										<Sheet>
											<SheetTrigger asChild>
												<Button className='w-full'>Open L3</Button>
											</SheetTrigger>
											<SheetContent side='right'>
												<SheetHeader>
													<SheetTitle>Right - L3</SheetTitle>
													<SheetDescription>Top of stack</SheetDescription>
												</SheetHeader>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>

			{/* Left Side */}
			<SheetStackProvider stackMode='collapse'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>← Left</Button>
					</SheetTrigger>
					<SheetContent side='left'>
						<SheetHeader>
							<SheetTitle>Left - L1</SheetTitle>
						</SheetHeader>
						<div className='py-4'>
							<Sheet>
								<SheetTrigger asChild>
									<Button className='w-full'>Open L2</Button>
								</SheetTrigger>
								<SheetContent side='left'>
									<SheetHeader>
										<SheetTitle>Left - L2</SheetTitle>
									</SheetHeader>
									<div className='py-4'>
										<Sheet>
											<SheetTrigger asChild>
												<Button className='w-full'>Open L3</Button>
											</SheetTrigger>
											<SheetContent side='left'>
												<SheetHeader>
													<SheetTitle>Left - L3</SheetTitle>
													<SheetDescription>Top of stack</SheetDescription>
												</SheetHeader>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>

			{/* Top Side */}
			<SheetStackProvider stackMode='collapse'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>↑ Top</Button>
					</SheetTrigger>
					<SheetContent side='top'>
						<SheetHeader>
							<SheetTitle>Top - L1</SheetTitle>
						</SheetHeader>
						<div className='flex gap-4 py-4'>
							<Sheet>
								<SheetTrigger asChild>
									<Button>Open L2</Button>
								</SheetTrigger>
								<SheetContent side='top'>
									<SheetHeader>
										<SheetTitle>Top - L2</SheetTitle>
									</SheetHeader>
									<div className='flex gap-4 py-4'>
										<Sheet>
											<SheetTrigger asChild>
												<Button>Open L3</Button>
											</SheetTrigger>
											<SheetContent side='top'>
												<SheetHeader>
													<SheetTitle>Top - L3</SheetTitle>
													<SheetDescription>Top of stack</SheetDescription>
												</SheetHeader>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>

			{/* Bottom Side */}
			<SheetStackProvider stackMode='collapse'>
				<Sheet>
					<SheetTrigger asChild>
						<Button variant='outline'>↓ Bottom</Button>
					</SheetTrigger>
					<SheetContent side='bottom'>
						<SheetHeader>
							<SheetTitle>Bottom - L1</SheetTitle>
						</SheetHeader>
						<div className='flex gap-4 py-4'>
							<Sheet>
								<SheetTrigger asChild>
									<Button>Open L2</Button>
								</SheetTrigger>
								<SheetContent side='bottom'>
									<SheetHeader>
										<SheetTitle>Bottom - L2</SheetTitle>
									</SheetHeader>
									<div className='flex gap-4 py-4'>
										<Sheet>
											<SheetTrigger asChild>
												<Button>Open L3</Button>
											</SheetTrigger>
											<SheetContent side='bottom'>
												<SheetHeader>
													<SheetTitle>Bottom - L3</SheetTitle>
													<SheetDescription>Top of stack</SheetDescription>
												</SheetHeader>
												<SheetFooter>
													<SheetClose asChild>
														<Button variant='outline'>Close</Button>
													</SheetClose>
												</SheetFooter>
											</SheetContent>
										</Sheet>
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant='outline'>Close</Button>
										</SheetClose>
									</SheetFooter>
								</SheetContent>
							</Sheet>
						</div>
						<SheetFooter>
							<SheetClose asChild>
								<Button variant='outline'>Close</Button>
							</SheetClose>
						</SheetFooter>
					</SheetContent>
				</Sheet>
			</SheetStackProvider>
		</div>
	),
};

export const CollapseModeWizard: Story = {
	render: () => (
		<SheetStackProvider stackMode='collapse'>
			<Sheet>
				<SheetTrigger asChild>
					<Button variant='outline'>Start Setup Wizard</Button>
				</SheetTrigger>
				<SheetContent className='sm:max-w-lg'>
					<SheetHeader>
						<SheetTitle>Step 1: Basic Info</SheetTitle>
						<SheetDescription>Let&apos;s start with the basics.</SheetDescription>
					</SheetHeader>
					<div className='grid gap-4 py-4'>
						<div className='bg-muted/30 rounded-lg p-3'>
							<div className='text-muted-foreground mb-2 flex items-center gap-2 text-xs'>
								<span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs'>
									1
								</span>
								<span>Step 1 of 4</span>
							</div>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='wizard-name'>Project Name</Label>
							<Input id='wizard-name' placeholder='My Awesome Project' />
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='wizard-desc'>Description</Label>
							<Textarea id='wizard-desc' placeholder='Describe your project...' rows={3} />
						</div>
					</div>
					<SheetFooter>
						<SheetClose asChild>
							<Button variant='outline'>Cancel</Button>
						</SheetClose>
						<Sheet>
							<SheetTrigger asChild>
								<Button>Next: Configuration</Button>
							</SheetTrigger>
							<SheetContent className='sm:max-w-lg'>
								<SheetHeader>
									<SheetTitle>Step 2: Configuration</SheetTitle>
									<SheetDescription>Configure your project settings.</SheetDescription>
								</SheetHeader>
								<div className='grid gap-4 py-4'>
									<div className='bg-muted/30 rounded-lg p-3'>
										<div className='text-muted-foreground mb-2 flex items-center gap-2 text-xs'>
											<span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs'>
												2
											</span>
											<span>Step 2 of 4</span>
										</div>
									</div>
									<div className='space-y-4'>
										<div className='flex items-center justify-between'>
											<div>
												<Label>Enable Analytics</Label>
												<p className='text-muted-foreground text-xs'>Track usage patterns</p>
											</div>
											<Input type='checkbox' className='h-4 w-4' />
										</div>
										<div className='flex items-center justify-between'>
											<div>
												<Label>Public Access</Label>
												<p className='text-muted-foreground text-xs'>Allow public viewing</p>
											</div>
											<Input type='checkbox' className='h-4 w-4' />
										</div>
									</div>
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant='outline'>Back</Button>
									</SheetClose>
									<Sheet>
										<SheetTrigger asChild>
											<Button>Next: Team</Button>
										</SheetTrigger>
										<SheetContent className='sm:max-w-lg'>
											<SheetHeader>
												<SheetTitle>Step 3: Team Setup</SheetTitle>
												<SheetDescription>Add team members to your project.</SheetDescription>
											</SheetHeader>
											<div className='grid gap-4 py-4'>
												<div className='bg-muted/30 rounded-lg p-3'>
													<div className='text-muted-foreground mb-2 flex items-center gap-2 text-xs'>
														<span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs'>
															3
														</span>
														<span>Step 3 of 4</span>
													</div>
												</div>
												<div className='grid gap-2'>
													<Label htmlFor='wizard-email'>Invite by Email</Label>
													<Input id='wizard-email' type='email' placeholder='colleague@company.com' />
												</div>
												<div className='bg-muted/50 rounded-lg p-4'>
													<p className='text-muted-foreground text-sm'>No team members added yet.</p>
												</div>
											</div>
											<SheetFooter>
												<SheetClose asChild>
													<Button variant='outline'>Back</Button>
												</SheetClose>
												<Sheet>
													<SheetTrigger asChild>
														<Button>Next: Review</Button>
													</SheetTrigger>
													<SheetContent className='sm:max-w-lg'>
														<SheetHeader>
															<SheetTitle>Step 4: Review</SheetTitle>
															<SheetDescription>Review and confirm your setup.</SheetDescription>
														</SheetHeader>
														<div className='grid gap-4 py-4'>
															<div className='bg-muted/30 rounded-lg p-3'>
																<div className='text-muted-foreground mb-2 flex items-center gap-2 text-xs'>
																	<span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs'>
																		4
																	</span>
																	<span>Step 4 of 4 - Final Review</span>
																</div>
															</div>
															<div className='space-y-3'>
																<div className='flex justify-between border-b pb-2'>
																	<span className='text-muted-foreground text-sm'>Project Name</span>
																	<span className='text-sm font-medium'>My Awesome Project</span>
																</div>
																<div className='flex justify-between border-b pb-2'>
																	<span className='text-muted-foreground text-sm'>Analytics</span>
																	<span className='text-sm font-medium'>Enabled</span>
																</div>
																<div className='flex justify-between border-b pb-2'>
																	<span className='text-muted-foreground text-sm'>Public Access</span>
																	<span className='text-sm font-medium'>Disabled</span>
																</div>
																<div className='flex justify-between'>
																	<span className='text-muted-foreground text-sm'>Team Members</span>
																	<span className='text-sm font-medium'>0 invited</span>
																</div>
															</div>
														</div>
														<SheetFooter>
															<SheetClose asChild>
																<Button variant='outline'>Back</Button>
															</SheetClose>
															<SheetClose asChild>
																<Button>Create Project</Button>
															</SheetClose>
														</SheetFooter>
													</SheetContent>
												</Sheet>
											</SheetFooter>
										</SheetContent>
									</Sheet>
								</SheetFooter>
							</SheetContent>
						</Sheet>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</SheetStackProvider>
	),
};
