import {
  Download,
  Layers,
  FileCode,
  Cpu,
  Play,
  PackageCheck,
  Globe
} from 'lucide-react';

// Backend Microservices List (POD v3)
export const POD_APPS = [
  { id: 'mobile-api', label: 'Mobile API', desc: 'Main Mobile Gateway Service' },
  { id: 'mobile-synch', label: 'Mobile Sync', desc: 'Data Synchronization Service' },
  { id: 'mobile-consume', label: 'Mobile Consume', desc: 'Queue Message Consumer' },
  { id: 'mobile-downloader', label: 'Mobile Downloader', desc: 'File & Asset Downloader' },
  { id: 'assist-api', label: 'Assist API', desc: 'AI & Assist Subservice' }
];

// Frontend Screen Applications List (Only small-screen and big-screen)
export const FRONTEND_APPS = [
  { id: 'small-screen', label: 'Small Screen App', minioFolder: 'Screen-Apps/small-screen-app', desc: 'Debian Application Package (small-screen)' },
  { id: 'big-screen', label: 'Big Screen App', minioFolder: 'Screen-Apps/big-screen-app', desc: 'Debian Application Package (big-screen)' }
];

// Pipeline Stages for Backend Apps
export const BACKEND_JENKINS_STAGES = [
  { id: 1, name: 'Stage 1: Clean & Download', short: '1. Download', icon: Download, desc: 'Parallel mc cp from MinIO' },
  { id: 2, name: 'Stage 2: Artifact Unzip', short: '2. Unzip', icon: Layers, desc: 'Unzip artifact-bundle zip' },
  { id: 3, name: 'Stage 3: Env & Prisma', short: '3. Config/Prisma', icon: FileCode, desc: 'Inject .env & Prisma migrate' },
  { id: 4, name: 'Stage 4: Docker Load', short: '4. Docker Load', icon: Cpu, desc: 'docker load < image.tar.gz' },
  { id: 5, name: 'Stage 5: Compose Up', short: '5. Compose Up', icon: Play, desc: 'docker compose -f ... up -d' }
];

// Pipeline Stages for Frontend Screen Apps (.deb dpkg pipeline)
export const FRONTEND_JENKINS_STAGES = [
  { id: 1, name: 'Stage 1: Clean & Download', short: '1. Download', icon: Download, desc: 'Parallel mc cp from MinIO Screen-Apps' },
  { id: 2, name: 'Stage 2: Artifact Unzip', short: '2. Unzip Bundle', icon: Layers, desc: 'Unzip artifact-bundle zip' },
  { id: 3, name: 'Stage 3: Validate .Deb', short: '3. Check .Deb', icon: PackageCheck, desc: 'Validate Debian package header' },
  { id: 4, name: 'Stage 4: Remove Old Pkg', short: '4. Remove Old', icon: Cpu, desc: 'sudo dpkg -r / --purge old version' },
  { id: 5, name: 'Stage 5: Install & Verify', short: '5. Install .Deb', icon: Globe, desc: 'sudo dpkg -i & dpkg-query verify' }
];
