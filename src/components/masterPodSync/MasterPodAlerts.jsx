import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Dismissable alert banners for error and success notifications in Master Pod Sync views.
 */
export default function MasterPodAlerts({
  error = '',
  successMsg = '',
  onClearError,
  onClearSuccess
}) {
  if (!error && !successMsg) return null;

  return (
    <div className="flex flex-col gap-3 w-full">
      {error && (
        <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-xs flex items-center justify-between animate-in fade-in duration-150">
          <span>{error}</span>
          <button
            onClick={onClearError}
            className="text-red-400 hover:text-white font-bold ml-2 cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs flex items-center justify-between animate-in fade-in duration-150">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </span>
          <button
            onClick={onClearSuccess}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}
