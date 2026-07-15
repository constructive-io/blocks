import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '../components/pagination';

const meta: Meta<typeof Pagination> = {
	title: 'UI/Pagination',
	component: Pagination,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#' isActive>
						2
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>3</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const WithEllipsis: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#' isActive>
						5
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>6</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>10</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const FirstPage: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' isDisabled />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#' isActive>
						1
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>2</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>3</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>10</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const LastPage: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>8</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>9</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#' isActive>
						10
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' isDisabled />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const MiddlePage: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>4</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#' isActive>
						5
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>6</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>10</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const LargeDataset: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>48</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>49</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#' isActive>
						50
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>51</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>52</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href='#'>100</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const SimpleNavigation: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const WithNumberedPages: Story = {
	render: () => (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href='#' />
				</PaginationItem>
				{[1, 2, 3, 4, 5].map((page) => (
					<PaginationItem key={page}>
						<PaginationLink href='#' isActive={page === 3}>
							{page}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext href='#' />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
};

export const BlogPagination: Story = {
	render: () => (
		<div className='space-y-4'>
			<div className='text-muted-foreground text-center text-sm'>Showing 1-10 of 847 blog posts</div>
			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious href='#' />
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#' isActive>
							1
						</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>2</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>3</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>4</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>5</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationEllipsis />
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>85</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationNext href='#' />
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	),
};

export const SearchResults: Story = {
	render: () => (
		<div className='space-y-4'>
			<div className='text-muted-foreground text-center text-sm'>About 1,247 results (0.28 seconds)</div>
			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious href='#' />
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>1</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#' isActive>
							2
						</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>3</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>4</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>5</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>6</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>7</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>8</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>9</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationLink href='#'>10</PaginationLink>
					</PaginationItem>
					<PaginationItem>
						<PaginationNext href='#' />
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	),
};
