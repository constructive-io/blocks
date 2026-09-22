import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, TerminalIcon, XCircleIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../../components/alert';
import { Button } from '../../components/button';
import { Progress } from '../../components/progress';
import { Skeleton } from '../../components/skeleton';
import { Spinner } from '../../components/spinner';
import { toast } from '../../components/toast';
import { Section, Specimen } from './sink-layout';

export function FeedbackSection() {
	return (
		<Section id='feedback' index='04' title='Feedback' description='Alerts, progress, loading, and toasts'>
			<Specimen label='Alert — variants' wide>
				<div className='grid gap-2 sm:grid-cols-2'>
					<Alert>
						<TerminalIcon />
						<AlertTitle>Heads up</AlertTitle>
						<AlertDescription>Neutral callout for general information.</AlertDescription>
					</Alert>
					<Alert variant='info'>
						<InfoIcon />
						<AlertTitle>Info</AlertTitle>
						<AlertDescription>Contextual note about the current view.</AlertDescription>
					</Alert>
					<Alert variant='success'>
						<CheckCircle2Icon />
						<AlertTitle>Deployed</AlertTitle>
						<AlertDescription>Migration applied to production-db.</AlertDescription>
					</Alert>
					<Alert variant='warning'>
						<AlertTriangleIcon />
						<AlertTitle>Warning</AlertTitle>
						<AlertDescription>Usage is at 82% of the plan limit.</AlertDescription>
					</Alert>
					<Alert variant='destructive' className='sm:col-span-2'>
						<XCircleIcon />
						<AlertTitle>Connection failed</AlertTitle>
						<AlertDescription>Could not reach the database. Check credentials and retry.</AlertDescription>
					</Alert>
				</div>
			</Specimen>
			<Specimen label='Progress' center>
				<div className='w-full max-w-xs space-y-3'>
					<Progress value={32} aria-label='Rows imported' />
					<Progress value={68} aria-label='Storage used' />
					<Progress value={100} aria-label='Complete' />
				</div>
			</Specimen>
			<Specimen label='Spinner' center>
				<div className='flex items-center gap-4 text-muted-foreground'>
					<Spinner className='size-3' />
					<Spinner />
					<Spinner className='size-6' />
					<span className='flex items-center gap-2 text-sm'>
						<Spinner /> Syncing schema…
					</span>
				</div>
			</Specimen>
			<Specimen label='Skeleton'>
				<div className='flex items-center gap-3'>
					<Skeleton className='size-10 rounded-full' />
					<div className='flex-1 space-y-2'>
						<Skeleton className='h-3.5 w-3/4' />
						<Skeleton className='h-3.5 w-1/2' />
					</div>
				</div>
			</Specimen>
			<Specimen label='Toast' hint='sonner' wide>
				<div className='flex flex-wrap gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => toast.success({ message: 'Schema updated', description: '3 tables changed.' })}
					>
						Success toast
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => toast.info({ message: 'Sync started', description: 'Pulling latest schema.' })}
					>
						Info toast
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => toast.warning({ message: 'Rate limit near', description: '82% of quota used.' })}
					>
						Warning toast
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => toast.error({ message: 'Deploy failed', description: 'Build exited with code 1.' })}
					>
						Error toast
					</Button>
				</div>
			</Specimen>
		</Section>
	);
}
