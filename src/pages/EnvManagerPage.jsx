import React, { useState, useEffect } from 'react';
import {
  fetchEnvManagerFilesApi,
  saveEnvFileApi,
  createEnvFileApi,
  deleteEnvFileApi
} from '../api/vpsApi';
import EnvHeader from '../components/envManager/EnvHeader';
import EnvSidebar from '../components/envManager/EnvSidebar';
import EnvEditor from '../components/envManager/EnvEditor';
import EnvComparator from '../components/envManager/EnvComparator';
import CreateEnvModal from '../components/envManager/CreateEnvModal';
import { useLanguage } from '../context/LanguageContext';

export default function EnvManagerPage({ onBack }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' or 'compare'
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawContent, setRawContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cloneFileTarget, setCloneFileTarget] = useState(null);

  // Load files on mount
  useEffect(() => {
    loadEnvFiles();
  }, []);

  const loadEnvFiles = async (preserveSelectedName = null) => {
    setIsLoading(true);
    try {
      const data = await fetchEnvManagerFilesApi();
      setFiles(data);

      if (data.length > 0) {
        let currentTarget = null;
        if (preserveSelectedName) {
          currentTarget = data.find(f => f.name === preserveSelectedName);
        }
        if (!currentTarget) {
          currentTarget = selectedFile ? data.find(f => f.name === selectedFile.name) : null;
        }
        if (!currentTarget) {
          currentTarget = data[0];
        }

        setSelectedFile(currentTarget);
        setRawContent(currentTarget.content || '');
      } else {
        setSelectedFile(null);
        setRawContent('');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectFile = (file) => {
    if (isDirty) {
      if (!window.confirm('Ada perubahan yang belum disimpan. Yakin ingin berpindah file?')) {
        return;
      }
    }
    setSelectedFile(file);
    setRawContent(file.content || '');
  };

  const isDirty = selectedFile ? (selectedFile.content || '') !== rawContent : false;

  const handleSaveCurrentFile = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await saveEnvFileApi(selectedFile.name, rawContent);
      showToast(`File ${selectedFile.name} berhasil disimpan!`, 'success');
      await loadEnvFiles(selectedFile.name);
    } catch (err) {
      showToast(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (filename, content) => {
    await createEnvFileApi(filename, content);
    showToast(`File ${filename} berhasil dibuat!`, 'success');
    await loadEnvFiles(filename);
  };

  const handleDuplicateFile = (file) => {
    setCloneFileTarget(file);
    setIsCreateModalOpen(true);
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus file ${file.name}?`)) {
      return;
    }
    try {
      await deleteEnvFileApi(file.name);
      showToast(`File ${file.name} berhasil dihapus.`, 'success');
      await loadEnvFiles();
    } catch (err) {
      showToast(`Gagal menghapus file: ${err.message}`, 'error');
    }
  };

  const handleResetContent = () => {
    if (selectedFile) {
      setRawContent(selectedFile.content || '');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 transition-all backdrop-blur-xl ${
          toastMessage.type === 'error'
            ? 'bg-rose-500/90 text-white border border-rose-400/50 shadow-rose-500/20'
            : 'bg-emerald-500/90 text-slate-950 border border-emerald-400/50 shadow-emerald-500/20'
        }`}>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Top Header */}
      <EnvHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedFile={selectedFile}
        isSaving={isSaving}
        isDirty={isDirty}
        onSave={handleSaveCurrentFile}
        onOpenCreateModal={() => {
          setCloneFileTarget(null);
          setIsCreateModalOpen(true);
        }}
        onRefresh={() => loadEnvFiles(selectedFile?.name)}
        onBack={onBack}
      />

      {/* Main View Body */}
      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left 1 Column: Files Sidebar */}
          <div className="lg:col-span-1">
            <EnvSidebar
              files={files}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
              onDuplicateFile={handleDuplicateFile}
              onDeleteFile={handleDeleteFile}
            />
          </div>

          {/* Right 3 Columns: Grid / Raw Editor */}
          <div className="lg:col-span-3">
            <EnvEditor
              file={selectedFile}
              rawContent={rawContent}
              setRawContent={setRawContent}
              isDirty={isDirty}
              onReset={handleResetContent}
            />
          </div>
        </div>
      ) : (
        /* Diff Comparator View */
        <EnvComparator files={files} />
      )}

      {/* Create / Clone Modal */}
      <CreateEnvModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        existingFiles={files}
        initialCloneFile={cloneFileTarget}
        onCreate={handleCreateFile}
      />
    </div>
  );
}
