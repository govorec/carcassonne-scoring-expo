import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // @ts-ignore
    this.setState({ errorInfo });
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-neutral-900 border border-red-900/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 text-red-500">
              <AlertCircle size={40} />
              <h1 className="text-2xl font-bold">App Error</h1>
            </div>
            
            <p className="text-neutral-400 mb-6 leading-relaxed">
              The application encountered an unexpected error. This might be due to a mobile browser restriction or a loading failure.
            </p>

            <div className="bg-black/50 rounded-xl p-4 mb-8 overflow-auto max-h-48 border border-white/5">
              <code className="text-xs text-red-400 break-all">
                {/* @ts-ignore */}
                {this.state.error?.toString()}
              </code>
              {/* @ts-ignore */}
              {this.state.errorInfo && (
                <pre className="text-[10px] text-neutral-500 mt-2 leading-tight">
                  {/* @ts-ignore */}
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
            >
              <RefreshCcw size={20} />
              Reload Application
            </button>
            
            <p className="text-center mt-6 text-xs text-neutral-600">
              If this persists, try opening the app in a new tab.
            </p>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}
