import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Printer,
  Package,
  ArrowUpDown,
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { PrintedLabel, PRODUCT_CONDITIONS, ProductConditionFlag } from '../../types';

export const PncCaducidadReport: React.FC = () => {
  const { labels, subWarehouses } = useInventory();

  // Range quick presets: 'all' | 'expired' | '7days' | '15days' | '30days' | '60days' | 'custom'
  const [rangePreset, setRangePreset] = useState<string>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'active' | 'all' | 'discharged'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle Preset changes
  const applyPreset = (preset: string) => {
    setRangePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'expired') {
      setStartDate('');
      setEndDate(todayStr);
    } else if (preset === '7days') {
      setStartDate(todayStr);
      const target = new Date();
      target.setDate(target.getDate() + 7);
      setEndDate(target.toISOString().split('T')[0]);
    } else if (preset === '15days') {
      setStartDate(todayStr);
      const target = new Date();
      target.setDate(target.getDate() + 15);
      setEndDate(target.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      setStartDate(todayStr);
      const target = new Date();
      target.setDate(target.getDate() + 30);
      setEndDate(target.toISOString().split('T')[0]);
    } else if (preset === '60days') {
      setStartDate(todayStr);
      const target = new Date();
      target.setDate(target.getDate() + 60);
      setEndDate(target.toISOString().split('T')[0]);
    }
  };

  // Helper to parse date
  const parseDate = (val?: string): Date | null => {
    if (!val) return null;
    const parts = val.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    const dObj = new Date(val);
    return isNaN(dObj.getTime()) ? null : dObj;
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Process and enrich boxes (Producto No Conforme labels)
  const processedBoxes = useMemo(() => {
    return labels.map((lbl) => {
      const expDate = parseDate(lbl.expirationDate);
      let daysRemaining: number | null = null;
      let status: 'caducado' | 'critico' | 'proximo' | 'vigente' | 'sin_fecha' = 'sin_fecha';

      if (expDate) {
        const diffMs = expDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          status = 'caducado';
        } else if (daysRemaining <= 7) {
          status = 'critico';
        } else if (daysRemaining <= 15) {
          status = 'proximo';
        } else {
          status = 'vigente';
        }
      }

      const subW = subWarehouses.find((sw) => sw.code === lbl.subWarehouse || sw.id === lbl.subWarehouse);
      const subWarehouseName = subW ? `${subW.name} (${subW.code})` : lbl.subWarehouse || 'Almacén Congelado';

      return {
        ...lbl,
        expDateObj: expDate,
        daysRemaining,
        caducidadStatus: status,
        subWarehouseName,
      };
    });
  }, [labels, today, subWarehouses]);

  // Filtered boxes
  const filteredBoxes = useMemo(() => {
    return processedBoxes.filter((box) => {
      // Stock status filter
      if (stockStatusFilter === 'active' && box.isDischarged) return false;
      if (stockStatusFilter === 'discharged' && !box.isDischarged) return false;

      // Condition filter
      if (conditionFilter !== 'ALL') {
        if ((box.conditionFlag || 'A') !== conditionFilter) return false;
      }

      // Date Range filter on expiration date
      if (startDate || endDate) {
        if (!box.expDateObj) return false;
        const boxExpStr = box.expDateObj.toISOString().split('T')[0];
        if (startDate && boxExpStr < startDate) return false;
        if (endDate && boxExpStr > endDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          box.id.toLowerCase().includes(q) ||
          box.productCode.toLowerCase().includes(q) ||
          box.productName.toLowerCase().includes(q) ||
          box.lot.toLowerCase().includes(q) ||
          box.subWarehouseName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by expiration date ascending (earliest to expire first)
      if (!a.expDateObj) return 1;
      if (!b.expDateObj) return -1;
      return a.expDateObj.getTime() - b.expDateObj.getTime();
    });
  }, [processedBoxes, stockStatusFilter, conditionFilter, startDate, endDate, searchQuery]);

  // Metric summaries
  const metrics = useMemo(() => {
    const totalCount = filteredBoxes.length;
    const totalWeight = filteredBoxes.reduce((acc, b) => acc + (b.weight || 0), 0);

    const caducados = filteredBoxes.filter((b) => b.caducidadStatus === 'caducado');
    const caducadosCount = caducados.length;
    const caducadosWeight = caducados.reduce((acc, b) => acc + (b.weight || 0), 0);

    const proximos = filteredBoxes.filter((b) => b.caducidadStatus === 'critico' || b.caducidadStatus === 'proximo');
    const proximosCount = proximos.length;
    const proximosWeight = proximos.reduce((acc, b) => acc + (b.weight || 0), 0);

    const vigentes = filteredBoxes.filter((b) => b.caducidadStatus === 'vigente');
    const vigentesCount = vigentes.length;
    const vigentesWeight = vigentes.reduce((acc, b) => acc + (b.weight || 0), 0);

    return {
      totalCount,
      totalWeight,
      caducadosCount,
      caducadosWeight,
      proximosCount,
      proximosWeight,
      vigentesCount,
      vigentesWeight,
    };
  }, [filteredBoxes]);

  // Export CSV function
  const handleExportCSV = () => {
    if (filteredBoxes.length === 0) return;
    const headers = [
      'Folio Caja / ID',
      'Codigo Producto',
      'Descripcion Producto',
      'Lote',
      'Sub-Almacen',
      'Estado / Condicion',
      'Fecha Produccion',
      'Fecha Caducidad',
      'Dias Restantes',
      'Estatus Caducidad',
      'Peso (KG)',
      'Estatus Almacen',
    ];

    const rows = filteredBoxes.map((b) => [
      `"${b.id}"`,
      `"${b.productCode}"`,
      `"${b.productName.replace(/"/g, '""')}"`,
      `"${b.lot}"`,
      `"${b.subWarehouseName}"`,
      `"${PRODUCT_CONDITIONS[b.conditionFlag || 'A']?.shortLabel || b.conditionFlag || 'Apto'}"`,
      `"${b.printTimestamp ? b.printTimestamp.split('T')[0] : ''}"`,
      `"${b.expirationDate || ''}"`,
      b.daysRemaining !== null ? b.daysRemaining : '',
      `"${b.caducidadStatus.toUpperCase()}"`,
      (b.weight || 0).toFixed(2),
      b.isDischarged ? '"SALIDA / DESPACHADO"' : '"EN STOCK"',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Caducidades_PNC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2E2E2A] pb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Reporte de Caducidades — Producto No Conforme (PNC)
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Listado y monitoreo de cajas resguardadas en Almacén Congelado según su rango de caducidad física y fecha de vencimiento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#222220] hover:bg-[#2C2C28] text-cyan-400 border border-cyan-500/40 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar a Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-[#222220] hover:bg-[#2C2C28] text-gray-300 border border-[#3A3A36] rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Imprimir vista"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Rango de Selección de Fecha y Preajustes Rápidos */}
      <div className="bg-[#181816] border border-[#2E2E2A] rounded p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Rango de Caducidad Seleccionado
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-gray-400 mr-1 font-mono">Preajustes:</span>
            {[
              { id: 'all', label: 'Todo el Stock' },
              { id: 'expired', label: '⚠️ Caducados (≤ Hoy)' },
              { id: '7days', label: '7 Días' },
              { id: '15days', label: '15 Días' },
              { id: '30days', label: '30 Días' },
              { id: '60days', label: '60 Días' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  rangePreset === p.id
                    ? 'bg-cyan-500 text-black shadow-xs font-black'
                    : 'bg-[#121210] text-gray-300 border border-[#2E2E2A] hover:border-cyan-500/50 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-[#2E2E2A]">
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Caducidad Desde:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangePreset('custom');
              }}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-mono outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Caducidad Hasta:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangePreset('custom');
              }}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-mono outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Filtro de Estado / Condición:</label>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-bold outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas las Condiciones</option>
              {Object.values(PRODUCT_CONDITIONS).map((cond) => (
                <option key={cond.code} value={cond.code}>
                  {cond.emoji} {cond.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Inventario:</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-bold outline-none focus:border-cyan-500"
            >
              <option value="active">Solo Stock Activo en Cámara</option>
              <option value="discharged">Solo Salidas / Despachadas</option>
              <option value="all">Todo el Historial</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#14181C] border border-cyan-900/50 p-3.5 rounded shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-cyan-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-cyan-400" />
              Cajas en Rango
            </span>
            <span className="font-mono text-cyan-300">Total</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">
              {metrics.totalCount.toLocaleString()} <span className="text-xs font-normal text-gray-400">cajas</span>
            </span>
            <span className="text-sm font-mono font-bold text-cyan-400">
              {metrics.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
            </span>
          </div>
        </div>

        <div className="bg-[#1C1414] border border-rose-900/50 p-3.5 rounded shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-400 mb-1">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" />
              Caducadas
            </span>
            <span className="font-mono text-rose-300">≤ 0 Días</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">
              {metrics.caducadosCount.toLocaleString()} <span className="text-xs font-normal text-gray-400">cajas</span>
            </span>
            <span className="text-sm font-mono font-bold text-rose-400">
              {metrics.caducadosWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
            </span>
          </div>
        </div>

        <div className="bg-[#1C1A14] border border-amber-900/50 p-3.5 rounded shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-400 mb-1">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Próximas a Vencer
            </span>
            <span className="font-mono text-amber-300">1 a 15 Días</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">
              {metrics.proximosCount.toLocaleString()} <span className="text-xs font-normal text-gray-400">cajas</span>
            </span>
            <span className="text-sm font-mono font-bold text-amber-400">
              {metrics.proximosWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
            </span>
          </div>
        </div>

        <div className="bg-[#141C16] border border-emerald-900/50 p-3.5 rounded shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-400 mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Vigentes
            </span>
            <span className="font-mono text-emerald-300">&gt; 15 Días</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">
              {metrics.vigentesCount.toLocaleString()} <span className="text-xs font-normal text-gray-400">cajas</span>
            </span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {metrics.vigentesWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
            </span>
          </div>
        </div>
      </div>

      {/* Search and Table Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#181816] p-2.5 rounded border border-[#2E2E2A]">
        <div className="text-xs text-gray-300 font-bold flex items-center gap-2">
          <span>Listado de Cajas en Almacén Congelado:</span>
          <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
            {filteredBoxes.length} registros
          </span>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por código, producto, lote o ID de caja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121210] border border-[#3A3A36] focus:border-cyan-500 text-xs text-white pl-8 pr-3 py-1.5 rounded outline-none placeholder:text-gray-600 font-mono"
          />
        </div>
      </div>

      {/* Table of Boxes */}
      {filteredBoxes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#10100E] border border-[#2E2E2A] rounded space-y-2">
          <Clock className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-bold text-gray-400">No se encontraron cajas de PNC en el rango o filtros seleccionados.</p>
          <p className="text-xs text-gray-600">Pruebe ampliando el rango de caducidad o cambiando el preajuste.</p>
        </div>
      ) : (
        <div className="border border-[#2E2E2A] rounded bg-[#10100E] overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2E2E2A] text-gray-400 text-[10px] uppercase tracking-wider bg-[#141414]">
                  <th className="py-2.5 px-3 font-black">ID Caja / Etiqueta</th>
                  <th className="py-2.5 px-3 font-black">Código / Producto</th>
                  <th className="py-2.5 px-3 font-black">Lote</th>
                  <th className="py-2.5 px-3 font-black">Ubicación / Sub-Almacén</th>
                  <th className="py-2.5 px-3 font-black">Estado / Condición</th>
                  <th className="py-2.5 px-3 font-black text-center">F. Empaque</th>
                  <th className="py-2.5 px-3 font-black text-center">F. Caducidad</th>
                  <th className="py-2.5 px-3 font-black text-center">Días Restantes</th>
                  <th className="py-2.5 px-3 font-black text-right">Peso Neto (KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2E2A]">
                {filteredBoxes.map((box) => {
                  const cond = PRODUCT_CONDITIONS[box.conditionFlag || 'A'] || PRODUCT_CONDITIONS.A;
                  return (
                    <tr key={box.id} className="hover:bg-[#181816] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{box.id}</span>
                          {box.isDischarged && (
                            <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                              Salida
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-amber-400 font-bold">{box.productCode}</div>
                        <div className="text-gray-200 font-bold text-[11px] truncate max-w-[200px]" title={box.productName}>
                          {box.productName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300 font-bold">
                        {box.lot}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-400">
                        {box.subWarehouseName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${cond.badgeBg} ${cond.badgeText}`}>
                          <span>{cond.emoji}</span>
                          <span>{cond.shortLabel}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-center text-gray-400">
                        {box.printTimestamp ? box.printTimestamp.split('T')[0] : 'S/F'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-center font-bold text-white">
                        {box.expirationDate || 'Sin Fecha'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {box.daysRemaining === null ? (
                          <span className="text-gray-500 text-[10px]">Sin fecha</span>
                        ) : box.caducidadStatus === 'caducado' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-rose-950/80 text-rose-300 border border-rose-700 font-mono">
                            <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                            {box.daysRemaining}d (Caducado)
                          </span>
                        ) : box.caducidadStatus === 'critico' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-orange-950/80 text-orange-300 border border-orange-600 font-mono">
                            <AlertCircle className="w-3 h-3 text-orange-400 shrink-0" />
                            {box.daysRemaining}d restantes
                          </span>
                        ) : box.caducidadStatus === 'proximo' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-amber-950/80 text-amber-300 border border-amber-600 font-mono">
                            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                            {box.daysRemaining}d restantes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            {box.daysRemaining}d vigentes
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-cyan-300 font-black">
                        {(box.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Gran Total Footer */}
          <div className="bg-[#141414] border-t border-[#2E2E2A] p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-gray-400 font-black uppercase text-xs">
              Total Cajas Listadas en Rango
            </span>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400 font-bold">
                Total Cajas: <span className="text-white font-mono">{metrics.totalCount.toLocaleString()}</span>
              </span>
              <span className="text-gray-400 font-bold">
                Peso Total: <span className="text-cyan-400 font-mono font-black">{metrics.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
