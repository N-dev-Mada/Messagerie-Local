'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[420px] w-full p-6 bg-[#f0f2f5] text-center">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-lg border border-gray-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Oups ! Un problème inattendu est survenu
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              L'application a rencontré une erreur d'affichage. Vos messages et données locales sont en sécurité dans la base de données.
            </p>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#008069] hover:bg-[#00a884] text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger l'application</span>
              </button>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left border-t border-gray-100 pt-4 text-xs text-gray-500">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                  Détails techniques de l'erreur
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-x-auto text-[11px] text-red-600 font-mono">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
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
