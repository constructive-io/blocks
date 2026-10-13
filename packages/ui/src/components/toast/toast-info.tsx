'use client';

import { InfoIcon } from 'lucide-react';
import { toast } from 'sonner';

import { ToastCard, type ToastProps, type ToastTone } from './toast-card';

export type ToastInfoProps = ToastProps;

const tone: ToastTone = {
	border: 'border-primary/20',
	icon: 'text-primary',
	message: 'text-link',
	action: 'text-link',
};

export function showInfoToast(props: ToastInfoProps) {
	return toast.custom((t) => (
		<ToastCard toastId={t} icon={InfoIcon} closeLabel='Close info notification' tone={tone} {...props} />
	));
}
