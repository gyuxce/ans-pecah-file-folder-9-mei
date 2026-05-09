import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
      this.setState({ hasError: false, error: null });
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-2 border-rose-100 dark:border-rose-900/30 text-center w-full min-h-[400px]">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Something went wrong</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium max-w-md">
            {this.props.fallbackMessage || "We encountered an unexpected error while rendering this component."}
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <div className="w-full text-left bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mb-8 overflow-auto border-2 border-slate-200 dark:border-slate-700 shadow-inner">
              <code className="text-xs text-rose-500 dark:text-rose-400 whitespace-pre-wrap font-mono font-medium">
                {this.state.error.message}
              </code>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md uppercase tracking-wider text-xs"
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
