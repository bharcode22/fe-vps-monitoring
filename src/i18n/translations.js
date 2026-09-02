// Modular Locales (Indonesian)
import idCommon from './locales/id/common.json';
import idNavbar from './locales/id/navbar.json';
import idDashboard from './locales/id/dashboard.json';
import idServerModal from './locales/id/serverModal.json';
import idPodActivity from './locales/id/podActivity.json';
import idMultimedia from './locales/id/multimedia.json';
import idStorage from './locales/id/storage.json';
import idMasterSync from './locales/id/masterSync.json';
import idPodLogs from './locales/id/podLogs.json';
import idUserActivity from './locales/id/userActivity.json';
import idDiagnostics from './locales/id/diagnostics.json';
import idDatabaseSync from './locales/id/databaseSync.json';
import idInstallation from './locales/id/installation.json';
import idEnvManager from './locales/id/envManager.json';

// Modular Locales (English)
import enCommon from './locales/en/common.json';
import enNavbar from './locales/en/navbar.json';
import enDashboard from './locales/en/dashboard.json';
import enServerModal from './locales/en/serverModal.json';
import enPodActivity from './locales/en/podActivity.json';
import enMultimedia from './locales/en/multimedia.json';
import enStorage from './locales/en/storage.json';
import enMasterSync from './locales/en/masterSync.json';
import enPodLogs from './locales/en/podLogs.json';
import enUserActivity from './locales/en/userActivity.json';
import enDiagnostics from './locales/en/diagnostics.json';
import enDatabaseSync from './locales/en/databaseSync.json';
import enInstallation from './locales/en/installation.json';
import enEnvManager from './locales/en/envManager.json';

