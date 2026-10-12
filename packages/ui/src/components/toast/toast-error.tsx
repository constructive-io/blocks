'use client';

import { AlertCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { ToastCard, type ToastTone } from './toast-card';

export interface ToastErrorProps {
	message: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: () => void;
}

const tone: ToastTone = {
	border: 'border-destructive/20',
	icon: 'text-destructive',
	message: 'text-destructive',
	action: 'text-destructive',
};

export function showErrorToast(props: ToastErrorProps) {
	return toast.custom(
		(t) => <ToastCard toastId={t} icon={AlertCircleIcon} closeLabel='Close error notification' tone={tone} {...props} />,
		{ duration: Infinity },
	);
}
