import React from 'react';
import {
  Terminal,
  X,
  Server,
  FolderOpen,
  RefreshCw,
  FileCode,
  Download,
  Check,
  Trash2,
  FileSpreadsheet,
  Code,
  Edit3,
  Copy,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function PodInfluxCliExportModal({
  isOpen,
  onClose,
  activePod,
  selectedPodId,
  selectedBuckets = [],
  selectedMeasurements = [],
  cliTab,
  setCliTab,
  exportFiles = [],
  exportFilesLoading,
  loadPodExportFiles,
  handleDirectDownload,
  handleCopyScpCommand,
  copiedScpFilename,
  handleDeleteExportFile,
  deletingFilename,
  cliCustomFilename,
  setCliCustomFilename,
  defaultCliFilename,
  activeCliFilename,
  cliEditQueryMode,
  setCliEditQueryMode,
  cliManualFluxOverride,
  setCliManualFluxOverride,
  cliFluxQuery,
  cliIncludeLimit,
  setCliIncludeLimit,
  rowLimit,
  handleCopyCliCommand,
  copiedCliCmd,
  activeCliCommand,
  handleRunCliExportOnPod,
  cliExecuting,
  cliExecutionResult,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-amber-950/20 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>Export Data via Influx CLI (--raw)</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono border border-amber-500/30">
                  Native Annotated CSV
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                POD Terpilih: <strong className="text-slate-200">{activePod?.name || 'POD'}</strong> ({activePod?.host})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          {/* Tab Selector: Only Tab 1 (SSH) and Tab 4 (Files) */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setCliTab('pod_ssh')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                cliTab === 'pod_ssh'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>1. Terminal SSH di POD</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCliTab('files');
                loadPodExportFiles?.(selectedPodId);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                cliTab === 'files'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>2. Berkas di POD ({exportFiles.length})</span>
            </button>
          </div>

          {/* Tab 2 Content: Riwayat Berkas di POD */}
          {cliTab === 'files' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-slate-200 font-semibold flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>
                      Berkas Hasil Ekspor di POD:{' '}
                      <code className="text-amber-300 font-mono text-[11px]">/home/pod/exports/</code>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Total {exportFiles.length} berkas CSV tersimpan di hard drive unit {activePod?.name || 'POD'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadPodExportFiles?.(selectedPodId)}
                  disabled={exportFilesLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${exportFilesLoading ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {exportFilesLoading && exportFiles.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                  <p className="text-slate-400 text-xs">Memeriksa berkas ekspor di POD via SSH...</p>
                </div>
              ) : exportFiles.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="font-semibold text-slate-300 text-sm">Belum Ada Berkas Hasil Ekspor</h4>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    Jalankan ekspor CLI untuk membuat berkas CSV di POD.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {exportFiles.map((file) => (
                    <div
                      key={file.fileName}
                      className="p-3 bg-slate-950 hover:bg-slate-900/80 rounded-xl border border-slate-800/80 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 flex-shrink-0 mt-0.5">
                            <FileCode className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold text-slate-200 truncate select-all" title={file.fileName}>
                              {file.fileName}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-slate-800 text-amber-300 rounded font-semibold text-[10px]">
                                {file.sizeHuman}
                              </span>
                              <span>{file.modifiedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Buttons for file */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleDirectDownload?.(file)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition"
                            title="Download berkas ini langsung ke komputer/klien Anda melalui browser"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download ke Laptop Ini</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyScpCommand?.(file)}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Salin perintah terminal SCP untuk download via command line"
                          >
                            {copiedScpFilename === file.fileName ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">SCP Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                                <span>Salin Perintah SCP</span>
                              </>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteExportFile?.(file.fileName)}
                          disabled={deletingFilename === file.fileName}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 border border-slate-700/60 rounded-lg text-xs transition flex items-center gap-1 disabled:opacity-50"
                          title="Hapus berkas ini dari POD"
                        >
                          {deletingFilename === file.fileName ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Target Filename Input */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nama Berkas Target (.csv):</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCliCustomFilename('chair.csv')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition border ${
                        activeCliFilename === 'chair.csv'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                      }`}
                    >
                      chair.csv
                    </button>
                    <button
                      type="button"
                      onClick={() => setCliCustomFilename(`${selectedMeasurements[0] || 'export'}.csv`)}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[11px] font-mono transition border border-slate-800"
                    >
                      {selectedMeasurements[0] || 'measurement'}.csv
                    </button>
                    <button
                      type="button"
                      onClick={() => setCliCustomFilename('')}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[11px] transition border border-slate-800"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cliCustomFilename}
                    onChange={(e) => setCliCustomFilename(e.target.value)}
                    placeholder={defaultCliFilename}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>
                    Target path di POD: <code className="text-amber-300 font-mono">/home/pod/exports/{activeCliFilename}</code>
                  </span>
                  {cliCustomFilename && (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Nama Kustom Aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Flux Query Customizer / Viewer */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Query Flux yang Digunakan:</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-mono border border-slate-700">
                      bucket: {selectedBuckets.join(', ') || 'pod_monitoring'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!cliEditQueryMode) {
                          setCliManualFluxOverride(cliFluxQuery);
                        }
                        setCliEditQueryMode(!cliEditQueryMode);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                        cliEditQueryMode
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{cliEditQueryMode ? 'Kustomisasi Aktif' : 'Edit Query Manual'}</span>
                    </button>
                    {cliEditQueryMode && (
                      <button
                        type="button"
                        onClick={() => {
                          const sample = `from(bucket: "power_monitoring")\n  |> range(start: 2026-08-31T00:00:00Z, stop: 2026-09-03T00:00:00Z)\n  |> filter(fn: (r) => r._measurement == "mod_chair")`;
                          setCliManualFluxOverride(sample);
                          setCliCustomFilename('chair.csv');
                        }}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded text-xs border border-amber-500/30 transition font-mono"
                        title="Muat contoh query power_monitoring chair.csv"
                      >
                        Contoh: chair.csv
                      </button>
                    )}
                  </div>
                </div>

                {cliEditQueryMode ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={cliManualFluxOverride}
                      onChange={(e) => setCliManualFluxOverride(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-900 border border-cyan-500/40 rounded-lg p-2.5 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="from(bucket: ...)..."
                    />
                    <div className="flex items-center justify-end text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setCliEditQueryMode(false);
                          setCliManualFluxOverride('');
                        }}
                        className="text-amber-400 hover:underline"
                      >
                        Reset ke Filter UI
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <pre className="p-2.5 bg-slate-900/80 text-cyan-300/90 font-mono text-[10px] rounded-lg border border-slate-800/80 overflow-x-auto whitespace-pre-wrap max-h-24 select-all">
                      {cliFluxQuery}
                    </pre>
                  </div>
                )}
              </div>

              {/* Options: Full Dump vs Limit */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cliIncludeLimit}
                      onChange={(e) => setCliIncludeLimit(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-900"
                    />
                    <span className="font-semibold text-slate-200 text-xs">
                      Batasi jumlah baris ({rowLimit || 1000} baris)
                    </span>
                  </label>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      !cliIncludeLimit
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {!cliIncludeLimit ? 'Mode Full Dump (Semua Data Historis)' : `Limit: ${rowLimit || 1000}`}
                  </span>
                </div>
              </div>

              {/* Command Display Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Perintah Influx CLI (Terminal SSH di POD)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCliCommand}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedCliCmd ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Perintah</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative group">
                  <pre className="p-3.5 bg-slate-950 text-amber-300 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56 select-all">
                    {activeCliCommand}
                  </pre>
                </div>
              </div>

              {/* Direct Server Execution Button */}
              <div className="p-3 bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Jalankan Ekspor Otomatis di POD
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Eksekusi via SSH dan simpan langsung ke <code className="text-amber-300 font-mono">/home/pod/exports/</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunCliExportOnPod}
                  disabled={cliExecuting || !selectedPodId}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition whitespace-nowrap disabled:opacity-50"
                >
                  {cliExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengekspor di POD...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Jalankan di POD</span>
                    </>
                  )}
                </button>
              </div>

              {/* Execution Result Banner */}
              {cliExecutionResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                    cliExecutionResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {cliExecutionResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Ekspor Influx CLI di POD Berhasil!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>Gagal Menjalankan Ekspor di POD</span>
                      </>
                    )}
                  </div>

                  {cliExecutionResult.success && cliExecutionResult.data && (
                    <div className="space-y-2 text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      <div className="font-mono">
                        <div>
                          <strong className="text-emerald-400">Lokasi File di POD:</strong>{' '}
                          {cliExecutionResult.data.filePath}
                        </div>
                        <div>
                          <strong className="text-emerald-400">Rincian Ukuran:</strong>{' '}
                          {cliExecutionResult.data.outputSummary}
                        </div>
                      </div>

                      {/* Instant Action Buttons in Result Banner */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleDirectDownload?.({ fileName: cliExecutionResult.data.fileName })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download ke Laptop Ini</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyScpCommand?.({
                              fileName: cliExecutionResult.data.fileName,
                              scpCommand: `scp ${activePod?.username || 'pod'}@${activePod?.host}:${
                                cliExecutionResult.data.filePath
                              } ~/Downloads/`,
                            })
                          }
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                        >
                          {copiedScpFilename === cliExecutionResult.data.fileName ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">SCP Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Terminal className="w-3.5 h-3.5 text-amber-400" />
                              <span>Salin Perintah SCP</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCliTab('files')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ml-auto"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Lihat Riwayat Berkas ({exportFiles.length})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!cliExecutionResult.success && (
                    <p className="text-rose-300">{cliExecutionResult.error}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {cliTab !== 'files' && (
              <button
                type="button"
                onClick={handleCopyCliCommand}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
              >
                {copiedCliCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCliCmd ? 'Tersalin!' : 'Salin Perintah CLI'}</span>
              </button>
            )}
            {cliTab === 'files' && (
              <button
                type="button"
                onClick={() => loadPodExportFiles?.(selectedPodId)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Segarkan Daftar Berkas</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
