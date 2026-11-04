import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error in PHC Bhada app:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-slate-900">
              अ‍ॅप लोड करताना अडचण आली
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              पृष्ठ उघडताना काही तांत्रिक अडचण आली आहे. कृपया खालील बटण दाबून रीलोड करा.
            </p>
            {this.state.error?.message && (
              <div className="text-xs font-mono text-left bg-slate-50 border border-slate-200 p-3 rounded-lg text-red-800 break-words">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
            >
              🔄 पुन्हा लोड करा (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
