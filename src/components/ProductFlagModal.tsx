import React, { useState, useEffect } from 'react';
import { Flag, Check, Printer, X, ShieldAlert, CalendarClock } from 'lucide-react';
import { ProductConditionFlag, PRODUCT_CONDITIONS } from '../types';
import { useInventory } from '../context/InventoryContext';

interface ProductFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (condition: ProductConditionFlag) => void;
  productName?: string;
  productCode?: string;
  weight?: number;
  unit?: string;
  lot?: string;
  printTargetName?: string;
  isReprint?: boolean;
  initialConditionFlag?: ProductConditionFlag;
}

export const ProductFlagModal: React.FC<ProductFlagModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName = 'Producto',
  productCode,
  weight,
  unit = 'KG',
  lot,
  printTargetName = 'Impresora',
  isReprint = false,
  initialConditionFlag = 'A',
}) => {
  const { conditionExpirationConfig, calculateExpirationDate } = useInventory();
  const [selectedCondition, setSelectedCondition] = useState<ProductConditionFlag>(initialConditionFlag);

  // Sync selected condition when opened or when initialConditionFlag changes
  useEffect(() => {
    if (isOpen) {
      setSelectedCondition(initialConditionFlag);
    }
  }, [isOpen, initialConditionFlag]);

  // Handle keyboard shortcuts (A, B, R, M, I)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (!isReprint && (key === 'A' || key === 'B' || key === 'R' || key === 'M' || key === 'I')) {
        setSelectedCondition(key as ProductConditionFlag);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(selectedCondition);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedCondition, onConfirm, onClose, isReprint]);

  if (!isOpen) return null;

  const conditionsList = Object.values(PRODUCT_CONDITIONS);

  const handleSelectAndPrint = (code: ProductConditionFlag) => {
    if (isReprint) return; // Disallow changing flag on reprint
    setSelectedCondition(code);
    onConfirm(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in" translate="no">
      <div className="bg-[#F8F7F4] border-2 border-[#141414] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-mono text-[#141414]">
        {/* Modal Header */}
        <div className="bg-[#141414] text-white p-4 flex items-center justify-between border-b-2 border-[#141414]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-400 text-[#141414] font-black">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-amber-400">
                {isReprint ? '🔄 REIMPRESIÓN DE ETIQUETA (1 COPIA)' : 'SISTEMA DE BANDERAS: ESTADO DEL PRODUCTO'}
              </h3>
              <p className="text-[11px] text-gray-300 font-mono">
                {isReprint
                  ? 'Confirme el estado del producto para reimprimir la última etiqueta registrada'
                  : 'Defina la condición del producto antes de emitir e ingresar a inventario'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details Bar */}
        <div className="bg-amber-100 border-b border-[#141414]/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-[#141414]">{productCode ? `[${productCode}] ` : ''}{productName}</span>
            {lot && <span className="ml-2 text-[#555]">| Lote: <strong>{lot}</strong></span>}
          </div>
          {typeof weight === 'number' && (
            <span className="font-extrabold bg-[#141414] text-amber-300 px-2 py-0.5 border border-[#141414]">
              PESO: {weight.toFixed(2)} {unit}
            </span>
          )}
        </div>

        {/* Modal Body / Flag Selection Cards */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[60vh]">
          {isReprint ? (
            <div className="p-2.5 bg-amber-100/90 border border-amber-400 text-[#141414] text-xs font-mono font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                Bandera asignada en el registro original: <strong>[{selectedCondition}] {PRODUCT_CONDITIONS[selectedCondition]?.label}</strong>. No es modificable para garantizar la trazabilidad.
              </span>
            </div>
          ) : (
            <p className="text-xs font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Seleccione una bandera (clic directo o presione tecla A, B, R, M o I):</span>
            </p>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            {conditionsList.map((cond) => {
              const isSelected = selectedCondition === cond.code;
              
              if (isReprint && !isSelected) {
                // In reprint mode, non-selected flags are greyed out / hidden from selection
                return (
                  <div
                    key={cond.code}
                    className="p-2.5 border border-gray-200 bg-gray-100/50 opacity-35 cursor-not-allowed flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 shrink-0 border border-gray-400 flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-xs`}>
                      {cond.emoji} [{cond.code}]
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-gray-500 uppercase">{cond.label}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cond.code}
                  onClick={() => handleSelectAndPrint(cond.code)}
                  className={`p-3 border-2 transition-all flex items-start gap-3 relative ${
                    isReprint
                      ? 'border-[#141414] shadow-md bg-amber-50 ring-2 ring-amber-500 cursor-default'
                      : isSelected
                      ? 'border-[#141414] shadow-md bg-white ring-2 ring-amber-400 cursor-pointer'
                      : 'border-gray-300 bg-white/70 hover:bg-white hover:border-[#141414] cursor-pointer'
                  }`}
                >
                  {/* Badge Emoji & Code */}
                  <div className={`w-10 h-10 shrink-0 border-2 border-[#141414] flex flex-col items-center justify-center ${cond.badgeBg} ${cond.badgeText}`}>
                    <span className="text-base leading-none">{cond.emoji}</span>
                    <span className="text-[10px] font-black leading-none mt-0.5">[{cond.code}]</span>
                  </div>

                  {/* Flag Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs sm:text-sm text-[#141414] uppercase tracking-wide">
                        {cond.label}
                      </h4>
                      {isReprint ? (
                        <span className="text-[10px] font-black font-mono text-amber-900 bg-amber-200 px-2 py-0.5 border border-amber-400 uppercase tracking-wider">
                          Bandera Registrada
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-[#666] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                          Tecla [{cond.code}]
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#555] font-mono mt-1">
                      {cond.description}
                    </p>

                    {/* Expiration date preview for this condition */}
                    {(() => {
                      const rule = conditionExpirationConfig[cond.code];
                      const calcExp = calculateExpirationDate(cond.code, new Date());
                      if (!rule || !rule.enabled) {
                        return (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 border border-gray-200 rounded-xs">
                            <CalendarClock className="w-3 h-3 text-gray-400" />
                            <span>Caducidad automática desactivada</span>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-900 bg-amber-100/90 px-2 py-0.5 border border-amber-300/80 rounded-xs">
                          <CalendarClock className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>Caducidad: <strong>{calcExp}</strong> (+{rule.days} días de vida útil)</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Selected Indicator */}
                  <div className="shrink-0 pt-1">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="bg-[#E4E3E0] border-t-2 border-[#141414] p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[#555] text-center sm:text-left">
            Destino: <strong className="text-[#141414] uppercase">{printTargetName}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-gray-100 border border-[#141414] font-bold text-xs uppercase text-[#141414] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedCondition)}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#141414] hover:bg-[#282828] text-amber-400 border border-[#141414] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>
                {isReprint
                  ? `Confirmar y Reimprimir 1 Copia [Bandera ${selectedCondition}]`
                  : `Imprimir con Bandera [${selectedCondition}]`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
