import React, { useEffect } from 'react';
import { Lock, Sparkles, CheckCircle2, ArrowRight, X, ShieldAlert, Package, Layers } from 'lucide-react';

interface SifproComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToPnc: () => void;
}

export const SifproComingSoonModal: React.FC<SifproComingSoonModalProps> = ({
  isOpen,
  onClose,
  onGoToPnc,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#141A22] border-2 border-cyan-500/80 rounded-xs shadow-2xl max-w-xl w-full text-white overflow-hidden font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-400"></div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#223348] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 rounded-xs shrink-0">
              <Lock className="w-7 h-7 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black tracking-widest text-cyan-300 uppercase bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/60">
                  BLOQUEADO TEMPORALMENTE
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60">
                  EN DESARROLLO
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
                Módulo SIFPRO — Próximamente
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1E2D3E] rounded transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="bg-[#0D141C] border border-[#1F2E40] p-4 rounded-xs text-xs text-gray-200 leading-relaxed font-sans space-y-2">
            <p className="font-semibold text-cyan-200 text-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Módulo SIFPRO Inactivo — En Desarrollo Futuro</span>
            </p>
            <p>
              El módulo <strong>SIFPRO</strong> es completamente independiente tanto en inventarios como en solicitudes respecto a <strong>Producto No Conforme (PNC)</strong>. Cualquier opción de SIFPRO se encuentra temporalmente inactiva ya que se mejorará en una fase futura.
            </p>
            <p className="text-amber-300 font-semibold">
              La creación de pedidos de venta, solicitudes de muestras y el descuento de inventario se realizan de manera 100% independiente y exclusiva dentro del módulo de Producto No Conforme (PNC).
            </p>
          </div>

          {/* PNC module active notice */}
          <div className="bg-[#121815] border border-emerald-500/50 p-4 rounded-xs space-y-2 font-mono text-xs">
            <div className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5 border-b border-emerald-950 pb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Módulo activo y 100% operativo en Firebase:</span>
            </div>
            <div className="text-gray-200 space-y-1.5 text-[11px] font-sans">
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold font-mono">Fase 1:</span>
                <span>Pesaje en báscula Torrey, cálculo automático de caducidad por condición y generación de etiquetas ZPL Zebra.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold font-mono">Fase 2:</span>
                <span>Administración de cajas en Almacén Congelado, subalmacenes, catálogos y trazabilidad.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold font-mono">Fase 3:</span>
                <span>Registro de salidas, despachos y mermas mediante escaneo de código de barras.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold font-mono">Fase 4 & 5:</span>
                <span>Telemarketing, apartado de muestras, y reportes de caducidades y mermas.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#0D141C] border-t border-[#1E2D3E] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#1A2533] hover:bg-[#243346] text-gray-300 hover:text-white border border-[#2D3E54] rounded-xs font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Volver a Selección
          </button>

          <button
            onClick={() => {
              onClose();
              onGoToPnc();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase tracking-wider rounded-xs border border-amber-500 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
          >
            <Package className="w-4 h-4 text-[#141414]" />
            <span>Ingresar a Producto No Conforme (PNC)</span>
            <ArrowRight className="w-4 h-4 text-[#141414]" />
          </button>
        </div>
      </div>
    </div>
  );
};
