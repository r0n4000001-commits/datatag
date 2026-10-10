import React, { useState, useEffect } from 'react';
import { SpeciesItem } from '../types';
import {
  SPECIES_COLOR_PRESETS,
  SpeciesColorOption,
  PRESET_ORIGINS,
  generateNextSpeciesCode,
  formatSpeciesLegend,
  getSpeciesBadgeClass,
  getSpeciesBadgeStyle,
} from '../utils/speciesUtils';
import {
  Dna,
  X,
  Plus,
  Check,
  Palette,
  Sparkles,
  Info,
  Package,
  Globe,
  Tag,
  FileText,
  Layers,
} from 'lucide-react';

interface SpeciesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesToEdit?: SpeciesItem | null;
  existingSpecies: SpeciesItem[];
  productCount?: number;
  labelCount?: number;
  onSave: (
    speciesData: {
      code: string;
      name: string;
      legend: string;
      origin: string;
      description: string;
      badgeColor: string;
    },
    oldLegend?: string
  ) => void;
}

export const SpeciesManagerModal: React.FC<SpeciesManagerModalProps> = ({
  isOpen,
  onClose,
  speciesToEdit,
  existingSpecies,
  productCount = 0,
  labelCount = 0,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [legend, setLegend] = useState('');
  const [origin, setOrigin] = useState('Nacional (México - TIF)');
  const [customOrigin, setCustomOrigin] = useState('');
  const [isCustomOrigin, setIsCustomOrigin] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-rose-100 text-rose-900 border-rose-400');
  const [colorMode, setColorMode] = useState<'presets' | 'custom'>('presets');
  const [customHex, setCustomHex] = useState('#F43F5E');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (speciesToEdit) {
      setCode(speciesToEdit.code);
      setName(speciesToEdit.name);
      setLegend(speciesToEdit.legend);
      setDescription(speciesToEdit.description || '');

      const currentOrigin = speciesToEdit.origin || 'Nacional (México - TIF)';
      if (PRESET_ORIGINS.includes(currentOrigin)) {
        setOrigin(currentOrigin);
        setIsCustomOrigin(false);
        setCustomOrigin('');
      } else {
        setOrigin('Otro');
        setIsCustomOrigin(true);
        setCustomOrigin(currentOrigin);
      }

      const existingCol = speciesToEdit.badgeColor || 'bg-rose-100 text-rose-900 border-rose-400';
      setSelectedColor(existingCol);

      if (existingCol.startsWith('#') || existingCol.startsWith('custom:')) {
        setColorMode('custom');
        setCustomHex(existingCol.replace('custom:', '').trim());
      } else {
        setColorMode('presets');
      }
    } else {
      const nextCode = generateNextSpeciesCode(existingSpecies.map((s) => s.code));
      setCode(nextCode);
      setName('');
      setLegend('%100 ');
      setOrigin('Nacional (México - TIF)');
      setIsCustomOrigin(false);
      setCustomOrigin('');
      setDescription('');
      setSelectedColor('bg-rose-100 text-rose-900 border-rose-400');
      setColorMode('presets');
      setCustomHex('#F43F5E');
    }
    setErrorMessage('');
  }, [speciesToEdit, existingSpecies, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: SpeciesColorOption) => {
    setSelectedColor(preset.className);
    setCustomHex(preset.previewColor);
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    setSelectedColor(hex);
  };

  const handleAutoGenerateCode = () => {
    const nextCode = generateNextSpeciesCode(existingSpecies.map((s) => s.code));
    setCode(nextCode);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    // If legend is empty or just starts with %100, suggest automatic legend
    if (!speciesToEdit && (!legend || legend === '%100 ' || legend.trim() === '%100')) {
      if (val.trim()) {
        const cleanName = val.trim().split('/')[0].trim().toUpperCase();
        setLegend(`%100 ${cleanName}`);
      }
    }
  };

  const handleAutoFormatLegend = () => {
    if (legend.trim()) {
      setLegend(formatSpeciesLegend(legend));
    } else if (name.trim()) {
      const cleanName = name.trim().split('/')[0].trim().toUpperCase();
      setLegend(`%100 ${cleanName}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanLegend = legend.trim().toUpperCase();
    const finalOrigin = isCustomOrigin ? customOrigin.trim() : origin.trim();

    if (!cleanCode) {
      setErrorMessage('El código de la especie/origen es obligatorio.');
      return;
    }

    if (!cleanName) {
      setErrorMessage('El nombre descriptivo de la especie es obligatorio.');
      return;
    }

    if (!cleanLegend) {
      setErrorMessage('La leyenda para etiqueta Zebra (ej. %100 CERDO) es obligatoria.');
      return;
    }

    // Check duplicate code
    const duplicateCode = existingSpecies.find(
      (s) => s.code.toUpperCase() === cleanCode && s.id !== speciesToEdit?.id
    );
    if (duplicateCode) {
      setErrorMessage(`El código "${cleanCode}" ya está en uso por "${duplicateCode.name}".`);
      return;
    }

    // Check duplicate legend
    const duplicateLegend = existingSpecies.find(
      (s) => s.legend.toUpperCase() === cleanLegend && s.id !== speciesToEdit?.id
    );
    if (duplicateLegend) {
      setErrorMessage(`La leyenda de rotulación "${cleanLegend}" ya existe en "${duplicateLegend.name}".`);
      return;
    }

    onSave(
      {
        code: cleanCode,
        name: cleanName,
        legend: cleanLegend,
        origin: finalOrigin || 'Nacional (México - TIF)',
        description: description.trim(),
        badgeColor: selectedColor,
      },
      speciesToEdit ? speciesToEdit.legend : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border-2 border-[#141414] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141414] text-white border-b-2 border-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-400 flex items-center justify-center text-[#141414]">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base uppercase tracking-wider text-white">
                {speciesToEdit ? 'Editar Especie / Origen' : 'Nueva Especie / Origen'}
              </h3>
              <p className="text-[11px] font-mono text-gray-300">
                Catálogo de especies, leyendas de etiquetado Zebra y origen de insumo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors border border-transparent hover:border-gray-600 rounded"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-500 text-red-800 text-xs font-mono flex items-center gap-2">
              <Info className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cascading Notice if Editing */}
          {speciesToEdit && (productCount > 0 || labelCount > 0) && (
            <div className="p-3 bg-amber-50 border border-amber-400 text-amber-900 text-xs font-mono flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Actualización en cascada:</p>
                <p className="text-[11px] text-amber-800">
                  Esta especie está vinculada a <strong>{productCount} productos</strong> y{' '}
                  <strong>{labelCount} etiquetas</strong> registradas. Al modificar la leyenda o nombre, se actualizarán automáticamente en todo el sistema.
                </p>
              </div>
            </div>
          )}

          {/* Code & Descriptive Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono uppercase font-bold text-[#333]">
                  Código <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateCode}
                  className="text-[10px] text-amber-800 hover:underline font-bold flex items-center gap-0.5"
                  title="Generar código correlativo"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ESP-01"
                className="w-full px-3 py-2 border border-[#141414] font-mono text-sm uppercase bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono uppercase font-bold text-[#333] mb-1">
                Nombre de la Especie <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Cerdo / Porcino, Res / Bovino, Pollo, Pavo..."
                className="w-full px-3 py-2 border border-[#141414] font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Zebra Label Legend & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/60 border border-amber-300">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono uppercase font-bold text-amber-950 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  Leyenda en Etiqueta Zebra <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoFormatLegend}
                  className="text-[10px] text-amber-900 hover:underline font-bold"
                  title="Formatear como %100 ..."
                >
                  Formato %100
                </button>
              </div>
              <input
                type="text"
                value={legend}
                onChange={(e) => setLegend(e.target.value.toUpperCase())}
                placeholder="%100 CERDO"
                className="w-full px-3 py-2 border border-[#141414] font-mono font-bold text-sm uppercase bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                required
              />
              <span className="text-[10px] text-amber-800 font-mono mt-1 block">
                Texto exacto impreso en la esquina superior derecha del formato Zebra.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-amber-950 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-700" />
                País / Origen del Insumo
              </label>
              <select
                value={isCustomOrigin ? 'Otro' : origin}
                onChange={(e) => {
                  if (e.target.value === 'Otro') {
                    setIsCustomOrigin(true);
                  } else {
                    setIsCustomOrigin(false);
                    setOrigin(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-[#141414] font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {PRESET_ORIGINS.map((orig) => (
                  <option key={orig} value={orig}>
                    {orig}
                  </option>
                ))}
                <option value="Otro">Otro / Especificar Origen Personalizado...</option>
              </select>

              {isCustomOrigin && (
                <input
                  type="text"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder="Escriba país u origen (ej. Importado Brasil)..."
                  className="w-full mt-1.5 px-3 py-1.5 border border-amber-500 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              )}
            </div>
          </div>

          {/* Color Badge Customization */}
          <div className="border border-[#141414]/30 p-3 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase font-bold text-[#141414] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                Distintivo y Color de Identificación
              </label>
              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setColorMode('presets')}
                  className={`px-2 py-0.5 border text-[10px] uppercase font-bold transition-all ${
                    colorMode === 'presets'
                      ? 'bg-[#141414] text-white border-[#141414]'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Paleta
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('custom')}
                  className={`px-2 py-0.5 border text-[10px] uppercase font-bold transition-all ${
                    colorMode === 'custom'
                      ? 'bg-[#141414] text-white border-[#141414]'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Color Hex
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            {colorMode === 'presets' ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SPECIES_COLOR_PRESETS.map((preset) => {
                  const isSelected = selectedColor === preset.className;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex items-center gap-2 p-2 border text-left transition-all ${
                        isSelected
                          ? 'border-[#141414] ring-2 ring-[#141414] bg-white font-bold'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0 flex items-center justify-center text-white"
                        style={{ backgroundColor: preset.previewColor }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span className="text-[11px] font-mono truncate text-gray-800">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white p-2.5 border border-gray-300">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  className="w-10 h-9 border border-gray-400 cursor-pointer p-0.5 bg-white"
                />
                <div className="flex-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">
                    Código Hexadecimal
                  </span>
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    placeholder="#F43F5E"
                    className="w-full font-mono text-xs uppercase font-bold border-b border-gray-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Live Badge Preview */}
            <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-gray-600">Vista previa del distintivo:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border shadow-sm ${getSpeciesBadgeClass(
                    selectedColor
                  )}`}
                  style={getSpeciesBadgeStyle(selectedColor)}
                >
                  <Dna className="w-3.5 h-3.5" />
                  <span>{name || 'Nombre de Especie'}</span>
                </span>

                <span className="bg-[#141414] text-amber-300 px-2.5 py-1 font-mono text-xs font-black uppercase border border-amber-500">
                  {legend || '%100 ESPECIE'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold text-[#333] mb-1">
              Descripción / Notas de Inspección
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalles sobre cortes derivados, requisitos sanitarios o certificación aplicable..."
              className="w-full px-3 py-2 border border-[#141414] font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-100 border-t-2 border-[#141414]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-[#141414] font-mono text-xs uppercase font-bold border border-[#141414] hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#141414] text-white font-mono text-xs uppercase font-bold border border-[#141414] hover:bg-amber-500 hover:text-[#141414] transition-all flex items-center gap-2 shadow-md"
          >
            <Check className="w-4 h-4" />
            {speciesToEdit ? 'Guardar Cambios' : 'Crear Especie'}
          </button>
        </div>
      </div>
    </div>
  );
};
