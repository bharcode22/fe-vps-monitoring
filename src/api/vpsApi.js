/**
 * ============================================================================
 * VPS API CLIENT (MODULAR BARREL ENTRYPOINT)
 * ============================================================================
 * File ini mengorganisir dan me-reexport semua API endpoint modular dari folder ./modules/
 * untuk menjaga backward compatibility 100% dengan kode eksisting.
 */

// 1. Core HTTP Client & Auth Headers
export * from './modules/client';

// 2. Server, POD & Database Infrastructure Management
export * from './modules/serverApi';

// 3. Docker Containers, PM2 Apps, Screen Apps, & Remote Scripts
export * from './modules/dockerPm2Api';

// 4. RabbitMQ Server Connections & Live Queues
export * from './modules/rabbitmqApi';

// 5. Automated Installation, Bundles, MinIO, Env Manager, & Deployment History
export * from './modules/installationApi';

// 6. AWS S3 Storage, POD Storage Metrics, Docker Cleanup, & Flow Editor
export * from './modules/storageApi';

// 7. Master Multimedia Catalog, Chunk Upload, Fleet Inspect, & RabbitMQ Sync
export * from './modules/multimediaSyncApi';
