import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  ChevronRight,
  BarChart2,
  Info,
  RotateCcw,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Search,
  Clock,
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';

export interface ExpirationRule {
  id: string;
  condition: string;
  packaging: string;
  days: number;
}

const DEFAULT_EXPIRATION_RULES: ExpirationRule[] = [
  { id: 'fresco_sin_vacio', condition: 'Fresco', packaging: 'Sin vacío', days: 10 },
  { id: 'fresco_vacio_hueso', condition: 'Fresco al vacío', packaging: 'Con hueso', days: 40 },
  { id: 'fresco_vacio_sin_hueso', condition: 'Fresco al vacío', packaging: 'Sin hueso', days: 60 },
  { id: 'congelado_general', condition: 'Congelado', packaging: 'General (730 días / 2 años)', days: 730 },
];

export const SifproReports: React.FC = () => {
  const { sifproRecords } = useInventory();
  const [selectedReport, setSelectedReport] = useState<'antiguedad' | 'caducidad'>('antiguedad');
  const [selectedYearTab, setSelectedYearTab] = useState<string>('');
  const [expirationRules, setExpirationRules] = useState<ExpirationRule[]>(DEFAULT_EXPIRATION_RULES);
  const [caducidadFilter, setCaducidadFilter] = useState<'todos' | 'caducados' | 'proximos' | 'vigentes'>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const availableSifproRecords = useMemo(() => {
    return sifproRecords.filter((record) => !record.isReserved);
  }, [sifproRecords]);

  // Parse inventory by year for "Antigüedad de Inventarios" using FIFO availability
  const antiguedadData = useMemo(() => {
    const parseWeightValue = (val: number | string | undefined): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9.]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    const productMap = new Map<
      string,
      {
        code: string;
        name: string;
        incomingByYear: Record<string, { count: number; weight: number }>;
        salesCount: number;
        salesWeight: number;
      }
    >();

    availableSifproRecords.forEach((record) => {
      const key = record.code;
      if (!productMap.has(key)) {
        productMap.set(key, {
          code: record.code,
          name: record.name,
          incomingByYear: {},
          salesCount: 0,
          salesWeight: 0,
        });
      }

      const item = productMap.get(key)!;
      const w = parseWeightValue(record.weight);

      if (record.recordType === 'Venta Diaria') {
        item.salesCount += 1;
        item.salesWeight += w;
      } else {
        let yearStr = 'Desconocido';
        if (record.date) {
          const dateRaw = String(record.date).trim();
          const match4 = dateRaw.match(/\b(19\d{2}|20\d{2})\b/);
          const match2 = dateRaw.match(/\b\d{2}[\/\-]\d{2}[\/\-](\d{2})\b/);

          if (match4) {
            yearStr = match4[1];
          } else if (match2) {
            const yy = parseInt(match2[1], 10);
            yearStr = (yy >= 50 ? '19' : '20') + match2[1];
          } else if (dateRaw.length === 8 && dateRaw.startsWith('20')) {
            yearStr = dateRaw.substring(0, 4);
          } else if (dateRaw.length === 6 && !isNaN(Number(dateRaw))) {
            const yy = parseInt(dateRaw.substring(0, 2), 10);
            if (yy >= 10 && yy <= 99) {
              yearStr = '20' + dateRaw.substring(0, 2);
            }
          } else if (dateRaw.length >= 4) {
            const first4 = dateRaw.substring(0, 4);
            if (!isNaN(Number(first4)) && Number(first4) >= 1990 && Number(first4) <= 2099) {
              yearStr = first4;
            }
          }
        }

        if (yearStr !== 'Desconocido' && !isNaN(Number(yearStr)) && Number(yearStr) <= 2020) {
          yearStr = '2020 y Anteriores';
        }

        if (!item.incomingByYear[yearStr]) {
          item.incomingByYear[yearStr] = { count: 0, weight: 0 };
        }
        item.incomingByYear[yearStr].count += 1;
        item.incomingByYear[yearStr].weight += w;
      }
    });

    const yearlyAvailable = new Map<
      string,
      Map<string, { code: string; name: string; count: number; weight: number }>
    >();

    productMap.forEach((item) => {
      let remSalesCount = item.salesCount;
      let remSalesWeight = item.salesWeight;

      const sortedYears = Object.keys(item.incomingByYear).sort((a, b) => {
        if (a === 'Desconocido') return -1;
        if (b === 'Desconocido') return 1;
        if (a === '2020 y Anteriores') return -1;
        if (b === '2020 y Anteriores') return 1;
        return Number(a) - Number(b);
      });

      sortedYears.forEach((year) => {
        const inc = item.incomingByYear[year];
        let availCount = inc.count;
        let availWeight = inc.weight;

        if (remSalesCount > 0) {
          if (remSalesCount >= availCount) {
            remSalesCount -= availCount;
            availCount = 0;
          } else {
            availCount -= remSalesCount;
            remSalesCount = 0;
          }
        }

        if (remSalesWeight > 0) {
          if (remSalesWeight >= availWeight) {
            remSalesWeight -= availWeight;
            availWeight = 0;
          } else {
            availWeight -= remSalesWeight;
            remSalesWeight = 0;
          }
        }

        if (availCount > 0 || availWeight > 0) {
          if (!yearlyAvailable.has(year)) {
            yearlyAvailable.set(year, new Map());
          }
          yearlyAvailable.get(year)!.set(item.code, {
            code: item.code,
            name: item.name,
            count: availCount,
            weight: availWeight,
          });
        }
      });
    });

    const groups: {
      year: string;
      products: { code: string; name: string; count: number; weight: number }[];
      totalCount: number;
      totalWeight: number;
    }[] = [];

    yearlyAvailable.forEach((prodsMap, year) => {
      const products = Array.from(prodsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
      const totalCount = products.reduce((acc, p) => acc + p.count, 0);
      const totalWeight = products.reduce((acc, p) => acc + p.weight, 0);
      groups.push({ year, products, totalCount, totalWeight });
    });

    groups.sort((a, b) => {
      if (a.year === 'Desconocido') return 1;
      if (b.year === 'Desconocido') return -1;
      if (a.year === '2020 y Anteriores') return -1;
      if (b.year === '2020 y Anteriores') return 1;
      return Number(a.year) - Number(b.year);
    });

    return groups;
  }, [availableSifproRecords]);

  const activeYearTab = useMemo(() => {
    if (selectedYearTab && antiguedadData.some((g) => g.year === selectedYearTab)) {
      return selectedYearTab;
    }
    return antiguedadData.length > 0 ? antiguedadData[0].year : '';
  }, [selectedYearTab, antiguedadData]);

  // SIFPRO Caducidad Calculation
  const caducidadData = useMemo(() => {
    const parseWeightValue = (val: number | string | undefined): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9.]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseDateValue = (dateRaw?: string): Date | null => {
      if (!dateRaw) return null;
      const clean = String(dateRaw).trim();
      if (clean.includes('-') && clean.length >= 8) {
        const parts = clean.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(y, m, d);
        }
      }
      if (clean.includes('/') && clean.length >= 8) {
        const parts = clean.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          let y = parseInt(parts[2], 10);
          if (y < 100) y += y >= 50 ? 1900 : 2000;
          return new Date(y, m, d);
        }
      }
      return null;
    };

    const productLots = new Map<
      string,
      Map<string, { count: number; weight: number; dateRaw?: string; dateObj: Date | null; name: string }>
    >();

    availableSifproRecords.forEach((record) => {
      if (record.recordType === 'Venta Diaria') return;
      const code = record.code;
      const lot = record.lot || 'SIN LOTE';
      const w = parseWeightValue(record.weight);

      if (!productLots.has(code)) {
        productLots.set(code, new Map());
      }
      const lotsMap = productLots.get(code)!;
      if (!lotsMap.has(lot)) {
        lotsMap.set(lot, {
          count: 0,
          weight: 0,
          dateRaw: record.date,
          dateObj: parseDateValue(record.date),
          name: record.name,
        });
      }
      const target = lotsMap.get(lot)!;
      target.count += 1;
      target.weight += w;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeBatches: {
      code: string;
      name: string;
      lot: string;
      rule: ExpirationRule;
      productionDate: Date | null;
      dateFormatted: string;
      expirationDate: Date | null;
      expirationDateFormatted: string;
      daysRemaining: number | null;
      status: 'caducado' | 'proximo' | 'vigente' | 'indefinido';
      count: number;
      weight: number;
    }[] = [];

    productLots.forEach((lotsMap, code) => {
      lotsMap.forEach((lot, lotNum) => {
        const nameLower = lot.name.toLowerCase();
        let matchedRule = expirationRules[3]; // default congelado

        if (nameLower.includes('fresc') || nameLower.includes('chilled')) {
          if (nameLower.includes('vac') || nameLower.includes('vacio')) {
            if (nameLower.includes('hueso') || nameLower.includes('c/h')) {
              matchedRule = expirationRules[1];
            } else {
              matchedRule = expirationRules[2];
            }
          } else {
            matchedRule = expirationRules[0];
          }
        }

        let expirationDate: Date | null = null;
        let expirationDateFormatted = 'Sin Fecha';
        let daysRemaining: number | null = null;
        let status: 'caducado' | 'proximo' | 'vigente' | 'indefinido' = 'indefinido';

        if (lot.dateObj) {
          expirationDate = new Date(lot.dateObj.getTime());
          expirationDate.setDate(expirationDate.getDate() + matchedRule.days);
          expirationDateFormatted = expirationDate.toISOString().split('T')[0];

          const diffMs = expirationDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 0) {
            status = 'caducado';
          } else if (daysRemaining <= 10) {
            status = 'proximo';
          } else {
            status = 'vigente';
          }
        }

        activeBatches.push({
          code,
          name: lot.name,
          lot: lotNum,
          rule: matchedRule,
          productionDate: lot.dateObj,
          dateFormatted: lot.dateObj ? lot.dateObj.toISOString().split('T')[0] : lot.dateRaw || 'S/F',
          expirationDate,
          expirationDateFormatted,
          daysRemaining,
          status,
          count: lot.count,
          weight: lot.weight,
        });
      });
    });

    activeBatches.sort((a, b) => {
      const order = { caducado: 1, proximo: 2, vigente: 3, indefinido: 4 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      if (a.daysRemaining !== null && b.daysRemaining !== null) {
        return a.daysRemaining - b.daysRemaining;
      }
      return 0;
    });

    const totals = {
      caducadosCount: activeBatches.filter((b) => b.status === 'caducado').reduce((a, b) => a + b.count, 0),
      caducadosWeight: activeBatches.filter((b) => b.status === 'caducado').reduce((a, b) => a + b.weight, 0),
      proximosCount: activeBatches.filter((b) => b.status === 'proximo').reduce((a, b) => a + b.count, 0),
      proximosWeight: activeBatches.filter((b) => b.status === 'proximo').reduce((a, b) => a + b.weight, 0),
      vigentesCount: activeBatches.filter((b) => b.status === 'vigente').reduce((a, b) => a + b.count, 0),
      vigentesWeight: activeBatches.filter((b) => b.status === 'vigente').reduce((a, b) => a + b.weight, 0),
      totalCount: activeBatches.reduce((a, b) => a + b.count, 0),
      totalWeight: activeBatches.reduce((a, b) => a + b.weight, 0),
    };

    return {
      activeBatches,
      totals,
    };
  }, [availableSifproRecords, expirationRules]);

  const filteredBatches = useMemo(() => {
    if (!caducidadData) return [];
    let list = caducidadData.activeBatches;

    if (caducidadFilter === 'caducados') {
      list = list.filter((b) => b.status === 'caducado');
    } else if (caducidadFilter === 'proximos') {
      list = list.filter((b) => b.status === 'proximo');
    } else if (caducidadFilter === 'vigentes') {
      list = list.filter((b) => b.status === 'vigente');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.code.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          b.lot.toLowerCase().includes(q) ||
          b.rule.condition.toLowerCase().includes(q) ||
          b.rule.packaging.toLowerCase().includes(q)
      );
    }

    return list;
  }, [caducidadData, caducidadFilter, searchQuery]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Reports Nav */}
      <div className="md:col-span-1 space-y-2">
        <h3 className="text-gray-400 font-bold uppercase text-xs mb-4">Reportes SIFPRO Disponibles</h3>

        <button
          type="button"
          onClick={() => setSelectedReport('antiguedad')}
          className={`w-full text-left px-4 py-3 rounded border flex items-center justify-between transition-all cursor-pointer ${
            selectedReport === 'antiguedad'
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 font-bold'
              : 'bg-[#141414] border-[#2E2E2A] text-gray-300 hover:bg-[#282824]'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <FileText className="w-4 h-4 text-amber-400" />
            Antigüedad de Inventarios
          </span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        <button
          type="button"
          onClick={() => setSelectedReport('caducidad')}
          className={`w-full text-left px-4 py-3 rounded border flex items-center justify-between transition-all cursor-pointer ${
            selectedReport === 'caducidad'
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 font-bold'
              : 'bg-[#141414] border-[#2E2E2A] text-gray-300 hover:bg-[#282824]'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <Calendar className="w-4 h-4 text-amber-400" />
            Reporte de Caducidades SIFPRO
          </span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>
      </div>

      {/* Report View */}
      <div className="md:col-span-3 bg-[#141414] border border-[#2E2E2A] rounded p-6">
        {selectedReport === 'antiguedad' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#2E2E2A] pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-amber-400" />
                Antigüedad de Inventarios — SIFPRO
              </h3>
              <div className="text-xs text-gray-400 bg-[#1A1A18] px-3 py-1 rounded border border-[#2E2E2A]">
                Total stock disponible: {availableSifproRecords.length}
              </div>
            </div>

            {antiguedadData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay datos de inventario SIFPRO para analizar.</div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 mb-6 bg-[#1A1A18] p-2 rounded border border-[#2E2E2A]">
                  {antiguedadData.map((group) => (
                    <button
                      key={group.year}
                      type="button"
                      onClick={() => setSelectedYearTab(group.year)}
                      className={`px-4 py-2 rounded text-sm font-bold transition-all cursor-pointer ${
                        activeYearTab === group.year
                          ? 'bg-amber-500 text-black shadow-sm font-black'
                          : 'bg-[#141414] text-gray-400 border border-[#2E2E2A] hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      {group.year === '2020 y Anteriores' ? group.year : `Año ${group.year}`}
                    </button>
                  ))}
                </div>

                {antiguedadData
                  .filter((group) => group.year === activeYearTab)
                  .map((group, idx) => (
                    <div key={idx} className="border border-[#2E2E2A] rounded bg-[#10100E] overflow-hidden shadow">
                      <div className="bg-[#1A1A18] px-4 py-3 flex items-center justify-between border-b border-[#2E2E2A]">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-sm font-black uppercase tracking-wider ${
                              group.year === '2020 y Anteriores'
                                ? 'bg-red-900/30 text-red-400 border border-red-900/50'
                                : 'bg-blue-900/30 text-blue-400 border border-blue-900/50'
                            }`}
                          >
                            {group.year === '2020 y Anteriores' ? group.year : `Año ${group.year}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-gray-400 font-bold">
                            Cajas: <span className="text-white font-mono">{group.totalCount.toLocaleString()}</span>
                          </span>
                          <span className="text-gray-400 font-bold">
                            Peso:{' '}
                            <span className="text-amber-400 font-mono">
                              {group.totalWeight.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              KG
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#2E2E2A] text-gray-500 text-[10px] uppercase tracking-wider bg-[#141414]">
                              <th className="py-2 px-4 font-black">Código</th>
                              <th className="py-2 px-4 font-black">Producto</th>
                              <th className="py-2 px-4 font-black text-right">Cajas Netas</th>
                              <th className="py-2 px-4 font-black text-right">Peso Neto (KG)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2E2E2A]">
                            {group.products.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-[#1A1A18] transition-colors">
                                <td className="py-2.5 px-4 font-mono text-xs text-amber-300 font-bold">{p.code}</td>
                                <td className="py-2.5 px-4 text-xs text-gray-300 font-bold">{p.name}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-white text-xs">
                                  {p.count.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-emerald-400 text-xs">
                                  {p.weight.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                {/* Gran Total */}
                <div className="bg-[#1A1A18] border-2 border-[#3A3A36] rounded p-4 flex items-center justify-between shadow-xl mt-8">
                  <span className="text-gray-300 font-black uppercase tracking-wider text-sm">
                    Gran Total Inventario Disponible SIFPRO
                  </span>
                  <div className="flex items-center gap-6 text-base">
                    <span className="text-gray-400 font-bold">
                      Cajas:{' '}
                      <span className="text-white font-mono">
                        {antiguedadData.reduce((acc, g) => acc + g.totalCount, 0).toLocaleString()}
                      </span>
                    </span>
                    <span className="text-gray-400 font-bold">
                      Peso:{' '}
                      <span className="text-amber-400 font-mono font-black">
                        {antiguedadData
                          .reduce((acc, g) => acc + g.totalWeight, 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        KG
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* REPORTE DE CADUCIDADES SIFPRO */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2E2E2A] pb-4 gap-2">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Reporte de Caducidades — SIFPRO
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Cálculo automático de vida útil de producto según fecha de producción y empaque en base externa SIFPRO.
                </p>
              </div>
              <div className="text-xs text-amber-400 bg-[#1A1A18] px-3 py-1.5 rounded border border-[#3A3A36] font-mono font-bold shrink-0">
                Total Lotes Analizados: {caducidadData?.activeBatches.length || 0}
              </div>
            </div>

            {/* Tabla de Criterios Ingresados */}
            <div className="bg-[#181816] border border-[#2E2E2A] rounded p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Tabla de Criterios de Vida Útil / Caducidad SIFPRO</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpirationRules(DEFAULT_EXPIRATION_RULES)}
                  className="text-[11px] text-gray-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors bg-[#10100E] px-2.5 py-1 rounded border border-[#2E2E2A]"
                  title="Restablecer valores predeterminados"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablecer Criterios</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2E2E2A] bg-[#121210] text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-3 font-black">Estado / Condición</th>
                      <th className="py-2 px-3 font-black">Presentación / Empaque</th>
                      <th className="py-2 px-3 font-black text-center">Días para considerarlo caducado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E2E2A] bg-[#0E0E0C]">
                    {expirationRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-[#181816] transition-colors">
                        <td className="py-2 px-3 font-bold text-white">{rule.condition}</td>
                        <td className="py-2 px-3 text-gray-300 font-medium">{rule.packaging}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="3650"
                              value={rule.days}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setExpirationRules((prev) =>
                                  prev.map((r) => (r.id === rule.id ? { ...r, days: val } : r))
                                );
                              }}
                              className="w-20 bg-[#141414] border border-[#3A3A36] focus:border-amber-500 text-amber-400 font-mono font-bold text-center py-1 px-2 rounded outline-none"
                            />
                            <span className="text-gray-400 font-mono text-[11px]">días</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen de Métricas */}
            {caducidadData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#1C1414] border border-rose-900/50 p-3.5 rounded shadow">
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      Caducados
                    </span>
                    <span className="font-mono text-rose-300">≤ 0 Días</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black font-mono text-white">
                      {caducidadData.totals.caducadosCount.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-gray-400">cajas</span>
                    </span>
                    <span className="text-sm font-mono font-bold text-rose-400">
                      {caducidadData.totals.caducadosWeight.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      KG
                    </span>
                  </div>
                </div>

                <div className="bg-[#1C1A14] border border-amber-900/50 p-3.5 rounded shadow">
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Próximos a Vencer
                    </span>
                    <span className="font-mono text-amber-300">1 a 10 Días</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black font-mono text-white">
                      {caducidadData.totals.proximosCount.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-gray-400">cajas</span>
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {caducidadData.totals.proximosWeight.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      KG
                    </span>
                  </div>
                </div>

                <div className="bg-[#141C16] border border-emerald-900/50 p-3.5 rounded shadow">
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Vigentes
                    </span>
                    <span className="font-mono text-emerald-300">&gt; 10 Días</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black font-mono text-white">
                      {caducidadData.totals.vigentesCount.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-gray-400">cajas</span>
                    </span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {caducidadData.totals.vigentesWeight.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      KG
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Filtro y Búsqueda */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#181816] p-2.5 rounded border border-[#2E2E2A]">
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCaducidadFilter('todos')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    caducidadFilter === 'todos'
                      ? 'bg-amber-500 text-black font-black'
                      : 'bg-[#121210] text-gray-400 border border-[#2E2E2A] hover:text-white'
                  }`}
                >
                  Todos ({caducidadData?.totals.totalCount.toLocaleString() || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setCaducidadFilter('caducados')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    caducidadFilter === 'caducados'
                      ? 'bg-rose-600 text-white font-black'
                      : 'bg-[#121210] text-rose-400 border border-[#2E2E2A] hover:bg-rose-950/30'
                  }`}
                >
                  🔴 Caducados ({caducidadData?.totals.caducadosCount.toLocaleString() || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setCaducidadFilter('proximos')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    caducidadFilter === 'proximos'
                      ? 'bg-amber-500 text-black font-black'
                      : 'bg-[#121210] text-amber-400 border border-[#2E2E2A] hover:bg-amber-950/30'
                  }`}
                >
                  🟡 Próximos ({caducidadData?.totals.proximosCount.toLocaleString() || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setCaducidadFilter('vigentes')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    caducidadFilter === 'vigentes'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'bg-[#121210] text-emerald-400 border border-[#2E2E2A] hover:bg-emerald-950/30'
                  }`}
                >
                  🟢 Vigentes ({caducidadData?.totals.vigentesCount.toLocaleString() || 0})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por código, producto o lote..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121210] border border-[#3A3A36] focus:border-amber-500 text-xs text-white pl-8 pr-3 py-1.5 rounded outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Tabla de Lotes */}
            {filteredBatches.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-[#10100E] border border-[#2E2E2A] rounded">
                <Clock className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-sm font-bold text-gray-400">No se encontraron lotes con el filtro o búsqueda seleccionada.</p>
              </div>
            ) : (
              <div className="border border-[#2E2E2A] rounded bg-[#10100E] overflow-hidden shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#2E2E2A] text-gray-400 text-[10px] uppercase tracking-wider bg-[#141414]">
                        <th className="py-2.5 px-3 font-black">Código / Producto</th>
                        <th className="py-2.5 px-3 font-black">Lote</th>
                        <th className="py-2.5 px-3 font-black">F. Producción</th>
                        <th className="py-2.5 px-3 font-black">Criterio Aplicado</th>
                        <th className="py-2.5 px-3 font-black text-center">F. Caducidad</th>
                        <th className="py-2.5 px-3 font-black text-center">Días Restantes / Estado</th>
                        <th className="py-2.5 px-3 font-black text-right">Cajas</th>
                        <th className="py-2.5 px-3 font-black text-right">Peso (KG)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2E2E2A]">
                      {filteredBatches.map((batch, idx) => (
                        <tr key={idx} className="hover:bg-[#181816] transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-amber-400 font-bold">{batch.code}</div>
                            <div className="text-gray-300 font-bold text-[11px] truncate max-w-[180px]">{batch.name}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-300 font-bold">{batch.lot}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-400">{batch.dateFormatted}</td>
                          <td className="py-2.5 px-3 text-[11px]">
                            <span className="text-white font-bold block">{batch.rule.condition}</span>
                            <span className="text-gray-400 block text-[10px]">
                              {batch.rule.packaging} ({batch.rule.days}d)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-center font-bold text-gray-200">
                            {batch.expirationDateFormatted}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {batch.daysRemaining === null ? (
                              <span className="text-gray-500 text-[10px]">Sin fecha</span>
                            ) : batch.status === 'caducado' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-rose-950/80 text-rose-300 border border-rose-700/60 font-mono">
                                <XCircle className="w-3 h-3 text-rose-400" />
                                {batch.daysRemaining}d (Caducado)
                              </span>
                            ) : batch.status === 'proximo' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-amber-950/80 text-amber-300 border border-amber-600/60 font-mono">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                {batch.daysRemaining}d restantes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {batch.daysRemaining}d vigentes
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white font-bold">
                            {batch.count.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">
                            {batch.weight.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Gran Total Caducidades */}
            {caducidadData && (
              <div className="bg-[#1A1A18] border-2 border-[#3A3A36] rounded p-4 flex items-center justify-between shadow-xl mt-6">
                <span className="text-gray-300 font-black uppercase tracking-wider text-xs sm:text-sm">
                  Total General en Análisis de Caducidad SIFPRO
                </span>
                <div className="flex items-center gap-6 text-sm sm:text-base">
                  <span className="text-gray-400 font-bold">
                    Cajas: <span className="text-white font-mono">{caducidadData.totals.totalCount.toLocaleString()}</span>
                  </span>
                  <span className="text-gray-400 font-bold">
                    Peso:{' '}
                    <span className="text-amber-400 font-mono font-black">
                      {caducidadData.totals.totalWeight.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      KG
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
