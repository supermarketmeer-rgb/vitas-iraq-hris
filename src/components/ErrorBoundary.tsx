import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  public state: State = { hasError: false, error: null };
  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">حدث خطأ في التطبيق</h1>
            <p className="text-slate-400 mb-4">An error occurred in the application</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              إعادة تحميل الصفحة / Reload Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left text-sm text-slate-500">
                <summary>تفاصيل الخطأ / Error Details</summary>
                <pre className="mt-2 p-2 bg-slate-800 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}