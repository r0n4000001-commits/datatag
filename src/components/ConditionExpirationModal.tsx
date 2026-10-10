import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  CalendarClock,
  Clock,
  CalendarDays,
  CheckCircle2,
  RotateCcw,
  X,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ProductConditionFlag,
  PRODUCT_CONDITIONS,
  ConditionExpirationConfig,
  DEFAULT_CONDITION_EXPIRATION_CONFIG,
} from '../types';
import { ConfirmDialog, ConfirmDialogState } from './ConfirmDialog';

interface ConditionExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConditionExpirationModal: React.FC<ConditionExpirationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    conditionExpirationConfig,
    updateConditionExpirationConfig,
    resetConditionExpirationConfig,
  } = useInventory();

  // Local working state
  const [localConfig, setLocalConfig] = useState<ConditionExpirationConfig>(conditionExpirationConfig);
  const [testBaseDate, setTestBaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Sync from context when modal opens or context changes
  useEffect(() => {
    if (isOpen) {
      setLocalConfig(conditionExpirationConfig);
      setTestBaseDate(new Date().toISOString().split('T')[0]);
      setSaveSuccess(false);
    }
  }, [isOpen, conditionExpirationConfig]);

  if (!isOpen) return null;

  const handleDayChange = (code: ProductConditionFlag, val: number) => {
    const safeVal = Math.max(0, Math.min(3650, isNaN(val) ? 0 : val));
    setLocalConfig((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        days: safeVal,
      },
    }));
  };

  const handleToggleEnabled = (code: ProductConditionFlag, enabled: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        enabled,
      },
    }));
  };

  const computeSimulatedDate = (days: number, isEnabled: boolean): { dateStr: string; formatted: string } => {
    if (!isEnabled || days <= 0) {
      return { dateStr: 'SIN CADUCIDAD', formatted: 'Sin fecha de caducidad automática' };
    }
    const [y, m, d] = testBaseDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const formatted = date.toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return { dateStr, formatted };
  };

  const handleSave = () => {
    updateConditionExpirationConfig(localConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setConfirmDialog({
      title: 'Restablecer Días de Caducidad',
      message: '¿Deseas restablecer los días de caducidad a los valores estándar de fábrica (Apto: 360d, Segunda: 180d, Remate: 30d, Merma: 7d, Inspección: 15d)?',
      confirmText: 'Sí, Restablecer Valores',
      danger: true,
      onConfirm: () => {
        resetConditionExpirationConfig();
        setLocalConfig(DEFAULT_CONDITION_EXPIRATION_CONFIG);
      },
    });
  };

  const conditionKeys: ProductConditionFlag[] = ['A', 'B', 'R', 'M', 'I'];

  const PRESET_DAYS = [
    { label: '+7d (1 sem)', days: 7 },
    { label: '+15d (15d)', days: 15 },
    { label: '+30d (1m)', days: 30 },
    { label: '+60d (2m)', days: 60 },
    { label: '+90d (3m)', days: 90 },
    { label: '+180d (6m)', days: 180 },
    { label: '+360d (1 año)', days: 360 },
    { label: '+720d (2 años)', days: 720 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs font-mono animate-in fade-in duration-200">
      <div className="bg-[#181816] text-[#E4E3E0] border-2 border-amber-500/80 rounded-md shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#20201D] border-b border-[#333330] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-400 text-[#141414] flex items-center justify-center font-black shadow-xs shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                  Configuración de Caducidades por Estado
                </h2>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-500/40 uppercase">
                  MÓDULO PNC
                </span>
              </div>
              <p className="text-[11px] text-[#A0A09C] font-sans">
                Define los días de vida útil para el cálculo automático en la impresión de etiquetas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded bg-[#2A2A26] hover:bg-red-950 hover:text-red-300 text-gray-400 transition-colors border border-[#3A3A36] cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Rule & Formula Banner */}
        <div className="px-4 sm:px-6 py-3 bg-[#131312] border-b border-[#2C2C28] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-gray-300 font-sans text-[11px] sm:text-xs leading-relaxed">
              <p>
                <strong className="text-amber-300 font-mono">FÓRMULA AUTOMÁTICA AL IMPRIMIR:</strong>{' '}
                <span className="bg-[#242422] text-white px-2 py-0.5 rounded border border-[#444] font-mono text-[11px]">
                  Fecha Caducidad = Fecha de Impresión (Día actual) + Días según Estado
                </span>
              </p>
              <p className="text-gray-400 mt-0.5">
                Al confirmar la bandera o enviar la etiqueta, el sistema aplica la caducidad calculada sin requerir ingreso manual.
              </p>
            </div>
          </div>

          {/* Interactive Date Simulator Picker */}
          <div className="flex items-center gap-2 bg-[#1E1E1C] px-3 py-1.5 rounded border border-[#3A3A36] shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
            <span className="text-[10px] text-gray-400 uppercase font-mono font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Simular Impresión:
            </span>
            <input
              type="date"
              value={testBaseDate}
              onChange={(e) => setTestBaseDate(e.target.value)}
              className="bg-[#2A2A26] border border-[#444] text-white font-mono text-xs px-2 py-0.5 rounded focus:outline-hidden focus:border-amber-400"
            />
          </div>
        </div>

        {/* Scrollable List of Condition Rules */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#141414]">
          <div className="grid grid-cols-1 gap-4">
            {conditionKeys.map((code) => {
              const info = PRODUCT_CONDITIONS[code];
              const rule = localConfig[code] || { enabled: true, days: 360 };
              const { dateStr, formatted } = computeSimulatedDate(rule.days, rule.enabled);

              // Condition specific accents
              const borderColor =
                code === 'A'
                  ? 'border-emerald-500/60 hover:border-emerald-400'
                  : code === 'B'
                  ? 'border-amber-500/60 hover:border-amber-400'
                  : code === 'R'
                  ? 'border-orange-500/60 hover:border-orange-400'
                  : code === 'M'
                  ? 'border-rose-500/60 hover:border-rose-400'
                  : 'border-blue-500/60 hover:border-blue-400';

              return (
                <div
                  key={code}
                  className={`bg-[#1E1E1C] border-2 ${borderColor} rounded-md p-4 transition-all space-y-3 shadow-md`}
                >
                  {/* Row Top: Condition Identity & Enable Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2C2C28]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{info.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-black uppercase ${info.badgeBg} ${info.badgeText}`}
                          >
                            Bandera [{code}]
                          </span>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                            {info.label}
                          </h3>
                        </div>
                        <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-gray-300 font-mono cursor-pointer select-none bg-[#262624] px-2.5 py-1 rounded border border-[#3A3A36]">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => handleToggleEnabled(code, e.target.checked)}
                          className="accent-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <span className={rule.enabled ? 'text-amber-300 font-bold' : 'text-gray-400'}>
                          {rule.enabled ? 'Cálculo Activo' : 'Desactivado'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Row Bottom: Days Input, Presets & Simulated Expiration Date */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                    {/* Days Input */}
                    <div className="lg:col-span-4 flex items-center gap-2">
                      <label className="text-xs text-gray-300 font-bold uppercase shrink-0">
                        Días de Caducidad:
                      </label>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          max={3650}
                          disabled={!rule.enabled}
                          value={rule.days}
                          onChange={(e) => handleDayChange(code, parseInt(e.target.value, 10))}
                          className={`w-full bg-[#121211] text-white font-mono font-black text-base px-3 py-1.5 rounded border focus:outline-hidden text-right pr-12 ${
                            rule.enabled
                              ? 'border-amber-500 focus:border-amber-400'
                              : 'border-gray-700 opacity-50'
                          }`}
                        />
                        <span className="absolute right-2.5 top-2 text-[11px] font-bold text-amber-400 pointer-events-none">
                          DÍAS
                        </span>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="lg:col-span-8 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-gray-400 uppercase mr-1 font-bold">
                        Ajustes Rápidos:
                      </span>
                      {PRESET_DAYS.map((preset) => {
                        const isCurrent = rule.days === preset.days && rule.enabled;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            disabled={!rule.enabled}
                            onClick={() => handleDayChange(code, preset.days)}
                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-400 text-[#141414] border border-amber-300 shadow-xs'
                                : 'bg-[#2A2A26] hover:bg-[#383832] text-gray-300 hover:text-white border border-[#3E3E3A]'
                            } ${!rule.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Simulated Output Ribbon */}
                  <div className="bg-[#121211] p-2.5 rounded border border-[#2C2C28] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-400 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Impreso el <strong>{testBaseDate}</strong></span>
                      <ArrowRight className="w-3 h-3 text-gray-500" />
                      <span>+ {rule.enabled ? rule.days : 0} días</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 uppercase font-mono font-bold">
                        Caducidad en Etiqueta:
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono font-black text-xs ${
                        rule.enabled
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-500/70'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {dateStr}
                      </span>
                      {rule.enabled && (
                        <span className="text-[11px] text-gray-400 font-sans hidden sm:inline">
                          ({formatted})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#20201D] border-t border-[#333330] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#2A2A26] hover:bg-[#343430] text-gray-300 hover:text-white border border-[#3E3E3A] rounded text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
            title="Restablecer todos los días de caducidad a valores predeterminados"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Valores de Fábrica</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2A2A26] hover:bg-[#343430] text-gray-300 hover:text-white border border-[#3A3A36] rounded text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saveSuccess}
              className={`flex items-center gap-2 px-5 py-2 rounded text-xs font-mono font-black uppercase transition-all shadow-md cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-500 text-white border border-emerald-400'
                  : 'bg-amber-400 hover:bg-amber-300 text-[#141414] border border-amber-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveSuccess ? '¡Configuración Guardada!' : 'Guardar y Aplicar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
};
