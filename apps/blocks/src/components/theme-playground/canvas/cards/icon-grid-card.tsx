import {
  ArrowDownToLine,
  Bell,
  BookOpen,
  Box,
  Braces,
  Calendar,
  Check,
  ChevronRight,
  Clipboard,
  Cloud,
  Code,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  Folder,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Link,
  Lock,
  Mail,
  MapPin,
  Package,
  Play,
  Search,
  Settings,
  Shield,
  Star,
  Terminal,
  Trash2,
  Upload,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { SinkCard } from './sink-card';

const ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Search', icon: Search },
  { name: 'Settings', icon: Settings },
  { name: 'Bell', icon: Bell },
  { name: 'Star', icon: Star },
  { name: 'Download', icon: Download },
  { name: 'Upload', icon: Upload },
  { name: 'Trash2', icon: Trash2 },
  { name: 'Copy', icon: Copy },
  { name: 'Check', icon: Check },
  { name: 'ChevronRight', icon: ChevronRight },
  { name: 'Database', icon: Database },
  { name: 'Cloud', icon: Cloud },
  { name: 'Lock', icon: Lock },
  { name: 'KeyRound', icon: KeyRound },
  { name: 'Globe', icon: Globe },
  { name: 'Mail', icon: Mail },
  { name: 'Calendar', icon: Calendar },
  { name: 'FileText', icon: FileText },
  { name: 'Folder', icon: Folder },
  { name: 'Terminal', icon: Terminal },
  { name: 'Code', icon: Code },
  { name: 'Braces', icon: Braces },
  { name: 'GitBranch', icon: GitBranch },
  { name: 'Zap', icon: Zap },
  { name: 'Cpu', icon: Cpu },
  { name: 'HardDrive', icon: HardDrive },
  { name: 'Layers', icon: Layers },
  { name: 'Box', icon: Box },
  { name: 'Package', icon: Package },
  { name: 'Link', icon: Link },
  { name: 'Eye', icon: Eye },
  { name: 'Flag', icon: Flag },
  { name: 'MapPin', icon: MapPin },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Shield', icon: Shield },
  { name: 'Play', icon: Play },
  { name: 'Filter', icon: Filter },
  { name: 'Clipboard', icon: Clipboard },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'ArrowDownToLine', icon: ArrowDownToLine },
];

export function IconGridCard() {
  return (
    <SinkCard contentClassName="flex flex-col gap-3">
      <p className="text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">Lucide · 40 of 1,500</p>
      <div className="grid grid-cols-8 gap-0.5" role="group" aria-label="Icon grid">
        {ICONS.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            className="flex size-9 items-center justify-center rounded-sm transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </SinkCard>
  );
}
