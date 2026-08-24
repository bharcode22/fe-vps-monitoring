import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-3xl bg-slate-950 border border-red-500/30 text-white shadow-2xl flex flex-col items-center justify-center text-center gap-4 my-4 max-w-2xl mx-auto">
          <div className="p-3 bg-red-500/15 text-red-400 border border-red-500/30 rounded-2xl">
            <AlertTriangle size={32} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {this.props.title || 'Terjadi Masalah pada Komponen Ini'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Komponen mengalami kesalahan saat merender data. Anda dapat mencoba memuat ulang komponen di bawah.
            </p>
          </div>

          {this.state.error && (
            <div className="w-full bg-black/60 p-3 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-red-300 max-h-32 overflow-y-auto">
              {this.state.error.toString()}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/20"
          >
            <RefreshCw size={14} />
            <span>Muat Ulang Komponen</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
