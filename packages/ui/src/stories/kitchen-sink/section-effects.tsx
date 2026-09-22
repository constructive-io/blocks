import { FlickeringGrid } from '../../components/flickering-grid';
import { MotionGrid } from '../../components/motion-grid';
import { ProgressiveBlur } from '../../components/progressive-blur';
import { Section, Specimen } from './sink-layout';

export function EffectsSection() {
	return (
		<Section id='effects' index='07' title='Effects' description='Ambient and decorative surfaces'>
			<Specimen label='FlickeringGrid' wide>
				<div className='relative h-40 overflow-hidden rounded-md border bg-background'>
					<FlickeringGrid
						className='absolute inset-0'
						squareSize={4}
						gridGap={6}
						maxOpacity={0.35}
						style={{ color: 'var(--muted-foreground)' }}
					/>
					<div className='absolute inset-0 flex items-center justify-center'>
						<p className='rounded-md bg-card/80 px-3 py-1.5 text-sm shadow-card'>Ambient grid backdrop</p>
					</div>
				</div>
			</Specimen>
			<Specimen label='MotionGrid' center>
				<MotionGrid gridSize={[12, 6]} duration={160} className='gap-1' />
			</Specimen>
			<Specimen label='ProgressiveBlur' center>
				<div className='relative h-40 w-full overflow-hidden rounded-md border'>
					<div className='h-full space-y-2 overflow-auto p-3'>
						{Array.from({ length: 12 }, (_, i) => (
							<div key={i} className='h-6 rounded bg-muted' />
						))}
					</div>
					<ProgressiveBlur position='bottom' />
				</div>
			</Specimen>
		</Section>
	);
}
