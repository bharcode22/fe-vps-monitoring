import {
  LayoutDashboard,
  Server,
  Download,
  Zap,
  Layers,
  Database,
  HardDrive,
  Volume2,
  FileCode,
  Shuffle,
  Wrench
} from 'lucide-react';

/**
 * Centralized Navigation Configuration
 * Optimized into 2 primary direct tabs and 2 streamlined dropdown groups
 * for maximum spaciousness on all screens (including 13"-15" MacBook displays).
 */

// Top-level direct navigation items (Minimal & spacious)
export const PRIMARY_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    authRequired: false
  },
  {
    id: 'server-list',
    label: 'Server List',
    icon: Server,
    authRequired: true
  }
];

// 2 Well-Balanced Dropdown Groups
export const NAV_DROPDOWN_GROUPS = [
  {
    groupId: 'db-topics',
    label: 'Database & Topics',
    icon: Database,
    badge: 'DB',
    color: 'amber',
    items: [
      {
        id: 'sync',
        label: 'Database Sync',
        desc: 'Sinkronisasi Tabel & Data PostgreSQL',
        icon: Zap,
        colorClass: 'text-amber-400',
        bgActiveClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      },
      {
        id: 'master-pod-sync',
        aliases: ['master-sync'],
        label: 'Master POD Sync Matrix',
        desc: 'Audit & Sync Tabel Master ke Seluruh POD V3',
        icon: Database,
        colorClass: 'text-cyan-400',
        bgActiveClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      },
      {
        id: 'pod-topic-debugger',
        aliases: ['pod-topics'],
        label: 'POD Topic Matrix',
        desc: 'Audit pod_topics & socket_topics (regenesis)',
        icon: Layers,
        colorClass: 'text-teal-400',
        bgActiveClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
      },
      {
        id: 'metadata-comparison',
        label: 'Compare Metadata',
        desc: 'Perbandingan Skema & Data RDS',
        icon: Database,
        colorClass: 'text-purple-400',
        bgActiveClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      },
      {
        id: 'sounds-comparison',
        label: 'Compare Sounds',
        desc: 'Sinkronisasi & Cek File Audio MinIO/S3',
        icon: Volume2,
        colorClass: 'text-sky-400',
        bgActiveClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      }
    ]
  },
  {
    groupId: 'system-tools',
    label: 'System & Tools',
    icon: Wrench,
    badge: 'Tools',
    color: 'cyan',
    items: [
      {
        id: 'storage-manager',
        aliases: ['storage', 'content-manager', 'content'],
        label: 'Storage & Docker Manager',
        desc: 'Pembersih Docker Junk & Media Disk 1TB',
        icon: HardDrive,
        colorClass: 'text-cyan-400',
        bgActiveClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      },
      {
        id: 'env-manager',
        label: 'Environment Manager',
        desc: 'Kelola & Bandingkan File .env Server',
        icon: FileCode,
        colorClass: 'text-emerald-400',
        bgActiveClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      },
      {
        id: 'rabbitmq',
        label: 'RabbitMQ Monitor',
        desc: 'Pantau Antrean Queue & Consumer',
        icon: Shuffle,
        colorClass: 'text-purple-400',
        bgActiveClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      },
      {
        id: 'installation',
        aliases: ['instalation'],
        label: 'Installation Guide',
        desc: 'Panduan & Skrip Instalasi Server',
        icon: Download,
        colorClass: 'text-blue-400',
        bgActiveClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      }
    ]
  }
];

/**
 * Helper to check if any item in a dropdown group is active
 */
export function isGroupActive(group, currentView) {
  return group.items.some(item => {
    if (item.id === currentView) return true;
    if (item.aliases && item.aliases.includes(currentView)) return true;
    return false;
  });
}

/**
 * Get the active item label in a group
 */
export function getActiveGroupItemLabel(group, currentView) {
  const matched = group.items.find(item => {
    if (item.id === currentView) return true;
    if (item.aliases && item.aliases.includes(currentView)) return true;
    return false;
  });
  return matched ? matched.label : group.label;
}
