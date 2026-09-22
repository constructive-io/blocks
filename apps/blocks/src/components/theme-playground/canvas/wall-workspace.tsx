import { AccountSecurityCard } from './cards/account-security-card';
import { ActiveConnectionsCard } from './cards/active-connections-card';
import { ActivityPrefsCard } from './cards/activity-prefs-card';
import { AlertsCard } from './cards/alerts-card';
import { AnalyticsCard } from './cards/analytics-card';
import { AnomalyAlertCard } from './cards/anomaly-alert-card';
import { ApiKeysCard } from './cards/api-keys-card';
import { AssignIssueCard } from './cards/assign-issue-card';
import { AssistantCard } from './cards/assistant-card';
import { BillingAddressCard } from './cards/billing-address-card';
import { ClientShareCard } from './cards/client-share-card';
import { CommandPaletteCard } from './cards/command-palette-card';
import { CreateTableCard } from './cards/create-table-card';
import { DatabaseStatusCard } from './cards/database-status-card';
import { DeployLoadCard } from './cards/deploy-load-card';
import { DeploymentsCard } from './cards/deployments-card';
import { DockCard } from './cards/dock-card';
import { EnvironmentsCard } from './cards/environments-card';
import { FeedbackCard } from './cards/feedback-card';
import { IconGridCard } from './cards/icon-grid-card';
import { InviteTeammateCard } from './cards/invite-teammate-card';
import { InvoiceCard } from './cards/invoice-card';
import { LabelsCard } from './cards/labels-card';
import { LatencyReportCard } from './cards/latency-report-card';
import { LiveQueryStreamCard } from './cards/live-query-stream-card';
import { LoadingCard } from './cards/loading-card';
import { NavigationCard } from './cards/navigation-card';
import { NoSchemasCard } from './cards/no-schemas-card';
import { NotFoundCard } from './cards/not-found-card';
import { NotificationsCard } from './cards/notifications-card';
import { ObservabilityCard } from './cards/observability-card';
import { PlanBillingCard } from './cards/plan-billing-card';
import { PlanTierCard } from './cards/plan-tier-card';
import { ProfileCard } from './cards/profile-card';
import { QueryVolumeCard } from './cards/query-volume-card';
import { ReportIssueCard } from './cards/report-issue-card';
import { ScheduleMaintenanceCard } from './cards/schedule-maintenance-card';
import { SchemaTabsCard } from './cards/schema-tabs-card';
import { SetupProjectCard } from './cards/setup-project-card';
import { ShortcutsCard } from './cards/shortcuts-card';
import { StorageCard } from './cards/storage-card';
import { StyleOverviewCard } from './cards/style-overview-card';
import { TeamCard } from './cards/team-card';
import { TypographySpecimenCard } from './cards/typography-specimen-card';
import { UiElementsCard } from './cards/ui-elements-card';
import { UploadAssetsCard } from './cards/upload-assets-card';
import { UsageCard } from './cards/usage-card';
import { YourThemeCard } from './cards/your-theme-card';
import { COLUMN_CLASS, stagger, SUBCOLUMN_CLASS, WallShell, WIDE_COLUMN_CLASS } from './wall-shell';

/**
 * Wall 02 · workspace — product archetypes. Eight tracks; C3 is the wide
 * column with the UI-elements tray and the 2×2 forms subgrid.
 */
export function WallWorkspace() {
  return (
    <WallShell wall="workspace" tracks="grid-cols-[repeat(8,352px)]">
      <div className={COLUMN_CLASS} style={stagger(0)}>
        <StyleOverviewCard />
        <TypographySpecimenCard />
        <EnvironmentsCard />
        <InvoiceCard />
        <YourThemeCard />
        <QueryVolumeCard />
        <AccountSecurityCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(1)}>
        <IconGridCard />
        <ApiKeysCard />
        <ObservabilityCard />
        <BillingAddressCard />
        <DatabaseStatusCard />
        <CreateTableCard />
        <StorageCard />
      </div>
      <div className={WIDE_COLUMN_CLASS} style={stagger(2)}>
        <DeploymentsCard />
        <UiElementsCard />
        {/* Independent stacks (see wall-platform): no row alignment, no voids. */}
        <div className="grid grid-cols-2 items-start gap-6">
          <div className={SUBCOLUMN_CLASS}>
            <ShortcutsCard />
            <NotFoundCard />
          </div>
          <div className={SUBCOLUMN_CLASS}>
            <AssignIssueCard />
            <TeamCard />
          </div>
        </div>
        <SchemaTabsCard />
        <CommandPaletteCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(3)}>
        <LoadingCard />
        <ClientShareCard />
        <NoSchemasCard />
        <ReportIssueCard />
        <InviteTeammateCard />
        <SetupProjectCard />
        <LabelsCard />
        <DockCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(4)}>
        <FeedbackCard />
        <ScheduleMaintenanceCard />
        <LatencyReportCard />
        <ProfileCard />
        <NotificationsCard />
        <PlanTierCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(5)}>
        <DeployLoadCard />
        <UploadAssetsCard />
        <AnalyticsCard />
        <UsageCard />
        <PlanBillingCard />
      </div>
      <div className={COLUMN_CLASS} style={stagger(6)}>
        <AnomalyAlertCard />
        <LiveQueryStreamCard />
        <ActiveConnectionsCard />
        <ActivityPrefsCard />
        <AlertsCard />
        <AssistantCard />
        <NavigationCard />
      </div>
    </WallShell>
  );
}
