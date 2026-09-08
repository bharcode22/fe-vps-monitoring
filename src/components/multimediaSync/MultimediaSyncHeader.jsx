import React from 'react';
import { ArrowLeft, Shuffle, Zap, UploadCloud } from 'lucide-react';

export default function MultimediaSyncHeader({
  onBack,
  onOpenDirectS3Modal,
  onOpenUploadModal
}) {
  return (
    <div className="shrink-0 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-purple-400 rounded-xl border border-purple-500/30 transition-all cursor-pointer shadow-lg shadow-purple-500/5 flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <ArrowLeft size={15} />
            <span>Kembali</span>
          </button>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 p-2 rounded-xl border border-purple-500/40 text-purple-300">
              <Shuffle size={18} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Content Management
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                  Master API ➔ RabbitMQ ➔ POD V3
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pilih konten multimedia di panel kiri, pantau container <code className="text-purple-300 font-mono">mobile-synch</code> di panel kanan, lalu kirim trigger sinkronisasi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenDirectS3Modal && (
          <button
            onClick={onOpenDirectS3Modal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
            title="Upload Berkecepatan Tinggi Langsung ke AWS S3 + Auto SHA-256 Forensik & Simpan ke Master DB"
          >
            <Zap size={14} className="fill-slate-950 text-slate-950" />
            <span>Direct S3 Upload</span>
          </button>
        )}

        {onOpenUploadModal && (
          <button
            onClick={onOpenUploadModal}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white border border-purple-400/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0"
            title="Unggah Konten Multimedia Master (Cara Reguler)"
          >
            <UploadCloud size={14} />
            <span>Upload Reguler</span>
          </button>
        )}
      </div>
    </div>
  );
}
