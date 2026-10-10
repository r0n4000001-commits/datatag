import React, { useState, useEffect } from 'react';
import { TareItem } from '../types';
import {
  Package,
  X,
  Scale,
  Hash,
  FileText,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';

interface TareEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tareToEdit?: TareItem | null;
  existingTares: TareItem[];
  productCount?: number;
  onSave: (tareData: Omit<TareItem, 'id'>) => void;
}

const COMMON_TARE_PRESETS = [
  { name: 'Bolsa al Vacío', weight: 0.05, code: 'T-BOLSA' },
  { name: 'Bandeja / Tina', weight: 0.85, code: 'T-TINA' },
  { name: 'Caja Cartón Regular', weight: 1.20, code: 'T-CARTON' },
  { name: 'Caja Plástica Rigida', weight: 2.10, code: 'T-PLAST' },
  { name: 'Combo Bin Paletizado', weight: 35.00, code: 'T-COMBO' },
];

export const TareEditorModal: React.FC<TareEditorModalProps> = ({
  isOpen,
  onClose,
  tareToEdit,
  existingTares,
  productCount = 0,
  onSave,
}) => {
  const [tareNumber, setTareNumber] = useState<number>(1);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState<string>('1.20');
  const [unit, setUnit] = useState<'KG' | 'LB' | 'G'>('KG');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tareToEdit) {
      setTareNumber(tareToEdit.tareNumber);
      setCode(tareToEdit.code);
      setName(tareToEdit.name);
      setWeight(String(tareToEdit.weight));
      setUnit(tareToEdit.unit || 'KG');
      setDescription(tareToEdit.description || '');
      setErrorMessage(null);
    } else {
      // Suggest next number
      const nextNum = existingTares.reduce((max, t) => Math.max(max, t.tareNumber || 0), 0) + 1;
      setTareNumber(nextNum);
      setCode(`TAR-${String(nextNum).padStart(2, '0')}`);
      setName('');
      setWeight('1.20');
      setUnit('KG');
      setDescription('');
      setErrorMessage(null);
    }
  }, [tareToEdit, existingTares, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMessage('El peso de la tara debe ser un número mayor a 0.00 KG.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('El nombre descriptivo del empaque es obligatorio.');
      return;
    }

    if (!code.trim()) {
      setErrorMessage('El código de tara es obligatorio.');
      return;
    }

    // Check for duplicate number
    const duplicate = existingTares.find(
      (t) => t.tareNumber === Number(tareNumber) && (!tareToEdit || t.id !== tareToEdit.id)
    );
    if (duplicate) {
      setErrorMessage(`El número de tara #${tareNumber} ya está registrado para "${duplicate.name}". Elija otro número.`);
      return;
    }

    onSave({
      tareNumber: Number(tareNumber),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      weight: parsedWeight,
      unit,
      description: description.trim(),
    });
  };

  const numericWeight = parseFloat(weight) || 0;
  const sampleGross = 25.00;
  const sampleNet = Math.max(0, sampleGross - numericWeight);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs font-mono notranslate" translate="no">
      <div className="bg-white border-2 border-[#141414] w-full max-w-lg shadow-2xl rounded-xs overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#141414] text-white p-3.5 sm:p-4 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 text-[#141414] flex items-center justify-center rounded-xs font-black shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-white">
                {tareToEdit ? `Editar Tara #${tareToEdit.tareNumber}` : 'Nueva Tara de Empaque'}
              </h3>
              <p className="text-[11px] text-[#A0A09C]">
                Descuento de peso de empaque (caja, bolsa, tina) en pesaje y etiquetado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#282824] transition-colors rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-2.5 rounded-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {productCount > 0 && tareToEdit && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xs text-[11px]">
              ⚠️ Esta tara está asignada actualmente a <strong>{productCount} producto(s)</strong>. Al modificar el peso, el nuevo descuento aplicará a futuros pesajes.
            </div>
          )}

          {/* Quick presets */}
          {!tareToEdit && (
            <div className="bg-[#F8F7F4] border border-[#141414]/20 p-2.5 rounded-xs space-y-1.5">
              <label className="text-[10px] font-bold text-[#141414] uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Cargar Plantilla Rápida de Empaque:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TARE_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setName(p.name);
                      setWeight(p.weight.toFixed(2));
                      setCode(p.code);
                    }}
                    className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-amber-100 border border-[#141414]/30 rounded-xs transition-colors cursor-pointer text-[#141414]"
                  >
                    {p.name} ({p.weight} KG)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Número de Tara */}
            <div>
              <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-amber-600" />
                No. de Tara *
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={tareNumber}
                onChange={(e) => setTareNumber(Math.max(1, parseInt(e.target.value) || 1))}
                required
                className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border-2 border-[#141414] font-black text-sm text-[#141414] outline-hidden focus:bg-white"
              />
              <span className="text-[9px] text-[#666]">Ej. 1, 2, 3...</span>
            </div>

            {/* Código de Tara */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1">
                Código / Identificador *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ej. T-CARTON, T-PLAST"
                required
                className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border-2 border-[#141414] font-bold uppercase text-xs text-[#141414] outline-hidden focus:bg-white"
              />
              <span className="text-[9px] text-[#666]">Código corto para reportes</span>
            </div>
          </div>

          {/* Nombre descriptivo */}
          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1">
              Nombre Descriptivo del Empaque *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Caja Cartón Corrugado Estándar 25-30 KG"
              required
              className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border-2 border-[#141414] font-bold text-xs text-[#141414] outline-hidden focus:bg-white"
            />
          </div>

          {/* Peso de la Tara y Unidad */}
          <div className="grid grid-cols-2 gap-3 bg-amber-50/70 p-3 border-2 border-amber-400 rounded-xs">
            <div>
              <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-700" />
                Peso de Tara a Restar *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  placeholder="1.20"
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-[#141414] font-black text-base text-[#141414] outline-hidden"
                />
              </div>
              <span className="text-[9px] text-amber-800 font-bold">
                Se restará del peso bruto báscula
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1">
                Unidad
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border-2 border-[#141414] font-bold text-xs outline-hidden h-[38px]"
              >
                <option value="KG">KG (Kilogramos)</option>
                <option value="LB">LB (Libras)</option>
                <option value="G">G (Gramos)</option>
              </select>
              <span className="text-[9px] text-[#666]">Estándar industrial: KG</span>
            </div>
          </div>

          {/* Simulación en vivo */}
          <div className="bg-[#141414] text-white p-3 rounded-xs border border-amber-400 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 border-b border-white/20 pb-1">
              <span>EJEMPLO DE CÁLCULO DE PESAJE EN BÁSCULA:</span>
              <span>Tara #{tareNumber}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
              <div className="bg-[#222] p-1.5 rounded-xs">
                <span className="text-[9px] text-gray-400 block uppercase">Peso Bruto</span>
                <span className="font-bold text-white text-xs">{sampleGross.toFixed(2)} KG</span>
              </div>
              <div className="bg-rose-950/80 p-1.5 rounded-xs border border-rose-600">
                <span className="text-[9px] text-rose-300 block uppercase">- Tara Empaque</span>
                <span className="font-black text-rose-200 text-xs">-{numericWeight.toFixed(2)} {unit}</span>
              </div>
              <div className="bg-emerald-950/80 p-1.5 rounded-xs border border-emerald-500">
                <span className="text-[9px] text-emerald-300 block uppercase">= Peso Neto Etiqueta</span>
                <span className="font-black text-emerald-300 text-xs">{sampleNet.toFixed(2)} KG</span>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-gray-600" />
              Descripción / Notas de Uso (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Notas sobre dimensiones, material o productos compatibles con esta tara..."
              className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#141414] font-normal text-xs text-[#141414] outline-hidden focus:bg-white resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141414]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-[#141414] font-bold uppercase text-xs rounded-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black uppercase text-xs flex items-center gap-1.5 rounded-xs shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{tareToEdit ? 'Guardar Cambios' : 'Registrar Tara'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
