import { AuditEventsCard } from './cards/audit-events-card';
import { AutoscalingCard } from './cards/autoscaling-card';
import { BackupDestinationCard } from './cards/backup-destination-card';
import { ComputeBalanceCard } from './cards/compute-balance-card';
import { ComputeSpendCard } from './cards/compute-spend-card';
import { ComputeUsageCard } from './cards/compute-usage-card';
import { ConnectCliCard } from './cards/connect-cli-card';
import { ConnectPaymentEmptyCard } from './cards/connect-payment-empty-card';
import { ConnectionPoolCard } from './cards/connection-pool-card';
import { CreateAlertRuleCard } from './cards/create-alert-rule-card';
import { CreditsBalanceCard } from './cards/credits-balance-card';
import { DigestSettingsCard } from './cards/digest-settings-card';
import { EgressQuarterCard } from './cards/egress-quarter-card';
import { ExploreCatalogEmptyCard } from './cards/explore-catalog-empty-card';
import { FaqCard } from './cards/faq-card';
import { FeaturePackCatalogCard } from './cards/feature-pack-catalog-card';
import { LatencyHistoryCard } from './cards/latency-history-card';
import { MigrationMilestonesCard } from './cards/migration-milestones-card';
import { PaymentMethodsCard } from './cards/payment-methods-card';
import { PrimaryDatabaseCard } from './cards/primary-database-card';
import { ProjectIconCard } from './cards/project-icon-card';
import { ProjectPreferencesCard } from './cards/project-preferences-card';
import { PublishPackEmptyCard } from './cards/publish-pack-empty-card';
import { ReadReplicasCard } from './cards/read-replicas-card';
import { RecoveryAccessCard } from './cards/recovery-access-card';
import { SidebarNavCard } from './cards/sidebar-nav-card';
import { SkeletonRowsCard } from './cards/skeleton-rows-card';
import { SpendAlertCard } from './cards/spend-alert-card';
import { StorageQuotaCard } from './cards/storage-quota-card';
import { SyncingSchemaCard } from './cards/syncing-schema-card';
import { TransferCreditsCard } from './cards/transfer-credits-card';
import { UpcomingMaintenanceCard } from './cards/upcoming-maintenance-card';
import { WebhooksCard } from './cards/webhooks-card';
import { COLUMN_CLASS, stagger, WallShell, WIDE_COLUMN_CLASS } from './wall-shell';

/**
 * Wall 01 · platform — billing, org, and project state. Seven tracks: C3 is
 * the wide column (2 tracks) and carries the audit table plus the 2×2
 * navigation/forms subgrid.
 */
export function WallPlatform() {
  return (
    <WallShell wall="platform" tracks="grid-cols-[repeat(7,352px)]">
      <div className={COLUMN_CLASS} style={stagger(0)}>
        <ComputeSpendCard />
        <PublishPackEmptyCard />
        <ConnectCliCard />
        <EgressQuarterCard />
        <AutoscalingCard />
        <SyncingSchemaCard />
        <SkeletonRowsCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(1)}>
        <SpendAlertCard />
        <CreditsBalanceCard />
        <ProjectPreferencesCard />
        <StorageQuotaCard />
        <ConnectionPoolCard />
      </div>
      <div className={WIDE_COLUMN_CLASS} style={stagger(2)}>
        <MigrationMilestonesCard />
        <AuditEventsCard />
        {/* Two half-width cards of matching height side by side. (A 2×2 grid here
            aligned rows to the tallest card and opened a void under the shorter
            one; the taller half-width cards now live in the narrow columns so
            every column ends within a card of the others.) */}
        <div className="grid grid-cols-2 items-start gap-6">
          <FaqCard />
          <PrimaryDatabaseCard />
        </div>
        <FeaturePackCatalogCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(3)}>
        <RecoveryAccessCard />
        <SidebarNavCard />
        <ComputeBalanceCard />
        <TransferCreditsCard />
        <ProjectIconCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(4)}>
        <BackupDestinationCard />
        <ComputeUsageCard />
        <ConnectPaymentEmptyCard />
        <UpcomingMaintenanceCard />
        <ReadReplicasCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(5)}>
        <LatencyHistoryCard />
        <PaymentMethodsCard />
        <ExploreCatalogEmptyCard />
        <CreateAlertRuleCard />
        <WebhooksCard />
        <DigestSettingsCard />
      </div>
    </WallShell>
  );
}
