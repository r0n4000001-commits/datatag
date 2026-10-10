import React, { useState, useEffect } from 'react';
import { CategoryItem } from '../types';
import {
  CATEGORY_COLOR_PRESETS,
  CategoryColorOption,
  getCategoryBadgeClass,
  getCategoryBadgeStyle,
  generateNextCategoryCode,
} from '../utils/categoryUtils';
import {
  FolderTree,
  X,
  Plus,
  Check,
  Palette,
  Sparkles,
  Info,
  Package,
  Layers,
  Edit3,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryItem | null;
  existingCategories: CategoryItem[];
  productCount?: number;
  labelCount?: number;
  onSave: (categoryData: { code: string; name: string; description: string; color: string }, oldName?: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  existingCategories,
  productCount = 0,
  labelCount = 0,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-red-100 text-red-900 border-red-400');
  const [colorMode, setColorMode] = useState<'presets' | 'custom'>('presets');
  const [customHex, setCustomHex] = useState('#DC2626');
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize initial state when modal opens or categoryToEdit changes
  useEffect(() => {
    if (categoryToEdit) {
      setCode(categoryToEdit.code);
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
      const existingCol = categoryToEdit.color || 'bg-red-100 text-red-900 border-red-400';
      setSelectedColor(existingCol);

      if (existingCol.startsWith('#') || existingCol.startsWith('custom:')) {
        setColorMode('custom');
        setCustomHex(existingCol.replace('custom:', '').trim());
      } else {
        setColorMode('presets');
      }
    } else {
      const nextCode = generateNextCategoryCode(existingCategories.map((c) => c.code));
      setCode(nextCode);
      setName('');
      setDescription('');
      setSelectedColor('bg-red-100 text-red-900 border-red-400');
      setColorMode('presets');
      setCustomHex('#DC2626');
    }
    setErrorMessage('');
  }, [categoryToEdit, existingCategories, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: CategoryColorOption) => {
    setSelectedColor(preset.className);
    setCustomHex(preset.previewColor);
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    setSelectedColor(hex);
  };

  const handleAutoGenerateCode = () => {
    const nextCode = generateNextCategoryCode(existingCategories.map((c) => c.code));
    setCode(nextCode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setErrorMessage('El código de la categoría es obligatorio.');
      return;
    }

    if (!cleanName) {
      setErrorMessage('El nombre de la categoría es obligatorio.');
      return;
    }

    // Check code duplication (excluding the one currently being edited)
    const isDuplicateCode = existingCategories.some(
      (c) => c.code.toUpperCase() === cleanCode && c.id !== categoryToEdit?.id
    );
    if (isDuplicateCode) {
      setErrorMessage(`El código "${cleanCode}" ya está en uso por otra categoría.`);
      return;
    }

    const finalColor = colorMode === 'custom' ? customHex : selectedColor;

    onSave(
      {
        code: cleanCode,
        name: cleanName,
        description: description.trim(),
        color: finalColor,
      },
      categoryToEdit?.name
    );

    onClose();
  };

  const isEditing = Boolean(categoryToEdit);
  const activeBadgeClass = getCategoryBadgeClass(colorMode === 'custom' ? customHex : selectedColor);
  const activeBadgeStyle = getCategoryBadgeStyle(colorMode === 'custom' ? customHex : selectedColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/75 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#F8F7F4] border-2 border-[#141414] w-full max-w-xl shadow-2xl overflow-hidden font-mono text-[#141414] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between border-b border-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400 text-black font-black">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {isEditing ? 'Editar Categoría de Producto' : 'Crear Nueva Categoría'}
              </h3>
              <p className="text-[10px] text-gray-300">
                {isEditing
                  ? `Modificando ${categoryToEdit?.name} (${categoryToEdit?.code})`
                  : 'Asigne código, nombre, familia y color distintivo'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-[#282828] text-gray-300 hover:text-white transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="bg-white border-b-2 border-[#141414] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#666] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Vista Previa en Tiempo Real
            </span>
            <span className="text-[9px] text-[#888] font-bold">
              Cómo se verá en tarjetas, filtros y etiquetas
            </span>
          </div>

          <div className="p-3 bg-[#F8F7F4] border border-[#141414]/30 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-black bg-[#141414] text-white px-2 py-0.5 border border-[#141414]">
                  {code || 'CAT-??'}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-xs uppercase tracking-wide transition-all shadow-xs ${activeBadgeClass}`}
                  style={activeBadgeStyle}
                >
                  {name || 'Nombre de la Categoría'}
                </span>
              </div>
              <p className="text-[11px] text-[#555] italic">
                {description || 'Descripción de la categoría de productos e insumos...'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-[#444] bg-white px-2.5 py-1.5 border border-[#141414]/20">
              <span>SKU: {productCount}</span>
              <span className="text-gray-300">|</span>
              <span className="text-blue-700">Etiquetas: {labelCount}</span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-2.5 bg-rose-100 border-2 border-rose-500 text-rose-900 font-bold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-700" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Code and Name inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-black uppercase text-[#141414]">
                  Código *
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateCode}
                  className="text-[9px] text-amber-900 underline font-bold hover:text-black cursor-pointer"
                  title="Generar correlativo"
                >
                  Auto
                </button>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CAT-01"
                required
                className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-black outline-hidden uppercase font-mono shadow-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[#141414] mb-1">
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Carnes Selectas, Aves, Lácteos..."
                required
                className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-bold outline-hidden shadow-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase text-[#141414] mb-1">
              Descripción / Familia de Productos
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle de productos o tipos de cortes que agrupa..."
              className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-medium outline-hidden shadow-xs"
            />
          </div>

          {/* Color Selection Section */}
          <div className="space-y-2 pt-1 border-t border-[#141414]/15">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-[11px] font-black uppercase text-[#141414] flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-600" />
                Asignación de Color Distintivo
              </label>

              {/* Mode selector pills */}
              <div className="flex items-center bg-gray-200 p-0.5 border border-[#141414]/30 rounded-xs">
                <button
                  type="button"
                  onClick={() => setColorMode('presets')}
                  className={`px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    colorMode === 'presets'
                      ? 'bg-[#141414] text-white shadow-xs'
                      : 'text-[#555] hover:text-black'
                  }`}
                >
                  Paleta Predefinida ({CATEGORY_COLOR_PRESETS.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setColorMode('custom');
                    if (!selectedColor.startsWith('#')) {
                      setSelectedColor(customHex);
                    }
                  }}
                  className={`px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    colorMode === 'custom'
                      ? 'bg-[#141414] text-white shadow-xs'
                      : 'text-[#555] hover:text-black'
                  }`}
                >
                  Color Personalizado (Hex / Picker)
                </button>
              </div>
            </div>

            {/* PRESET PALETTE GRID */}
            {colorMode === 'presets' && (
              <div className="bg-white p-3 border border-[#141414] max-h-52 overflow-y-auto space-y-2">
                <p className="text-[10px] text-[#666] leading-tight">
                  Seleccione uno de los colores optimizados para visualización y contraste en almacén:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORY_COLOR_PRESETS.map((preset) => {
                    const isSelected = selectedColor === preset.className;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2 border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-2 border-[#141414] bg-amber-50 shadow-xs ring-1 ring-black'
                            : 'border-gray-300 hover:border-gray-500 bg-white'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-black/30 shadow-xs flex items-center justify-center text-white text-[8px]"
                          style={{ backgroundColor: preset.previewColor }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-[#141414] truncate leading-tight">
                            {preset.name}
                          </p>
                          <p className="text-[8px] text-[#666] truncate leading-tight">
                            {preset.tagGroup}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CUSTOM COLOR PICKER */}
            {colorMode === 'custom' && (
              <div className="bg-white p-3.5 border border-[#141414] space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Selector Visual
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customHex}
                        onChange={(e) => handleCustomHexChange(e.target.value)}
                        className="w-10 h-9 p-0.5 border-2 border-[#141414] cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={customHex}
                        onChange={(e) => handleCustomHexChange(e.target.value)}
                        placeholder="#RRGGBB"
                        className="w-28 px-2 py-1.5 border border-[#141414] font-mono font-bold text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Quick suggested custom swatches */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Acceso Rápido a Tonos
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        '#DC2626',
                        '#EA580C',
                        '#D97706',
                        '#059669',
                        '#0891B2',
                        '#2563EB',
                        '#7C3AED',
                        '#DB2777',
                        '#475569',
                        '#171717',
                      ].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => handleCustomHexChange(hex)}
                          className={`w-6 h-6 rounded-full border border-black/40 cursor-pointer transition-transform ${
                            customHex.toLowerCase() === hex.toLowerCase()
                              ? 'scale-125 ring-2 ring-black'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync Notice if editing */}
          {isEditing && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-950 text-[10px] leading-relaxed flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Sincronización Automática:</span> Al actualizar esta categoría, todos los{' '}
                <strong>{productCount} productos SKU</strong> y <strong>{labelCount} etiquetas</strong> registradas bajo este nombre se actualizarán automáticamente.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141414]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-bold text-[#141414] border border-gray-300 hover:border-black bg-white hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#141414] text-white font-extrabold uppercase hover:bg-black transition-colors flex items-center gap-1.5 border border-[#141414] cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4 text-amber-400" />
              {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
