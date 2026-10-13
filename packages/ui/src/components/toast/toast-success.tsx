'use client';

import { CheckCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { ToastCard, type ToastProps, type ToastTone } from './toast-card';

export type ToastSuccessProps = ToastProps;

const tone: ToastTone = {
	border: 'border-green-200/60 dark:border-green-800/50',
	icon: 'text-green-600 dark:text-green-500',
	message: 'text-green-700 dark:text-green-400',
	action: 'text-green-700 dark:text-green-400',
};

export function showSuccessToast(props: ToastSuccessProps) {
	return toast.custom((t) => (
		<ToastCard toastId={t} icon={CheckCircleIcon} closeLabel='Close success notification' tone={tone} {...props} />
	));
}
