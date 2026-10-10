import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Database,
  Calendar,
  Tag,
  UploadCloud,
} from 'lucide-react';
import { PncCaducidadReport } from './reports/PncCaducidadReport';
import { PncEstadoReport } from './reports/PncEstadoReport';
import { PncSalidasReport } from './reports/PncSalidasReport';
import { SifproReports } from './reports/SifproReports';

export type InventoryType = 'no-conformante' | 'sifpro';
export type PncReportType = 'caducidad' | 'estado' | 'salidas';

export interface Phase5ReportsProps {
  defaultInventory?: InventoryType | 'pnc';
}

export const Phase5Reports: React.FC<Phase5ReportsProps> = ({ defaultInventory = 'no-conformante' }) => {
  const isPncModule = defaultInventory === 'pnc' || defaultInventory === 'no-conformante';
  const isSifproModule = defaultInventory === 'sifpro';

  const [selectedPncReport, setSelectedPncReport] = useState<PncReportType>('caducidad');

  // MÓDULO 1: PRODUCTO NO CONFORMANTE (Solo reportes correspondientes a PNC)
  if (isPncModule) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Directivo PNC */}
        <div className="bg-[#141414] text-white p-4 sm:p-6 rounded shadow-lg border border-[#3A3A36]">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#1C2628] rounded border border-cyan-800/60">
              <AlertTriangle className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Fase 5: Reportes e Indicadores
                </h2>
                <span className="bg-cyan-950 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider border border-cyan-700/60 font-bold">
                  Producto No Conforme (Almacén Congelado)
                </span>
              </div>
              <p className="text-[#A0A09C] text-sm leading-relaxed max-w-3xl">
                Auditoría, trazabilidad física de cajas, control de caducidades, grados de calidad y registro de salidas de producto no conforme.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs de Reportes Exclusivos de PNC */}
        <div className="bg-[#181816] border border-[#2E2E2A] rounded p-2 flex flex-wrap sm:flex-nowrap items-center gap-2 shadow-lg">
          <button
            type="button"
            onClick={() => setSelectedPncReport('caducidad')}
            className={`flex-1 px-4 py-3 rounded text-xs sm:text-sm font-bold flex items-center justify-start gap-2.5 transition-all cursor-pointer text-left ${
              selectedPncReport === 'caducidad'
                ? 'bg-cyan-500 text-black font-black shadow-md ring-1 ring-cyan-300'
                : 'bg-[#121210] text-gray-300 border border-[#2E2E2A] hover:text-white hover:border-cyan-500/40'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="truncate">1. Reporte de Caducidades</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPncReport('estado')}
            className={`flex-1 px-4 py-3 rounded text-xs sm:text-sm font-bold flex items-center justify-start gap-2.5 transition-all cursor-pointer text-left ${
              selectedPncReport === 'estado'
                ? 'bg-amber-400 text-black font-black shadow-md ring-1 ring-amber-200'
                : 'bg-[#121210] text-gray-300 border border-[#2E2E2A] hover:text-white hover:border-amber-400/40'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span className="truncate">2. Reporte por Estado (Apto, Segunda, etc.)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPncReport('salidas')}
            className={`flex-1 px-4 py-3 rounded text-xs sm:text-sm font-bold flex items-center justify-start gap-2.5 transition-all cursor-pointer text-left ${
              selectedPncReport === 'salidas'
                ? 'bg-emerald-400 text-black font-black shadow-md ring-1 ring-emerald-200'
                : 'bg-[#121210] text-gray-300 border border-[#2E2E2A] hover:text-white hover:border-emerald-400/40'
            }`}
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="truncate">3. Reporte de Salidas PNC (Rango de Días)</span>
          </button>
        </div>

        {/* Reporte Seleccionado de PNC */}
        <div className="bg-[#1A1A18] border border-[#2E2E2A] rounded p-4 sm:p-6 shadow-xl">
          {selectedPncReport === 'caducidad' && <PncCaducidadReport />}
          {selectedPncReport === 'estado' && <PncEstadoReport />}
          {selectedPncReport === 'salidas' && <PncSalidasReport />}
        </div>
      </div>
    );
  }

  // MÓDULO 2: INVENTARIOS SIFPRO (Solo reportes correspondientes a SIFPRO)
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Directivo SIFPRO */}
      <div className="bg-[#141414] text-white p-4 sm:p-6 rounded shadow-lg border border-[#3A3A36]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#262218] rounded border border-amber-800/60">
            <Database className="w-8 h-8 text-amber-400" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Reportes e Indicadores SIFPRO
              </h2>
              <span className="bg-amber-950 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider border border-amber-700/60 font-bold">
                Auditoría y Conciliación SIFPRO
              </span>
            </div>
            <p className="text-[#A0A09C] text-sm leading-relaxed max-w-3xl">
              Reportes analíticos de antigüedad y caducidad para auditoría y conciliación de inventarios de la base SIFPRO.
            </p>
          </div>
        </div>
      </div>

      {/* Contenido Exclusivo SIFPRO */}
      <div className="bg-[#1A1A18] border border-[#2E2E2A] rounded p-4 sm:p-6 shadow-xl">
        <SifproReports />
      </div>
    </div>
  );
};
