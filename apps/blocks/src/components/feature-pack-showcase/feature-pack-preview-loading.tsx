import { cn } from '@/lib/utils';

function LoadingShape({ className }: Readonly<{ className: string }>) {
  return <div aria-hidden='true' className={cn('rounded-md bg-muted', className)} />;
}

/** A pack-neutral loading canvas shared by route and lazy-module boundaries. */
export function FeaturePackPreviewLoading() {
  return (
    <div
      aria-busy='true'
      aria-live='polite'
      className='mx-auto flex min-h-[32rem] w-full max-w-7xl flex-col gap-5'
      role='status'
    >
      <span className='sr-only'>Loading live preview…</span>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 flex-1 flex-col gap-2'>
          <LoadingShape className='h-7 w-40 max-w-2/3' />
          <LoadingShape className='h-4 w-80 max-w-full' />
        </div>
        <LoadingShape className='hidden h-9 w-24 shrink-0 sm:block' />
      </div>
      <div className='overflow-hidden rounded-xl border bg-card'>
        <div className='flex items-center justify-between gap-4 border-b px-4 py-3'>
          <LoadingShape className='h-9 w-64 max-w-2/3' />
          <LoadingShape className='size-9 shrink-0' />
        </div>
        <div className='grid min-h-80 sm:grid-cols-[15rem_minmax(0,1fr)]'>
          <div className='hidden flex-col gap-3 border-r p-4 sm:flex'>
            <LoadingShape className='h-4 w-24' />
            <LoadingShape className='h-9 w-full' />
            <LoadingShape className='h-9 w-5/6' />
            <LoadingShape className='h-9 w-11/12' />
          </div>
          <div className='divide-y'>
            {Array.from({ length: 5 }, (_, index) => (
              <div className='flex items-center gap-3 px-4 py-3' key={index}>
                <LoadingShape className='size-9 shrink-0 rounded-full' />
                <div className='flex min-w-0 flex-1 flex-col gap-2'>
                  <LoadingShape className='h-4 w-40 max-w-2/3' />
                  <LoadingShape className='h-3 w-56 max-w-4/5' />
                </div>
                <LoadingShape className='hidden h-6 w-16 shrink-0 sm:block' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
