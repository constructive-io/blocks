import { RiArrowLeftSLine, RiArrowRightSLine, RiSkipBackLine, RiSkipForwardLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';
import { Pagination, PaginationContent, PaginationItem } from '@constructive-io/ui/pagination';

export interface SheetsPaginationProps {
	pageIndex: number;
	pageSize: number;
	totalCount: number;
	totalPages: number;
	setPageIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function SheetsPagination(props: SheetsPaginationProps) {
	const { pageIndex, pageSize, totalCount, totalPages, setPageIndex } = props;

	return (
		<div
			data-part-id='sheets-pagination'
			className='flex shrink-0 flex-col items-start justify-between gap-3 pt-4 sm:flex-row sm:items-center'
		>
			<p className='text-muted-foreground flex-1 text-sm whitespace-nowrap' aria-live='polite'>
				Showing <span className='text-foreground'>{(pageIndex * pageSize + 1).toLocaleString()}</span> to
				<span className='text-foreground'>
					{' '}
					{Math.min((pageIndex + 1) * pageSize, totalCount).toLocaleString()}
				</span> of <span className='text-foreground'>{totalCount.toLocaleString()}</span> results
			</p>
			<Pagination className='w-auto'>
				<PaginationContent className='gap-2'>
					<PaginationItem>
						<Button
							variant='secondary'
							size='sm'
							onClick={() => setPageIndex(0)}
							disabled={pageIndex === 0}
							aria-label='Go to first page'
						>
							<RiSkipBackLine size={16} />
							<span className='ml-1 hidden sm:inline'>First</span>
						</Button>
					</PaginationItem>
					<PaginationItem>
						<Button
							variant='secondary'
							size='sm'
							onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
							disabled={pageIndex === 0}
							aria-label='Go to previous page'
						>
							<RiArrowLeftSLine size={16} />
							<span className='ml-1'>Previous</span>
						</Button>
					</PaginationItem>
					<PaginationItem>
						<Button
							variant='secondary'
							size='sm'
							onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
							disabled={pageIndex >= totalPages - 1}
							aria-label='Go to next page'
						>
							<span className='mr-1'>Next</span>
							<RiArrowRightSLine size={16} />
						</Button>
					</PaginationItem>
					<PaginationItem>
						<Button
							variant='secondary'
							size='sm'
							onClick={() => setPageIndex(totalPages - 1)}
							disabled={pageIndex >= totalPages - 1}
							aria-label='Go to last page'
						>
							<span className='mr-1 hidden sm:inline'>Last</span>
							<RiSkipForwardLine size={16} />
						</Button>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	);
}
