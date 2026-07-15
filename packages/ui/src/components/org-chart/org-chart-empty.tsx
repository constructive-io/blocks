import { Network, UserPlus } from 'lucide-react';
import { Button } from '../button';

interface OrgChartEmptyProps {
	editable: boolean;
	onAddRoot: () => void;
}

export function OrgChartEmpty({ editable, onAddRoot }: OrgChartEmptyProps) {
	return (
		<div className='bg-card border-border/60 flex flex-col items-center justify-center rounded-xl border py-16'>
			<div className='bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl'>
				<Network className='text-muted-foreground size-7' />
			</div>
			<h3 className='text-foreground text-base font-semibold'>No Org Chart Yet</h3>
			<p className='text-muted-foreground mt-1.5 max-w-sm text-center text-sm'>
				Build your organization hierarchy by adding the first person.
			</p>
			{editable && (
				<Button className='mt-5 gap-1.5' onClick={onAddRoot}>
					<UserPlus className='size-3.5' />
					Add First Member
				</Button>
			)}
		</div>
	);
}