export const translations = {
  id: {
    common: idCommon,
    navbar: idNavbar,
    dashboard: idDashboard,
    serverModal: idServerModal,
    podActivity: idPodActivity,
    multimedia: idMultimedia,
    storage: idStorage,
    masterSync: idMasterSync,
    podLogs: idPodLogs,
    userActivity: idUserActivity,
    diagnostics: idDiagnostics,
    databaseSync: idDatabaseSync,
    installation: idInstallation,
    envManager: idEnvManager,

    // Legacy Flat Keys for Backward Compatibility
    appTitle: "VPS & POD Monitor",
    appSubtitle: "Monitoring Real-time Bandwidth, CPU, RAM & GPU Server",
    totalDownloadSpeed: "Total Kecepatan Download",
    totalUploadSpeed: "Total Kecepatan Upload",
    avgCpuUsage: "Rata-rata CPU Load",
    avgGpuUsage: "Rata-rata GPU Load",
    onlineStatus: "Status Server Online",
    connectedInfrastructure: "Daftar Infrastruktur Terhubung",
    searchPlaceholder: "Cari server, IP, GPU, POD...",
    all: "Semua",
    vpsOnly: "🖥️ VPS",
    allPods: "📦 POD Semua",
    podV3: "⚡ POD v3",
    podV2: "🐢 POD v2",
    normalView: "Tampilan Normal",
    tvMode: "Mode TV Monitor",
    refresh: "Refresh Data",
    addServer: "Tambah Server Baru",
    liveSocketConnected: "WebSocket Real-time Terhubung",
    liveSocketConnecting: "Menghubungkan WebSocket...",
    used: "Terpakai",
    free: "Sisa",
    capacity: "Kapasitas Total",
    cpuLoad: "CPU Load",
    ramMemory: "RAM Memory",
    diskStorage: "Disk Storage",
    bandwidthSpeed: "Kecepatan Bandwidth",
    gpuHardware: "GPU Hardware",
    download: "Download",
    upload: "Upload",
    hideChart: "Sembunyikan Grafik",
    showChart: "Tampilkan Grafik Real-time",
    editConfig: "Edit Konfigurasi",
    deleteServer: "Hapus Server",
    noGpu: "Tidak Ada GPU Hardware",
    hostServer: "Host Server Lokal",
    infrastructureType: "Tipe Infrastruktur",
    sshAuthMethod: "Metode Otentikasi SSH",
    registrationDate: "Waktu Pendaftaran",
    realtimeTrendChart: "Grafik Tren Real-time Server",
    language: "Bahasa",
    editServerTitle: "Edit Konfigurasi Server",
    addServerTitle: "Tambah Target VPS / POD",
    vpsServer: "🖥️ VPS Server",
    podContainer: "📦 POD Container",
    podVersion: "Versi POD",
    v3Version: "⚡ Versi 3 (v3 - Terbaru)",
    v2Version: "🐢 Versi 2 (v2 - Legacy)",
    serverName: "Nama Server / Label",
    vpsNamePlaceholder: "Contoh: VPS Singapore - Web Server",
    podNamePlaceholder: "Contoh: POD Node 08 - API Container",
    ipAddressHost: "IP Address / Hostname",
    ipAddressPlaceholder: "192.168.1.100 atau vps.myhost.com",
    sshPort: "Port SSH",
    sshUsername: "Username SSH",
    authMethod: "Metode Autentikasi",
    passwordAuth: "Password SSH",
    keyAuth: "Private Key (.pem/rsa)",
    sshPassword: "Password SSH",
    passwordPlaceholder: "Masukkan password SSH server",
    sshPrivateKey: "SSH Private Key (OpenSSH Format)",
    privateKeyPlaceholder: "-----BEGIN RSA PRIVATE KEY-----...",
    testingSsh: "Menguji SSH...",
    testConnection: "Uji Koneksi",
    cancel: "Batal",
    saving: "Menyimpan...",
    saveChanges: "Simpan Perubahan",
    saveVps: "Simpan Server"
  },
  en: {
    common: enCommon,
    navbar: enNavbar,
    dashboard: enDashboard,
    serverModal: enServerModal,
    podActivity: enPodActivity,
    multimedia: enMultimedia,
    storage: enStorage,
    masterSync: enMasterSync,
    podLogs: enPodLogs,
    userActivity: enUserActivity,
    diagnostics: enDiagnostics,
    databaseSync: enDatabaseSync,
    installation: enInstallation,
    envManager: enEnvManager,

    // Legacy Flat Keys for Backward Compatibility
    appTitle: "VPS & POD Monitor",
    appSubtitle: "Real-time Server Bandwidth, CPU, RAM & GPU Monitoring",
    totalDownloadSpeed: "Total Download Speed",
    totalUploadSpeed: "Total Upload Speed",
    avgCpuUsage: "Average CPU Load",
    avgGpuUsage: "Average GPU Load",
    onlineStatus: "Servers Online Status",
    connectedInfrastructure: "Connected Infrastructure List",
    searchPlaceholder: "Search server, IP, GPU, POD...",
    all: "All",
    vpsOnly: "🖥️ VPS",
    allPods: "📦 All PODs",
    podV3: "⚡ POD v3",
    podV2: "🐢 POD v2",
    normalView: "Normal View",
    tvMode: "TV Monitor Mode",
    refresh: "Refresh Data",
    addServer: "Add New Server",
    liveSocketConnected: "WebSocket Connected Real-time",
    liveSocketConnecting: "Connecting WebSocket...",
    used: "Used",
    free: "Free",
    capacity: "Total Capacity",
    cpuLoad: "CPU Load",
    ramMemory: "RAM Memory",
    diskStorage: "Disk Storage",
    bandwidthSpeed: "Bandwidth Speed",
    gpuHardware: "GPU Hardware",
    download: "Download",
    upload: "Upload",
    hideChart: "Hide Chart",
    showChart: "Show Live Chart",
    editConfig: "Edit Config",
    deleteServer: "Delete Server",
    noGpu: "No GPU Hardware",
    hostServer: "Local Host Server",
    infrastructureType: "Infrastructure Type",
    sshAuthMethod: "SSH Authentication Method",
    registrationDate: "Registration Date",
    realtimeTrendChart: "Real-time Server Trend Chart",
    language: "Language",
    editServerTitle: "Edit Server Configuration",
    addServerTitle: "Add Target VPS / POD",
    vpsServer: "🖥️ VPS Server",
    podContainer: "📦 POD Container",
    podVersion: "POD Version",
    v3Version: "⚡ Version 3 (v3 - Latest)",
    v2Version: "🐢 Version 2 (v2 - Legacy)",
    serverName: "Server / Label Name",
    vpsNamePlaceholder: "Example: VPS Singapore - Web Server",
    podNamePlaceholder: "Example: POD Node 08 - API Container",
    ipAddressHost: "IP Address / Hostname",
    ipAddressPlaceholder: "192.168.1.100 or vps.myhost.com",
    sshPort: "SSH Port",
    sshUsername: "SSH Username",
    authMethod: "Authentication Method",
    passwordAuth: "SSH Password",
    keyAuth: "Private Key (.pem/rsa)",
    sshPassword: "SSH Password",
    passwordPlaceholder: "Enter server SSH password",
    sshPrivateKey: "SSH Private Key (OpenSSH Format)",
    privateKeyPlaceholder: "-----BEGIN RSA PRIVATE KEY-----...",
    testingSsh: "Testing SSH...",
    testConnection: "Test Connection",
    cancel: "Cancel",
    saving: "Saving...",
    saveChanges: "Save Changes",
    saveVps: "Save Server"
  }
};
