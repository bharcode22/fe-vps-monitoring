import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useMultimediaSyncData } from '../hooks/useMultimediaSyncData';
import { useDirectS3Upload } from '../context/DirectS3UploadContext';

// Extracted Modular Components
import MultimediaSyncHeader from '../components/multimediaSync/MultimediaSyncHeader';
import MasterCatalogPanel from '../components/multimediaSync/MasterCatalogPanel';
import FleetMatrixPanel from '../components/multimediaSync/FleetMatrixPanel';
import SyncTriggerBottomBar from '../components/multimediaSync/SyncTriggerBottomBar';

// Modals
import ConfirmResaveModal from '../components/multimediaSync/modals/ConfirmResaveModal';
import DeleteMasterTrackModal from '../components/multimediaSync/modals/DeleteMasterTrackModal';
import TrackInfoModal from '../components/multimediaSync/modals/TrackInfoModal';
import DockerLogModal from '../components/server/DockerLogModal';
import MultimediaUploadModal from '../components/content/MultimediaUploadModal';
import FileIntegrityModal from '../components/content/FileIntegrityModal';
import MediaPreviewModal from '../components/content/MediaPreviewModal';

export default function MultimediaRabbitMqSyncPage({ onBack, onNavigateView }) {
  const { openDirectS3Modal } = useDirectS3Upload();

  // Encapsulated Domain Hook
  const {
    // Master data & search
    multimediaItems,
    pagination,
    searchQuery,
    setSearchQuery,
    isLoadingMaster,
    masterError,
    selectedItem,
    targetCoverUrl,
    loadMasterMultimedia,
    handleSearchSubmit,
    handlePageChange,
    handleSelectTrack,

    // Fleet state & actions
    fleetPods,
    isLoadingFleet,
    fleetError,
    inspectFleet,
    handleInspectSinglePod,
    handleControlSinglePod,

    // Stats
    onlinePodsCount,
    runningContainersCount,
    exitedContainersCount,

    // File Matrix & Downloads
    podFilesMatrix,
    expandedPodFiles,
    isCheckingAllFiles,
    s3FolderFilesMap,
    downloadProgressMap,
    actionLoadingMap,
    handleCheckSinglePodFiles,
    handleToggleExpandPodFiles,
    handleCheckAllPodsFiles,
    handleDownloadSingleMissingFile,
    handleDownloadAllMissingForPod,
    handleDeleteSingleFileOnPod,
    handleDeleteAllFilesOnPod,

    // Integrity Diagnostics
    integrityMap,
    integrityModal,
    setIntegrityModal,
    handleCheckFileIntegrity,

    // Modals
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    isTriggeringResave,
    handleExecuteTrigger,
    deleteTargetItem,
    setDeleteTargetItem,
    isDeletingItem,
    handleConfirmDelete,
    trackInfoModalItem,
    setTrackInfoModalItem,
    logModalPod,
    setLogModalPod,
    isUploadModalOpen,
    setIsUploadModalOpen,
    previewModal,
    handleOpenMediaPreview,
    handleCloseMediaPreview,

    // Toast
    successToast,
    setSuccessToast
  } = useMultimediaSyncData();

  const handleOpenConfirmModal = () => {
    if (!selectedItem?.sound_scape) {
      alert('Silakan pilih salah satu konten multimedia terlebih dahulu.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.4rem)] max-h-[calc(100vh-5.4rem)] text-slate-100 animate-in fade-in duration-300 overflow-hidden">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/95 text-slate-950 font-bold text-xs shadow-2xl shadow-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast('')} className="ml-2 text-slate-900 hover:text-black cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Top Navigation & Action Header */}
      <MultimediaSyncHeader
        onBack={onBack}
        onOpenDirectS3Modal={() => openDirectS3Modal(() => loadMasterMultimedia(1, ''))}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />

      {/* 2. Main 2-Column Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-0">
        {/* Left Column (5 cols): Cloud Catalog Panel */}
        <MasterCatalogPanel
          items={multimediaItems}
          selectedItem={selectedItem}
          pagination={pagination}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onRefresh={() => loadMasterMultimedia(pagination.page, searchQuery)}
          isLoading={isLoadingMaster}
          error={masterError}
          onSelectTrack={handleSelectTrack}
          onPageChange={handlePageChange}
          onOpenTrackInfo={setTrackInfoModalItem}
          onDeleteTrack={setDeleteTargetItem}
          onToast={setSuccessToast}
        />

        {/* Right Column (7 cols): POD Fleet Readiness & Matrix Panel */}
        <FleetMatrixPanel
          selectedItem={selectedItem}
          targetCoverUrl={targetCoverUrl}
          fleetPods={fleetPods}
          isLoadingFleet={isLoadingFleet}
          fleetError={fleetError}
          onlinePodsCount={onlinePodsCount}
          runningContainersCount={runningContainersCount}
          exitedContainersCount={exitedContainersCount}
          podFilesMatrix={podFilesMatrix}
          expandedPodFiles={expandedPodFiles}
          isCheckingAllFiles={isCheckingAllFiles}
          s3FolderFilesMap={s3FolderFilesMap}
          downloadProgressMap={downloadProgressMap}
          actionLoadingMap={actionLoadingMap}
          integrityMap={integrityMap}
          onInspectFleet={inspectFleet}
          onCheckAllPodsFiles={handleCheckAllPodsFiles}
          onInspectSinglePod={handleInspectSinglePod}
          onControlSinglePod={handleControlSinglePod}
          onCheckSinglePodFiles={handleCheckSinglePodFiles}
          onToggleExpandPodFiles={handleToggleExpandPodFiles}
          onOpenLogs={setLogModalPod}
          onDownloadSingleMissingFile={handleDownloadSingleMissingFile}
          onDeleteSingleFileOnPod={handleDeleteSingleFileOnPod}
          onDownloadAllMissingForPod={handleDownloadAllMissingForPod}
          onDeleteAllFilesOnPod={handleDeleteAllFilesOnPod}
          onCheckFileIntegrity={handleCheckFileIntegrity}
          onOpenIntegrityModal={({ data, targetPod, targetFilename }) => {
            setIntegrityModal({
              isOpen: true,
              data,
              isLoading: false,
              targetPod,
              targetFilename
            });
          }}
          onToast={setSuccessToast}
        />
      </div>

      {/* 3. Bottom Inline Sync Trigger Bar */}
      <SyncTriggerBottomBar
        selectedItem={selectedItem}
        runningContainersCount={runningContainersCount}
        onlinePodsCount={onlinePodsCount}
        exitedContainersCount={exitedContainersCount}
        isTriggeringResave={isTriggeringResave}
        isLoadingFleet={isLoadingFleet}
        onOpenConfirmModal={handleOpenConfirmModal}
      />

      {/* 4. Modals */}
      {/* RabbitMQ Sync Confirmation */}
      <ConfirmResaveModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        selectedItem={selectedItem}
        targetCoverUrl={targetCoverUrl}
        onlinePodsCount={onlinePodsCount}
        totalPodsCount={fleetPods.length}
        runningContainersCount={runningContainersCount}
        exitedContainersCount={exitedContainersCount}
        isTriggeringResave={isTriggeringResave}
        onConfirm={handleExecuteTrigger}
      />

      {/* Docker Real-time Container Log Modal */}
      {logModalPod && (
        <DockerLogModal
          isOpen={!!logModalPod}
          onClose={() => setLogModalPod(null)}
          serverId={logModalPod.serverId || logModalPod.id}
          containerName={logModalPod.containerName || 'mobile-synch'}
          autoStream={true}
        />
      )}

      {/* Legacy Multimedia Batch Upload Modal */}
      <MultimediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setSuccessToast('Berhasil mengunggah multimedia master baru ke AWS S3 & Master DB!');
          loadMasterMultimedia(1, '');
        }}
      />

      {/* Delete Confirmation Modal for Master Track */}
      <DeleteMasterTrackModal
        item={deleteTargetItem}
        isDeleting={isDeletingItem}
        onClose={() => setDeleteTargetItem(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* ffprobe & Integrity Diagnostic Modal */}
      <FileIntegrityModal
        isOpen={integrityModal.isOpen}
        onClose={() => setIntegrityModal(prev => ({ ...prev, isOpen: false }))}
        data={integrityModal.data}
        isLoading={integrityModal.isLoading}
        onRedownload={integrityModal.targetPod && integrityModal.targetFilename ? () => {
          const { targetPod, targetFilename } = integrityModal;
          setIntegrityModal(prev => ({ ...prev, isOpen: false }));
          handleDownloadSingleMissingFile(targetPod, targetFilename);
        } : null}
        onOpenPreview={integrityModal.data?.status === 'healthy' && integrityModal.data?.filePath ? () => {
          const { data, targetPod, targetFilename } = integrityModal;
          const ext = (targetFilename || data.filePath || '').split('.').pop().toLowerCase();
          const category = ['mp4', 'mkv', 'avi', 'mov'].includes(ext) ? 'video' : ['wav', 'mp3', 'aac', 'flac', 'ogg'].includes(ext) ? 'audio' : 'image';
          const streamUrl = `/api/vps/content/pods/stream-media?serverId=${targetPod?.id}&filePath=${encodeURIComponent(data.filePath)}`;
          setIntegrityModal(prev => ({ ...prev, isOpen: false }));
          handleOpenMediaPreview({
            filename: targetFilename || 'Media File',
            category,
            url: streamUrl,
            sourceLabel: `POD ${targetPod?.name || targetPod?.host} • ${data.filePath}`
          });
        } : null}
      />

      {/* Master Track Payload & File Detail Modal */}
      <TrackInfoModal
        track={trackInfoModalItem}
        onClose={() => setTrackInfoModalItem(null)}
        onNavigateView={onNavigateView}
        onToast={setSuccessToast}
        onOpenMediaPreview={handleOpenMediaPreview}
      />

      {/* Media Player / Preview Modal */}
      <MediaPreviewModal
        isOpen={previewModal.isOpen}
        file={previewModal.file}
        onClose={handleCloseMediaPreview}
      />
    </div>
  );
}
