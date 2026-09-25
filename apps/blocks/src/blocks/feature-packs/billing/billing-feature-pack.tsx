'use client';

import {
  BillingAccount,
  type BillingAccountProps
} from '@/components/ui/billing-account/index';

export type BillingFeaturePackProps = BillingAccountProps & {
  /** Receives failures from host callbacks; the account view still shows its own inline error. */
  onError?: (error: unknown) => void;
};

function reporting<Args extends unknown[], Result>(
  callback: ((...args: Args) => Result) | undefined,
  onError: ((error: unknown) => void) | undefined
): ((...args: Args) => Promise<Awaited<Result>>) | undefined {
  if (!callback) return undefined;
  return async (...args: Args): Promise<Awaited<Result>> => {
    try {
      return await callback(...args);
    } catch (error) {
      onError?.(error);
      throw error;
    }
  };
}

/**
 * The feature-pack root for customer billing: the Billing Account template
 * for one personal or organization account. Console Kit passes the data its
 * adapter could read and the views it can back.
 */
export function BillingFeaturePack({
  onError,
  onChangePlan,
  onBuyCredits,
  onRedeemCode,
  ...props
}: BillingFeaturePackProps) {
  return (
    <BillingAccount
      {...props}
      onChangePlan={reporting(onChangePlan, onError)}
      onBuyCredits={reporting(onBuyCredits, onError)}
      onRedeemCode={reporting(onRedeemCode, onError)}
    />
  );
}
