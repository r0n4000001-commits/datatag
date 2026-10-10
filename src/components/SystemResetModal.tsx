import React, { useState } from 'react';
import {
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Shield,
  X,
  Package,
  Layers,
  ArrowRight,
  Info,
  Check,
  Boxes,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: 'fase1' | 'fase2' | 'fase3' | 'desarrollo' | 'reportes') => void;
}

export const SystemResetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const {
    activeUser,
    reservations,
    labels,
    discharges,
    products,
    subWarehouses,
    categories,
    speciesList,
    tares,
    resetAllDataToZero,
    restoreDefaultCatalogOptions,
  } = useInventory();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoringCatalogs, setIsRestoringCatalogs] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  if (!isOpen) return null;

  const handleExecuteTotalWipe = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    setIsSuccess(false);

    try {
      const res = await resetAllDataToZero();
      if (res.success) {
        setIsSuccess(true);
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al ejecutar el reinicio de datos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreCatalogDefaults = async () => {
    setIsRestoringCatalogs(true);
    setErrorMessage('');
    try {
      const res = await restoreDefaultCatalogOptions();
      if (res.success) {
        setSuccessMessage(res.message);
        setIsSuccess(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al restaurar catálogo predeterminado.');
    } finally {
      setIsRestoringCatalogs(false);
    }
  };

  const handleResetDialogState = () => {
    setIsSuccess(false);
    setSuccessMessage('');
    setErrorMessage('');
    setConfirmedCheck(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs font-mono animate-fadeIn">
      <div className="bg-[#181816] text-[#E0DFDC] border-2 border-amber-500 rounded shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#121210] border-b border-[#2C2C28] p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-400 text-black flex items-center justify-center font-black shadow-md shrink-0">
              <RotateCcw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-700 rounded-xs">
                  ADMINISTRADOR
                </span>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                  Reiniciar Datos de Operación a Cero
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Vacía stock, cajas, salidas y pedidos conservando intactas las opciones disponibles
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDialogState}
            className="p-1.5 hover:bg-[#282824] text-gray-400 hover:text-white rounded border border-[#333] transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Active Admin Profile */}
          {activeUser && (
            <div className="bg-[#20201C] border border-[#363630] p-3 rounded flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] text-gray-300">
                  Operador: <strong className="text-white">[{activeUser.employeeNumber}] {activeUser.name}</strong> ({activeUser.role})
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Administración
              </span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess ? (
            <div className="p-5 rounded border-2 border-emerald-500 bg-emerald-950/90 text-emerald-100 space-y-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500 text-black rounded-full shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-white">
                    ¡DATOS OPERATIVOS REINICIADOS A CERO!
                  </h3>
                  <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                    {successMessage}
                  </p>
                </div>
              </div>

              <div className="bg-black/50 p-3 rounded border border-emerald-600/50 text-[11px] space-y-1 font-mono">
                <div className="text-emerald-300 font-bold">Estado actual del sistema:</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300 pt-1">
                  <span>• Stock de cajas en almacén: <strong>0 cajas</strong></span>
                  <span>• Historial de etiquetas: <strong>0</strong></span>
                  <span>• Salidas y despachos: <strong>0</strong></span>
                  <span>• Pedidos y solicitudes: <strong>0</strong></span>
                  <span>• Catálogo de productos: <strong className="text-emerald-300">{products.length} disponibles</strong></span>
                  <span>• Cámaras y sub-almacenes: <strong className="text-emerald-300">{subWarehouses.length} disponibles</strong></span>
                  <span>• Categorías y especies: <strong className="text-emerald-300">Disponibles</strong></span>
                  <span>• Taras de báscula: <strong className="text-emerald-300">Disponibles</strong></span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-gray-300 font-bold">Comenzar prueba:</span>
                {onNavigateToTab && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleResetDialogState();
                        onNavigateToTab('fase1');
                      }}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase rounded transition-colors cursor-pointer shadow-xs"
                    >
                      Fase 1: Pesar y Etiquetar Caja en Báscula
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleResetDialogState();
                        onNavigateToTab('fase2');
                      }}
                      className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white font-bold text-xs uppercase rounded transition-colors cursor-pointer border border-[#555]"
                    >
                      Fase 2: Almacén
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleResetDialogState}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded transition-colors cursor-pointer ml-auto"
                >
                  Aceptar y Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Current Counts Grid */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-gray-400 block">
                  Datos operativos que quedarán en cero (0):
                </label>
                <div className="bg-[#121210] p-3.5 rounded border border-[#2A2A28] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[11px]">
                  <div className="bg-[#1C1C18] p-2 rounded border border-[#333]">
                    <span className="text-gray-400 text-[10px] block">Stock Cajas:</span>
                    <strong className="text-white text-base">{(labels || []).length}</strong>
                    <span className="text-[9px] text-red-400 block">➔ Quedará en 0</span>
                  </div>
                  <div className="bg-[#1C1C18] p-2 rounded border border-[#333]">
                    <span className="text-gray-400 text-[10px] block">Salidas / Mermas:</span>
                    <strong className="text-purple-400 text-base">{(discharges || []).length}</strong>
                    <span className="text-[9px] text-red-400 block">➔ Quedará en 0</span>
                  </div>
                  <div className="bg-[#1C1C18] p-2 rounded border border-[#333]">
                    <span className="text-gray-400 text-[10px] block">Pedidos Activos:</span>
                    <strong className="text-amber-400 text-base">{(reservations || []).length}</strong>
                    <span className="text-[9px] text-red-400 block">➔ Quedará en 0</span>
                  </div>
                  <div className="bg-[#1C1C18] p-2 rounded border border-[#333]">
                    <span className="text-gray-400 text-[10px] block">Registros SIFPRO:</span>
                    <strong className="text-cyan-400 text-base">0</strong>
                    <span className="text-[9px] text-red-400 block">➔ Quedará en 0</span>
                  </div>
                </div>
              </div>

              {/* Clarification on Options Available */}
              <div className="bg-[#161D22] border border-cyan-500/60 p-3.5 rounded space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    <span>Opciones Disponibles para Operar (Se conservan intactas)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreCatalogDefaults}
                    disabled={isRestoringCatalogs || isProcessing}
                    className="text-[10px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer disabled:opacity-50"
                    title="Recarga los productos, cámaras y especies de fábrica si alguno se perdió"
                  >
                    {isRestoringCatalogs ? 'Restaurando...' : 'Restaurar opciones de fábrica'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-300 font-sans leading-relaxed">
                  Estas son las opciones de configuración que verás en los menús desplegables para poder seleccionar productos, cámaras de congelación y especies al realizar tus pruebas:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-300">
                  <div className="bg-[#101720] p-1.5 rounded border border-[#223348]">
                    <span className="text-gray-400 block">Productos:</span>
                    <strong className="text-cyan-300">{products.length} disponibles</strong>
                  </div>
                  <div className="bg-[#101720] p-1.5 rounded border border-[#223348]">
                    <span className="text-gray-400 block">Cámaras:</span>
                    <strong className="text-cyan-300">{subWarehouses.length} configuradas</strong>
                  </div>
                  <div className="bg-[#101720] p-1.5 rounded border border-[#223348]">
                    <span className="text-gray-400 block">Especies / Taras:</span>
                    <strong className="text-cyan-300">{speciesList.length} especies / {tares.length} taras</strong>
                  </div>
                  <div className="bg-[#101720] p-1.5 rounded border border-[#223348]">
                    <span className="text-gray-400 block">Impresoras:</span>
                    <strong className="text-cyan-300">Configuración lista</strong>
                  </div>
                </div>
              </div>

              {/* Warning and Confirmation */}
              <div className="bg-amber-950/40 border-2 border-amber-500/80 p-4 rounded space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-black text-xs sm:text-sm uppercase text-amber-200 tracking-wide">
                      REINICIO DE OPERACIÓN DESDE CERO
                    </h3>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      Al confirmar, se vaciarán todas las cajas del almacén y todos los pedidos. Las opciones disponibles (catálogo de productos, cámaras y especies) permanecerán intactas para que puedas seleccionar productos en báscula, crear pedidos y despachar de inmediato.
                    </p>
                  </div>
                </div>

                {/* Safety Checkbox */}
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedCheck}
                    onChange={(e) => setConfirmedCheck(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-[11px] font-bold text-amber-200">
                    Confirmo que deseo reiniciar el stock, pedidos y salidas a 0.
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-950 border border-red-600 text-red-200 rounded text-xs">
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="bg-[#121210] border-t border-[#2C2C28] p-4 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetDialogState}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#252522] hover:bg-[#333] text-gray-300 hover:text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer border border-[#444]"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExecuteTotalWipe}
              disabled={isProcessing || !confirmedCheck}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase rounded transition-all flex items-center gap-2 shadow-lg cursor-pointer border border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Reiniciando Datos a Cero...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Datos Operativos a Cero</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
