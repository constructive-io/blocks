import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Checkbox } from '../components/checkbox';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from '../components/table';

const meta: Meta<typeof Table> = {
	title: 'UI/Table',
	component: Table,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const invoices = [
	{
		invoice: 'INV001',
		paymentStatus: 'Paid',
		totalAmount: '$250.00',
		paymentMethod: 'Credit Card',
	},
	{
		invoice: 'INV002',
		paymentStatus: 'Pending',
		totalAmount: '$150.00',
		paymentMethod: 'PayPal',
	},
	{
		invoice: 'INV003',
		paymentStatus: 'Unpaid',
		totalAmount: '$350.00',
		paymentMethod: 'Bank Transfer',
	},
	{
		invoice: 'INV004',
		paymentStatus: 'Paid',
		totalAmount: '$450.00',
		paymentMethod: 'Credit Card',
	},
	{
		invoice: 'INV005',
		paymentStatus: 'Paid',
		totalAmount: '$550.00',
		paymentMethod: 'PayPal',
	},
	{
		invoice: 'INV006',
		paymentStatus: 'Pending',
		totalAmount: '$200.00',
		paymentMethod: 'Bank Transfer',
	},
	{
		invoice: 'INV007',
		paymentStatus: 'Unpaid',
		totalAmount: '$300.00',
		paymentMethod: 'Credit Card',
	},
];

export const Default: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent invoices.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className='w-[100px]'>Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className='text-right'>Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className='font-medium'>{invoice.invoice}</TableCell>
						<TableCell>{invoice.paymentStatus}</TableCell>
						<TableCell>{invoice.paymentMethod}</TableCell>
						<TableCell className='text-right'>{invoice.totalAmount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithBadges: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent invoices with status badges.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className='w-[100px]'>Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className='text-right'>Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className='font-medium'>{invoice.invoice}</TableCell>
						<TableCell>
							<Badge
								variant={
									invoice.paymentStatus === 'Paid'
										? 'default'
										: invoice.paymentStatus === 'Pending'
											? 'secondary'
											: 'destructive'
								}
							>
								{invoice.paymentStatus}
							</Badge>
						</TableCell>
						<TableCell>{invoice.paymentMethod}</TableCell>
						<TableCell className='text-right'>{invoice.totalAmount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithActions: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent invoices with actions.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className='w-[100px]'>Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className='text-right'>Amount</TableHead>
					<TableHead className='text-right'>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className='font-medium'>{invoice.invoice}</TableCell>
						<TableCell>
							<Badge
								variant={
									invoice.paymentStatus === 'Paid'
										? 'default'
										: invoice.paymentStatus === 'Pending'
											? 'secondary'
											: 'destructive'
								}
							>
								{invoice.paymentStatus}
							</Badge>
						</TableCell>
						<TableCell>{invoice.paymentMethod}</TableCell>
						<TableCell className='text-right'>{invoice.totalAmount}</TableCell>
						<TableCell className='text-right'>
							<div className='flex justify-end gap-2'>
								<Button variant='ghost' size='sm'>
									View
								</Button>
								<Button variant='ghost' size='sm'>
									Edit
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithSelection: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent invoices with selection.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className='w-[50px]'>
						<Checkbox />
					</TableHead>
					<TableHead className='w-[100px]'>Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className='text-right'>Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell>
							<Checkbox />
						</TableCell>
						<TableCell className='font-medium'>{invoice.invoice}</TableCell>
						<TableCell>
							<Badge
								variant={
									invoice.paymentStatus === 'Paid'
										? 'default'
										: invoice.paymentStatus === 'Pending'
											? 'secondary'
											: 'destructive'
								}
							>
								{invoice.paymentStatus}
							</Badge>
						</TableCell>
						<TableCell>{invoice.paymentMethod}</TableCell>
						<TableCell className='text-right'>{invoice.totalAmount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent invoices with footer totals.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className='w-[100px]'>Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className='text-right'>Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className='font-medium'>{invoice.invoice}</TableCell>
						<TableCell>{invoice.paymentStatus}</TableCell>
						<TableCell>{invoice.paymentMethod}</TableCell>
						<TableCell className='text-right'>{invoice.totalAmount}</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell colSpan={3}>Total</TableCell>
					<TableCell className='text-right'>$2,500.00</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	),
};

export const UserTable: Story = {
	render: () => (
		<Table>
			<TableCaption>Team members and their roles.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className='text-right'>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell className='font-medium'>John Doe</TableCell>
					<TableCell>john@example.com</TableCell>
					<TableCell>
						<Badge variant='default'>Admin</Badge>
					</TableCell>
					<TableCell>
						<Badge variant='secondary'>Active</Badge>
					</TableCell>
					<TableCell className='text-right'>
						<Button variant='ghost' size='sm'>
							Edit
						</Button>
					</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className='font-medium'>Jane Smith</TableCell>
					<TableCell>jane@example.com</TableCell>
					<TableCell>
						<Badge variant='outline'>Editor</Badge>
					</TableCell>
					<TableCell>
						<Badge variant='secondary'>Active</Badge>
					</TableCell>
					<TableCell className='text-right'>
						<Button variant='ghost' size='sm'>
							Edit
						</Button>
					</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className='font-medium'>Bob Johnson</TableCell>
					<TableCell>bob@example.com</TableCell>
					<TableCell>
						<Badge variant='outline'>Viewer</Badge>
					</TableCell>
					<TableCell>
						<Badge variant='destructive'>Inactive</Badge>
					</TableCell>
					<TableCell className='text-right'>
						<Button variant='ghost' size='sm'>
							Edit
						</Button>
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};

export const ProductTable: Story = {
	render: () => (
		<Table>
			<TableCaption>Product inventory and pricing.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Product</TableHead>
					<TableHead>SKU</TableHead>
					<TableHead className='text-right'>Price</TableHead>
					<TableHead className='text-right'>Stock</TableHead>
					<TableHead>Category</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell className='font-medium'>Wireless Headphones</TableCell>
					<TableCell>WH-001</TableCell>
					<TableCell className='text-right'>$199.99</TableCell>
					<TableCell className='text-right'>45</TableCell>
					<TableCell>
						<Badge variant='outline'>Electronics</Badge>
					</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className='font-medium'>Coffee Mug</TableCell>
					<TableCell>CM-002</TableCell>
					<TableCell className='text-right'>$12.99</TableCell>
					<TableCell className='text-right'>120</TableCell>
					<TableCell>
						<Badge variant='outline'>Home</Badge>
					</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className='font-medium'>Laptop Stand</TableCell>
					<TableCell>LS-003</TableCell>
					<TableCell className='text-right'>$89.99</TableCell>
					<TableCell className='text-right'>23</TableCell>
					<TableCell>
						<Badge variant='outline'>Office</Badge>
					</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className='font-medium'>Bluetooth Speaker</TableCell>
					<TableCell>BS-004</TableCell>
					<TableCell className='text-right'>$79.99</TableCell>
					<TableCell className='text-right'>0</TableCell>
					<TableCell>
						<Badge variant='outline'>Electronics</Badge>
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};
