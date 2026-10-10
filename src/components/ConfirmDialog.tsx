import React from 'react';
import { AlertTriangle, Trash2, X, Check } from 'lucide-react';

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  isDestructive?: boolean;
  onConfirm: () => void;
  isOpen?: boolean;
}

export interface ConfirmDialogProps {
  dialog?: ConfirmDialogState | null;
  onClose?: () => void;
  isOpen?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  isDestructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = (props) => {
  const isOpen = props.dialog !== undefined ? !!props.dialog : !!props.isOpen;
  if (!isOpen) return null;

  const title = props.dialog?.title ?? props.title ?? 'Confirmar Acción';
  const message = props.dialog?.message ?? props.message ?? '¿Está seguro de realizar esta acción?';
  const confirmText = props.dialog?.confirmText ?? props.confirmText ?? 'Sí, Confirmar';
  const cancelText = props.dialog?.cancelText ?? props.cancelText ?? 'Cancelar';
  const isDestructive =
    props.dialog?.danger !== undefined
      ? props.dialog.danger
      : props.dialog?.isDestructive !== undefined
      ? props.dialog.isDestructive
      : props.danger !== undefined
      ? props.danger
      : props.isDestructive !== undefined
      ? props.isDestructive
      : true;

  const handleConfirm = props.dialog?.onConfirm ?? props.onConfirm ?? (() => {});
  const handleCancel = () => {
    if (props.onClose) props.onClose();
    if (props.onCancel) props.onCancel();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xs font-mono">
      <div className="bg-[#F8F7F4] border-2 border-[#141414] shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-[#141414]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 border border-[#141414] shrink-0 ${
                isDestructive ? 'bg-red-600 text-white' : 'bg-amber-400 text-black'
              }`}
            >
              {isDestructive ? <Trash2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-black text-sm text-[#141414] uppercase tracking-wide leading-tight">
                {title}
              </h3>
              <span className="text-[10px] text-[#666] uppercase block font-bold">Confirmación de Acción</span>
            </div>
          </div>
          <button
            onClick={handleCancel}
            type="button"
            className="p-1 hover:bg-[#E4E3E0] border border-[#141414] text-[#141414] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-[#282828] whitespace-pre-line leading-relaxed bg-white border border-[#141414]/30 p-3 shadow-inner">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141414]/15">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#141414] border border-[#141414] text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              handleConfirm();
              handleCancel();
            }}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 border border-[#141414] cursor-pointer shadow-xs ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                : 'bg-[#141414] hover:bg-[#282828] text-white active:scale-95'
            }`}
          >
            {isDestructive ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
