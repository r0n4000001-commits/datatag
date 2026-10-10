import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#F8F7F4] border-2 border-red-500 p-6 m-4 font-mono text-[#141414] shadow-lg max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-red-400 pb-3">
            <div className="p-2 bg-red-100 border border-red-500 text-red-600 rounded-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-red-700">
                {this.props.fallbackTitle || 'Error en la Carga del Módulo'}
              </h2>
              <p className="text-xs text-[#555]">
                Se ha detectado una anomalía en los datos. El sistema ha protegido la sesión.
              </p>
            </div>
          </div>

          <div className="bg-white p-3 border border-[#141414]/20 text-xs space-y-2">
            <p className="font-bold text-[#141414]">Detalle técnico:</p>
            <p className="bg-red-50 text-red-900 p-2 border border-red-200 font-mono text-[11px] break-words">
              {this.state.error?.message || 'Error desconocido'}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-[#141414] hover:bg-[#282828] text-white text-xs font-bold uppercase flex items-center gap-2 border border-[#141414] cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reintentar Carga del Módulo</span>
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#141414] text-xs font-bold uppercase flex items-center gap-2 border border-amber-600 cursor-pointer shadow-xs"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
