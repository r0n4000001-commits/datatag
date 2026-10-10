import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  Calendar,
  Search,
  Filter,
  Package,
  FileSpreadsheet,
  Printer,
  TrendingDown,
  User,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { DischargeRecord, PRODUCT_CONDITIONS, ProductConditionFlag } from '../../types';

export const PncSalidasReport: React.FC = () => {
  const { discharges, labels, subWarehouses } = useInventory();

  // Range preset: 'today' | '7days' | '15days' | '30days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'
  const [rangePreset, setRangePreset] = useState<string>('30days');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle Preset changes
  const applyPreset = (preset: string) => {
    setRangePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '15days') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Combine Discharges records and Discharged Labels to ensure 100% data coverage
  const unifiedDischarges = useMemo(() => {
    const dischargeMap = new Map<string, any>();

    // 1. Add records from discharges array
    discharges.forEach((d) => {
      const targetLbl = labels.find((l) => l.id === d.labelId);
      const subW = subWarehouses.find(
        (sw) => sw.code === (d.subWarehouse || targetLbl?.subWarehouse) || sw.id === (d.subWarehouse || targetLbl?.subWarehouse)
      );

      dischargeMap.set(d.id || d.labelId, {
        id: d.id,
        labelId: d.labelId,
        productCode: d.productCode,
        productName: d.productName,
        lot: d.lot,
        weight: d.weight,
        unit: d.unit || 'KG',
        warehouse: d.warehouse || 'Congelado',
        subWarehouse: d.subWarehouse || targetLbl?.subWarehouse || 'SUB-CONG-01',
        subWarehouseName: subW ? `${subW.name} (${subW.code})` : d.subWarehouse || 'Almacén Congelado',
        conditionFlag: d.conditionFlag || targetLbl?.conditionFlag || 'A',
        timestamp: d.timestamp,
        dateStr: d.timestamp ? d.timestamp.split('T')[0] : '',
        scannedBy: d.scannedBy || 'Operador Almacén',
        reason: d.reason || 'Despacho Producción',
        notes: d.notes || '',
      });
    });

    // 2. Add discharged labels that might not be in discharges table
    labels.forEach((lbl) => {
      if (lbl.isDischarged && lbl.dischargedAt) {
        // Check if already mapped by labelId
        const alreadyIn = Array.from(dischargeMap.values()).some((v) => v.labelId === lbl.id);
        if (!alreadyIn) {
          const subW = subWarehouses.find((sw) => sw.code === lbl.subWarehouse || sw.id === lbl.subWarehouse);
          const key = `DIS-${lbl.id}`;
          dischargeMap.set(key, {
            id: key,
            labelId: lbl.id,
            productCode: lbl.productCode,
            productName: lbl.productName,
            lot: lbl.lot,
            weight: lbl.weight,
            unit: lbl.unit || 'KG',
            warehouse: lbl.warehouse || 'Congelado',
            subWarehouse: lbl.subWarehouse || 'SUB-CONG-01',
            subWarehouseName: subW ? `${subW.name} (${subW.code})` : lbl.subWarehouse || 'Almacén Congelado',
            conditionFlag: lbl.conditionFlag || 'A',
            timestamp: lbl.dischargedAt,
            dateStr: lbl.dischargedAt.split('T')[0],
            scannedBy: lbl.dischargedBy || 'Operador Almacén',
            reason: lbl.dischargeReason || 'Despacho Producción',
            notes: 'Salida de almacén registrada',
          });
        }
      }
    });

    return Array.from(dischargeMap.values()).sort((a, b) => {
      // Sort newest discharge first
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [discharges, labels, subWarehouses]);

  // Distinct reasons present in the data
  const distinctReasons = useMemo(() => {
    const set = new Set<string>();
    unifiedDischarges.forEach((d) => {
      if (d.reason) set.add(d.reason);
    });
    return Array.from(set);
  }, [unifiedDischarges]);

  // Filtered discharges
  const filteredDischarges = useMemo(() => {
    return unifiedDischarges.filter((d) => {
      // Date range filter
      if (startDate && d.dateStr && d.dateStr < startDate) return false;
      if (endDate && d.dateStr && d.dateStr > endDate) return false;

      // Reason filter
      if (reasonFilter !== 'ALL' && d.reason !== reasonFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          d.id.toLowerCase().includes(q) ||
          d.labelId.toLowerCase().includes(q) ||
          d.productCode.toLowerCase().includes(q) ||
          d.productName.toLowerCase().includes(q) ||
          d.lot.toLowerCase().includes(q) ||
          d.scannedBy.toLowerCase().includes(q) ||
          d.reason.toLowerCase().includes(q) ||
          d.notes.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedDischarges, startDate, endDate, reasonFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const count = filteredDischarges.length;
    const weight = filteredDischarges.reduce((acc, d) => acc + (d.weight || 0), 0);
    const avgWeight = count > 0 ? weight / count : 0;

    // Reason counts
    const byReason: Record<string, { count: number; weight: number }> = {};
    filteredDischarges.forEach((d) => {
      const r = d.reason || 'Otros';
      if (!byReason[r]) byReason[r] = { count: 0, weight: 0 };
      byReason[r].count += 1;
      byReason[r].weight += d.weight || 0;
    });

    return {
      count,
      weight,
      avgWeight,
      byReason,
    };
  }, [filteredDischarges]);

  // Format date time helper
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'S/F';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Helper badge for reason
  const getReasonBadge = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes('producción') || r.includes('produccion')) {
      return 'bg-blue-950/80 text-blue-300 border-blue-700';
    }
    if (r.includes('venta')) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
    }
    if (r.includes('merma') || r.includes('vencimiento')) {
      return 'bg-rose-950/80 text-rose-300 border-rose-700';
    }
    if (r.includes('transferencia')) {
      return 'bg-purple-950/80 text-purple-300 border-purple-700';
    }
    if (r.includes('mkt') || r.includes('mercado') || r.includes('muestreo')) {
      return 'bg-amber-950/80 text-amber-300 border-amber-700';
    }
    return 'bg-gray-800 text-gray-300 border-gray-600';
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredDischarges.length === 0) return;
    const headers = [
      'Folio Salida',
      'Fecha y Hora Salida',
      'ID Caja / Etiqueta',
      'Codigo Producto',
      'Nombre Producto',
      'Lote',
      'Estado / Condicion',
      'Sub-Almacen',
      'Motivo de Salida',
      'Operador / Despachador',
      'Peso Salido (KG)',
      'Observaciones / Notas',
    ];

    const rows = filteredDischarges.map((d) => [
      `"${d.id}"`,
      `"${d.timestamp || ''}"`,
      `"${d.labelId}"`,
      `"${d.productCode}"`,
      `"${d.productName.replace(/"/g, '""')}"`,
      `"${d.lot}"`,
      `"${d.conditionFlag || 'A'}"`,
      `"${d.subWarehouseName}"`,
      `"${d.reason}"`,
      `"${d.scannedBy.replace(/"/g, '""')}"`,
      (d.weight || 0).toFixed(2),
      `"${d.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Salidas_PNC_${startDate || 'inicio'}_al_${endDate || 'fin'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2E2E2A] pb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            Reporte de Salidas — Producto No Conforme (PNC)
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Auditoría y trazabilidad de cajas despachadas de almacén congelado de acuerdo al rango de días y motivo de egreso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#222220] hover:bg-[#2C2C28] text-emerald-400 border border-emerald-500/40 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* Date Range Selector & Presets */}
      <div className="bg-[#181816] border border-[#2E2E2A] rounded p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Rango de Días de Salida Definido
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-gray-400 mr-1 font-mono">Preajustes:</span>
            {[
              { id: 'today', label: 'Hoy' },
              { id: '7days', label: 'Últimos 7 Días' },
              { id: '15days', label: '15 Días' },
              { id: '30days', label: '30 Días' },
              { id: 'thisMonth', label: 'Este Mes' },
              { id: 'lastMonth', label: 'Mes Anterior' },
              { id: 'all', label: 'Todo el Histórico' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  rangePreset === p.id
                    ? 'bg-emerald-500 text-black shadow-xs font-black'
                    : 'bg-[#121210] text-gray-300 border border-[#2E2E2A] hover:border-emerald-500/50 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Inputs & Motivo Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#2E2E2A]">
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Fecha Salida Desde:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangePreset('custom');
              }}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Fecha Salida Hasta:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangePreset('custom');
              }}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 font-bold mb-1">Filtrar por Motivo de Salida:</label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full bg-[#121210] border border-[#3A3A36] text-white px-3 py-1.5 rounded text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="ALL">Todos los Motivos de Salida</option>
              {distinctReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#141C16] border border-emerald-900/50 p-3.5 rounded shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-400" />
              Cajas Salidas en Rango
            </span>
            <span className="font-mono text-emerald-300">Total</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-white">
              {metrics.count.toLocaleString()} <span className="text-xs font-normal text-gray-400">cajas</span>
            </span>
            <span className="text-xs font-mono text-gray-400">
              {metrics.avgWeight > 0 ? `Prom: ${metrics.avgWeight.toFixed(1)} KG/caja` : ''}
            </span>
          </div>
        </div>

        <div className="bg-[#14181C] border border-cyan-900/50 p-3.5 rounded shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-cyan-400 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              Peso Total Despachado
            </span>
            <span className="font-mono text-cyan-300">KG Netos</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono text-cyan-300">
              {metrics.weight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-normal text-gray-400">KG</span>
            </span>
          </div>
        </div>

        <div className="bg-[#181816] border border-[#2E2E2A] p-3.5 rounded shadow-sm">
          <div className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center justify-between">
            <span>Desglose por Motivo</span>
            <span className="font-mono text-[10px] text-gray-500">{Object.keys(metrics.byReason).length} tipos</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(metrics.byReason).map(([reason, data]: [string, { count: number; weight: number }]) => (
              <span
                key={reason}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-[#121210] border border-[#2E2E2A] px-2 py-0.5 rounded text-gray-300"
              >
                <span className="font-bold text-white">{reason}:</span>
                <span className="text-emerald-400 font-bold">{data.count} cj</span>
                <span className="text-gray-400">({data.weight.toFixed(1)}k)</span>
              </span>
            ))}
            {Object.keys(metrics.byReason).length === 0 && (
              <span className="text-xs text-gray-500">Sin salidas en el periodo</span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#181816] p-2.5 rounded border border-[#2E2E2A]">
        <div className="text-xs text-gray-300 font-bold flex items-center gap-2">
          <span>Registros de Salida Encontrados:</span>
          <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
            {filteredDischarges.length} salidas
          </span>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por folio, código, producto, lote u operador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121210] border border-[#3A3A36] focus:border-emerald-500 text-xs text-white pl-8 pr-3 py-1.5 rounded outline-none placeholder:text-gray-600 font-mono"
          />
        </div>
      </div>

      {/* Table of Discharges */}
      {filteredDischarges.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#10100E] border border-[#2E2E2A] rounded space-y-2">
          <UploadCloud className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-bold text-gray-400">No se registraron salidas en el rango de fechas seleccionado.</p>
          <p className="text-xs text-gray-600">Puede seleccionar &quot;Todo el Histórico&quot; para consultar todos los despachos previos.</p>
        </div>
      ) : (
        <div className="border border-[#2E2E2A] rounded bg-[#10100E] overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2E2E2A] text-gray-400 text-[10px] uppercase tracking-wider bg-[#141414]">
                  <th className="py-2.5 px-3 font-black">Folio Salida</th>
                  <th className="py-2.5 px-3 font-black">Fecha y Hora</th>
                  <th className="py-2.5 px-3 font-black">ID Caja Original</th>
                  <th className="py-2.5 px-3 font-black">Código / Producto</th>
                  <th className="py-2.5 px-3 font-black">Lote</th>
                  <th className="py-2.5 px-3 font-black">Condición</th>
                  <th className="py-2.5 px-3 font-black">Motivo de Salida</th>
                  <th className="py-2.5 px-3 font-black">Operador / Despachador</th>
                  <th className="py-2.5 px-3 font-black text-right">Peso (KG)</th>
                  <th className="py-2.5 px-3 font-black">Notas / Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2E2A]">
                {filteredDischarges.map((d) => {
                  const cond = PRODUCT_CONDITIONS[d.conditionFlag as ProductConditionFlag] || PRODUCT_CONDITIONS.A;
                  const reasonBadgeClass = getReasonBadge(d.reason);

                  return (
                    <tr key={d.id} className="hover:bg-[#181816] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                        {d.exitFolio || d.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300 text-[11px] whitespace-nowrap">
                        {formatDateTime(d.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">
                        {d.labelId}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-amber-400 font-bold">{d.productCode}</div>
                        <div className="text-gray-200 font-bold text-[11px] truncate max-w-[180px]" title={d.productName}>
                          {d.productName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300 font-bold">
                        {d.lot}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${cond.badgeBg} ${cond.badgeText}`}>
                          <span>{cond.emoji}</span>
                          <span>[{d.conditionFlag || 'A'}]</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${reasonBadgeClass}`}>
                          {d.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-300 text-[11px]">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-500 shrink-0" />
                          <span className="truncate max-w-[160px]" title={d.scannedBy}>
                            {d.scannedBy}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-black">
                        {(d.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-[11px] max-w-[200px] truncate" title={d.notes}>
                        {d.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="bg-[#141414] border-t border-[#2E2E2A] p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-gray-400 font-black uppercase text-xs">
              Total Salidas en Rango Definido
            </span>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400 font-bold">
                Total Salidas: <span className="text-white font-mono">{metrics.count.toLocaleString()}</span>
              </span>
              <span className="text-gray-400 font-bold">
                Peso Total Salido: <span className="text-emerald-400 font-mono font-black">{metrics.weight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
