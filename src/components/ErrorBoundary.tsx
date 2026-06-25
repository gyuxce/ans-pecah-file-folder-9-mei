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
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center border border-rose-100 bg-white p-8 text-center dark:border-rose-900/30 dark:bg-slate-900">
          <div className="mb-6 flex h-16 w-16 items-center justify-center border border-rose-100 bg-rose-100 text-rose-500 dark:border-rose-900 dark:bg-rose-900/30">
            <AlertTriangle size={32} />
          </div>
          <h2 className="mb-2 text-xl font-black text-slate-800 dark:text-white">Something went wrong</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium max-w-md">
            {this.props.fallbackMessage || "We encountered an unexpected error while rendering this component."}
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <div className="mb-8 w-full overflow-auto border border-slate-200 bg-slate-100 p-4 text-left dark:border-slate-700 dark:bg-slate-800">
              <code className="text-xs text-rose-500 dark:text-rose-400 whitespace-pre-wrap font-mono font-medium">
                {this.state.error.message}
              </code>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 border border-slate-900 bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-900"
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
