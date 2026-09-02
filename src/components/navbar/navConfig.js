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
  Wrench,
  Users,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

/**
 * Centralized Navigation Configuration
 * Optimized into 2 primary direct tabs and 2 streamlined dropdown groups
 * with bilingual key support.
 */

// Top-level direct navigation items
export const PRIMARY_NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    labelKey: 'navbar.dashboard',
    icon: LayoutDashboard,
    authRequired: false
  },
  {
    id: 'server-list',
    label: 'Server List',
    labelKey: 'navbar.serverList',
    icon: Server,
    authRequired: true
  }
];

// 2 Well-Balanced Dropdown Groups
export const NAV_DROPDOWN_GROUPS = [
  {
    groupId: 'db-topics',
    label: 'Database & Topics',
    labelKey: 'navbar.groups.dbTopics',
    icon: Database,
    badge: 'DB',
    color: 'amber',
    items: [
      {
        id: 'sync',
        label: 'Database Sync',
        labelKey: 'navbar.items.databaseSync',
        desc: 'Sinkronisasi Tabel & Data PostgreSQL',
        descKey: 'navbar.items.databaseSyncDesc',
        icon: Zap,
        colorClass: 'text-amber-400',
        bgActiveClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      },
      {
        id: 'database-users',
        aliases: ['db-users', 'user-manager'],
        label: 'Database Users',
        labelKey: 'navbar.items.databaseUsers',
        desc: 'Kelola userLevel & akun di PostgreSQL Master',
        descKey: 'navbar.items.databaseUsersDesc',
        icon: Users,
        colorClass: 'text-indigo-400',
        bgActiveClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      },
      {
        id: 'master-pod-sync',
        aliases: ['master-sync'],
        label: 'Master POD Sync Matrix',
        labelKey: 'navbar.items.masterPodSync',
        desc: 'Audit & Sync Tabel Master ke Seluruh POD V3',
        descKey: 'navbar.items.masterPodSyncDesc',
        icon: Database,
        colorClass: 'text-cyan-400',
        bgActiveClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      },
      {
        id: 'tnc-sync-manager',
        label: 'T&C Sync Manager',
        labelKey: 'navbar.items.tncSync',
        desc: 'Konsolidasi & Distribusi 13 Tabel T&C (Batch)',
        descKey: 'navbar.items.tncSyncDesc',
        icon: Database,
        colorClass: 'text-blue-400',
        bgActiveClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      },
      {
        id: 'pod-logs-sync',
        aliases: ['pod-logs'],
        label: 'POD Logs Sync',
        labelKey: 'navbar.items.podLogsSync',
        desc: 'Tarik pod_logs skala besar dari POD V3 ke Master DB',
        descKey: 'navbar.items.podLogsSyncDesc',
        icon: Database,
        colorClass: 'text-rose-400',
        bgActiveClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      },
      {
        id: 'pod-topic-debugger',
        aliases: ['pod-topics'],
        label: 'POD Topic Matrix',
        labelKey: 'navbar.items.podTopicDebugger',
        desc: 'Audit pod_topics & socket_topics (regenesis)',
        descKey: 'navbar.items.podTopicDebuggerDesc',
        icon: Layers,
        colorClass: 'text-teal-400',
        bgActiveClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
      },
      {
        id: 'metadata-comparison',
        label: 'Compare Metadata',
        labelKey: 'navbar.items.metadataComparison',
        desc: 'Perbandingan Skema & Data RDS',
        descKey: 'navbar.items.metadataComparisonDesc',
        icon: Database,
        colorClass: 'text-purple-400',
        bgActiveClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      },
      {
        id: 'sounds-comparison',
        label: 'Compare Sounds',
        labelKey: 'navbar.items.soundsComparison',
        desc: 'Sinkronisasi & Cek File Audio MinIO/S3',
        descKey: 'navbar.items.soundsComparisonDesc',
        icon: Volume2,
        colorClass: 'text-sky-400',
        bgActiveClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      }
    ]
  },
  {
    groupId: 'system-tools',
    label: 'System & Tools',
    labelKey: 'navbar.groups.systemTools',
    icon: Wrench,
    badge: 'Tools',
    color: 'cyan',
    items: [
      {
        id: 'pod-activity',
        label: 'POD Activity',
        labelKey: 'navbar.items.podActivity',
        desc: 'Monitoring Keterisian & Status POB (mod_chair/pob_state)',
        descKey: 'navbar.items.podActivityDesc',
        icon: UserCheck,
        colorClass: 'text-emerald-400',
        bgActiveClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      },
      {
        id: 'storage-manager',
        aliases: ['storage', 'content-manager', 'content'],
        label: 'Storage Manager',
        labelKey: 'navbar.items.storageManager',
        desc: 'Pembersih Docker Junk & Media Disk 1TB',
        descKey: 'navbar.items.storageManagerDesc',
        icon: HardDrive,
        colorClass: 'text-cyan-400',
        bgActiveClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
      },
      {
        id: 'env-manager',
        label: 'Environment Manager',
        labelKey: 'navbar.items.envManager',
        desc: 'Kelola & Bandingkan File .env Server',
        descKey: 'navbar.items.envManagerDesc',
        icon: FileCode,
        colorClass: 'text-emerald-400',
        bgActiveClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      },
      {
        id: 'rabbitmq',
        label: 'RabbitMQ Monitor',
        labelKey: 'navbar.items.rabbitmq',
        desc: 'Pantau Antrean Queue & Consumer',
        descKey: 'navbar.items.rabbitmqDesc',
        icon: Shuffle,
        colorClass: 'text-purple-400',
        bgActiveClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      },
      {
        id: 'multimedia-sync',
        aliases: ['rabbitmq-pod-sync', 're-save-sync'],
        label: 'Content Management',
        labelKey: 'navbar.items.multimediaSync',
        desc: 'Sinkronisasi Multimedia ke mobile-synch di POD',
        descKey: 'navbar.items.multimediaSyncDesc',
        icon: Shuffle,
        colorClass: 'text-indigo-400',
        bgActiveClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      },
      {
        id: 'installation',
        aliases: ['instalation'],
        label: 'Installation Guide',
        labelKey: 'navbar.items.installation',
        desc: 'Panduan & Skrip Instalasi Server',
        descKey: 'navbar.items.installationDesc',
        icon: Download,
        colorClass: 'text-blue-400',
        bgActiveClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      },
      {
        id: 'user-activity',
        aliases: ['audit-logs', 'activity-logs', 'user-logs'],
        label: 'Audit & User Activity',
        labelKey: 'navbar.items.userActivity',
        desc: 'Pantau Pengguna Online & Audit Log (Super Admin)',
        descKey: 'navbar.items.userActivityDesc',
        icon: ShieldCheck,
        colorClass: 'text-amber-400',
        bgActiveClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        superAdminOnly: true
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
export function getActiveGroupItemLabel(group, currentView, t = null) {
  const matched = group.items.find(item => {
    if (item.id === currentView) return true;
    if (item.aliases && item.aliases.includes(currentView)) return true;
    return false;
  });
  if (matched) {
    return t && matched.labelKey ? t(matched.labelKey, null, matched.label) : matched.label;
  }
  return t && group.labelKey ? t(group.labelKey, null, group.label) : group.label;
}
