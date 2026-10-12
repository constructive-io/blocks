'use client';

import { InfoIcon } from 'lucide-react';
import { toast } from 'sonner';

import { ToastCard, type ToastTone } from './toast-card';

export interface ToastInfoProps {
	message: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: () => void;
}

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
