import React, { useState, useMemo } from 'react';
import {
  Tag,
  Search,
  Filter,
  Package,
  Layers,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { PRODUCT_CONDITIONS, ProductConditionFlag } from '../../types';

export const PncEstadoReport: React.FC = () => {
  const { labels, subWarehouses, conditionExpirationConfig } = useInventory();

  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [selectedSubWarehouse, setSelectedSubWarehouse] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'active' | 'all' | 'discharged'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Process boxes
  const processedBoxes = useMemo(() => {
    return labels.map((lbl) => {
      const condFlag: ProductConditionFlag = (lbl.conditionFlag as ProductConditionFlag) || 'A';
      const condInfo = PRODUCT_CONDITIONS[condFlag] || PRODUCT_CONDITIONS.A;
      const subW = subWarehouses.find((sw) => sw.code === lbl.subWarehouse || sw.id === lbl.subWarehouse);
      const subWarehouseName = subW ? `${subW.name} (${subW.code})` : lbl.subWarehouse || 'Almacén Congelado';
      const ruleDays = conditionExpirationConfig?.[condFlag]?.days ?? 360;

      return {
        ...lbl,
        condFlag,
        condInfo,
        subWarehouseName,
        ruleDays,
      };
    });
  }, [labels, subWarehouses, conditionExpirationConfig]);

  // Calculations per condition (only active stock by default or according to filter)
  const conditionStats = useMemo(() => {
    const baseList = processedBoxes.filter((b) => {
      if (stockStatusFilter === 'active') return !b.isDischarged;
      if (stockStatusFilter === 'discharged') return b.isDischarged;
      return true;
    });

    const totalWeightAll = baseList.reduce((acc, b) => acc + (b.weight || 0), 0) || 1;
    const totalCountAll = baseList.length || 1;

    const stats: Record<
      ProductConditionFlag,
      { count: number; weight: number; countPercent: number; weightPercent: number }
    > = {
      A: { count: 0, weight: 0, countPercent: 0, weightPercent: 0 },
      B: { count: 0, weight: 0, countPercent: 0, weightPercent: 0 },
      R: { count: 0, weight: 0, countPercent: 0, weightPercent: 0 },
      M: { count: 0, weight: 0, countPercent: 0, weightPercent: 0 },
      I: { count: 0, weight: 0, countPercent: 0, weightPercent: 0 },
    };

    baseList.forEach((b) => {
      if (stats[b.condFlag]) {
        stats[b.condFlag].count += 1;
        stats[b.condFlag].weight += b.weight || 0;
      }
    });

    (Object.keys(stats) as ProductConditionFlag[]).forEach((flag) => {
      stats[flag].countPercent = (stats[flag].count / totalCountAll) * 100;
      stats[flag].weightPercent = (stats[flag].weight / totalWeightAll) * 100;
    });

    return {
      stats,
      totalCount: baseList.length,
      totalWeight: baseList.reduce((acc, b) => acc + (b.weight || 0), 0),
    };
  }, [processedBoxes, stockStatusFilter]);

  // Filtered boxes for table
  const filteredBoxes = useMemo(() => {
    return processedBoxes.filter((box) => {
      if (stockStatusFilter === 'active' && box.isDischarged) return false;
      if (stockStatusFilter === 'discharged' && !box.isDischarged) return false;

      if (selectedCondition !== 'ALL' && box.condFlag !== selectedCondition) return false;
      if (selectedSubWarehouse !== 'ALL' && box.subWarehouse !== selectedSubWarehouse) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          box.id.toLowerCase().includes(q) ||
          box.productCode.toLowerCase().includes(q) ||
          box.productName.toLowerCase().includes(q) ||
          box.lot.toLowerCase().includes(q) ||
          box.subWarehouseName.toLowerCase().includes(q) ||
          box.condInfo.label.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by condition priority: A, B, R, M, I, then code
      const order = { A: 1, B: 2, R: 3, M: 4, I: 5 };
      const diff = (order[a.condFlag] || 9) - (order[b.condFlag] || 9);
      if (diff !== 0) return diff;
      return a.productCode.localeCompare(b.productCode);
    });
  }, [processedBoxes, stockStatusFilter, selectedCondition, selectedSubWarehouse, searchQuery]);

  const filteredTotals = useMemo(() => {
    return {
      count: filteredBoxes.length,
      weight: filteredBoxes.reduce((acc, b) => acc + (b.weight || 0), 0),
    };
  }, [filteredBoxes]);

  // Export CSV function
  const handleExportCSV = () => {
    if (filteredBoxes.length === 0) return;
    const headers = [
      'ID Caja',
      'Codigo Producto',
      'Nombre Producto',
      'Clasificacion / Estado',
      'Lote',
      'Ubicacion Sub-Almacen',
      'Dias Vida Util Regla',
      'Fecha Produccion',
      'Fecha Caducidad',
      'Peso Neto (KG)',
      'Estatus Almacen',
    ];

    const rows = filteredBoxes.map((b) => [
      `"${b.id}"`,
      `"${b.productCode}"`,
      `"${b.productName.replace(/"/g, '""')}"`,
      `"[${b.condFlag}] ${b.condInfo.shortLabel}"`,
      `"${b.lot}"`,
      `"${b.subWarehouseName}"`,
      b.ruleDays,
      `"${b.printTimestamp ? b.printTimestamp.split('T')[0] : ''}"`,
      `"${b.expirationDate || ''}"`,
      (b.weight || 0).toFixed(2),
      b.isDischarged ? '"SALIDA / DESPACHADO"' : '"EN STOCK"',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Estados_PNC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const conditionKeys: ProductConditionFlag[] = ['A', 'B', 'R', 'M', 'I'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2E2E2A] pb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            Reporte por Estado / Condición de Producto No Conforme (PNC)
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Segmentación física y métricas de cajas clasificadas por condición de calidad: [A] Apto, [B] Segunda, [R] Remate, [M] Merma e [I] Inspección.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#222220] hover:bg-[#2C2C28] text-amber-400 border border-amber-500/40 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar a Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-[#222220] hover:bg-[#2C2C28] text-gray-300 border border-[#3A3A36] rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Imprimir reporte"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 5 Interactive Cards per Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {conditionKeys.map((flag) => {
          const info = PRODUCT_CONDITIONS[flag];
          const st = conditionStats.stats[flag];
          const isSelected = selectedCondition === flag;

          return (
            <button
              key={flag}
              type="button"
              onClick={() => setSelectedCondition(isSelected ? 'ALL' : flag)}
              className={`text-left p-3.5 rounded border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-[#22221E] border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                  : 'bg-[#161614] border-[#2E2E2A] hover:border-[#444440] hover:bg-[#1C1C19]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${info.badgeBg} ${info.badgeText}`}>
                  <span>{info.emoji}</span>
                  <span>[{flag}] {info.shortLabel}</span>
                </span>
                <span className="text-[11px] font-mono text-gray-400 font-bold">
                  {st.weightPercent.toFixed(1)}%
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xl font-black font-mono text-white">
                  {st.count.toLocaleString()} <span className="text-xs font-normal text-gray-400">cajas</span>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  {st.weight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
                </div>
              </div>

              <div className="text-[10px] text-gray-500 mt-2 line-clamp-1" title={info.description}>
                {info.description}
              </div>

              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Visual Proportional Distribution Bar */}
      <div className="bg-[#181816] border border-[#2E2E2A] rounded p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-gray-300">
          <span className="flex items-center gap-1.5 uppercase font-mono text-[11px] text-gray-400">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            Distribución Porcentual del Peso en Cámara de Congelado
          </span>
          <span className="font-mono text-amber-400 font-bold">
            Total Activo: {conditionStats.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG
          </span>
        </div>

        {/* Multi-colored bar */}
        <div className="w-full h-4 bg-[#10100E] rounded-full overflow-hidden flex border border-[#2E2E2A]">
          {conditionKeys.map((flag) => {
            const pct = conditionStats.stats[flag].weightPercent;
            if (pct <= 0) return null;
            const barColors: Record<ProductConditionFlag, string> = {
              A: 'bg-emerald-500',
              B: 'bg-amber-400',
              R: 'bg-orange-500',
              M: 'bg-rose-600',
              I: 'bg-blue-500',
            };

            return (
              <div
                key={flag}
                style={{ width: `${pct}%` }}
                className={`${barColors[flag]} h-full transition-all`}
                title={`[${flag}] ${PRODUCT_CONDITIONS[flag].shortLabel}: ${pct.toFixed(1)}% (${conditionStats.stats[flag].weight.toFixed(1)} KG)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1 text-gray-400 font-mono">
          {conditionKeys.map((flag) => {
            const dotColors: Record<ProductConditionFlag, string> = {
              A: 'bg-emerald-500',
              B: 'bg-amber-400',
              R: 'bg-orange-500',
              M: 'bg-rose-600',
              I: 'bg-blue-500',
            };
            return (
              <div key={flag} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColors[flag]}`}></span>
                <span className="text-gray-300 font-bold">[{flag}] {PRODUCT_CONDITIONS[flag].shortLabel}:</span>
                <span className="text-white">{conditionStats.stats[flag].weightPercent.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-[#181816] border border-[#2E2E2A] rounded p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedCondition('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCondition === 'ALL'
                  ? 'bg-amber-500 text-black font-black shadow-xs'
                  : 'bg-[#121210] text-gray-300 border border-[#2E2E2A] hover:text-white'
              }`}
            >
              Todos los Estados ({conditionStats.totalCount})
            </button>
            {conditionKeys.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => setSelectedCondition(flag)}
                className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCondition === flag
                    ? 'bg-white text-black font-black shadow-xs'
                    : 'bg-[#121210] text-gray-400 border border-[#2E2E2A] hover:text-white'
                }`}
              >
                <span>{PRODUCT_CONDITIONS[flag].emoji}</span>
                <span>[{flag}] {PRODUCT_CONDITIONS[flag].shortLabel} ({conditionStats.stats[flag].count})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por código, producto, lote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121210] border border-[#3A3A36] focus:border-amber-500 text-xs text-white pl-8 pr-3 py-1.5 rounded outline-none placeholder:text-gray-600 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2E2E2A]/50">
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Filtrar por Sub-Almacén / Cámara:</label>
            <select
              value={selectedSubWarehouse}
              onChange={(e) => setSelectedSubWarehouse(e.target.value)}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-bold outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas las Cámaras / Sub-Almacenes</option>
              {subWarehouses.map((sw) => (
                <option key={sw.id} value={sw.code}>
                  {sw.name} ({sw.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Estatus en Inventario:</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-bold outline-none focus:border-amber-500"
            >
              <option value="active">Solo Stock Activo en Cámara</option>
              <option value="discharged">Solo Salidas / Despachadas</option>
              <option value="all">Todo el Historial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Boxes by Condition */}
      {filteredBoxes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#10100E] border border-[#2E2E2A] rounded space-y-2">
          <Tag className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-bold text-gray-400">No se encontraron cajas para el estado y filtros seleccionados.</p>
        </div>
      ) : (
        <div className="border border-[#2E2E2A] rounded bg-[#10100E] overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2E2E2A] text-gray-400 text-[10px] uppercase tracking-wider bg-[#141414]">
                  <th className="py-2.5 px-3 font-black">ID Caja</th>
                  <th className="py-2.5 px-3 font-black">Código / Producto</th>
                  <th className="py-2.5 px-3 font-black">Estado / Condición</th>
                  <th className="py-2.5 px-3 font-black">Lote</th>
                  <th className="py-2.5 px-3 font-black">Cámara / Sub-Almacén</th>
                  <th className="py-2.5 px-3 font-black text-center">F. Empaque</th>
                  <th className="py-2.5 px-3 font-black text-center">F. Caducidad</th>
                  <th className="py-2.5 px-3 font-black text-center">Estatus</th>
                  <th className="py-2.5 px-3 font-black text-right">Peso Neto (KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2E2A]">
                {filteredBoxes.map((box) => (
                  <tr key={box.id} className="hover:bg-[#181816] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">
                      {box.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-amber-400 font-bold">{box.productCode}</div>
                      <div className="text-gray-200 font-bold text-[11px] truncate max-w-[200px]" title={box.productName}>
                        {box.productName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold ${box.condInfo.badgeBg} ${box.condInfo.badgeText}`}>
                        <span>{box.condInfo.emoji}</span>
                        <span>[{box.condFlag}] {box.condInfo.shortLabel}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-300 font-bold">
                      {box.lot}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-gray-400">
                      {box.subWarehouseName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center text-gray-400">
                      {box.printTimestamp ? box.printTimestamp.split('T')[0] : 'S/F'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-center font-bold text-gray-200">
                      {box.expirationDate || 'Sin Fecha'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {box.isDischarged ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                          DESPACHADO
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          EN STOCK
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-black">
                      {(box.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-[#141414] border-t border-[#2E2E2A] p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-gray-400 font-black uppercase text-xs">
              Total Cajas en Vista de Estado
            </span>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400 font-bold">
                Cajas: <span className="text-white font-mono">{filteredTotals.count.toLocaleString()}</span>
              </span>
              <span className="text-gray-400 font-bold">
                Peso Total: <span className="text-amber-400 font-mono font-black">{filteredTotals.weight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
