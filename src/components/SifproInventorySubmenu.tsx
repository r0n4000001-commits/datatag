import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  FileText,
  Building2,
  Filter,
  Plus,
  Package,
  Calendar,
  Layers,
  Scale,
  TrendingDown,
  Boxes,
  PieChart,
  ArrowDownRight,
  Sparkles,
  Eraser,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Bookmark,
  Check,
  RotateCcw,
  Scan,
  Barcode,
  Usb,
  Lock,
  Unlock
} from 'lucide-react';
import { SifproInventoryRecord } from '../types';
import { TorreyScaleSerialClient } from '../utils/torreyScale';
import { Phase4MarketDevelopment } from './Phase4MarketDevelopment';
import { Phase5Reports } from './Phase5Reports';
import { isRootUser } from './Header';

export interface SifproInventorySubmenuProps {
  isMarketDevelopmentMode?: boolean;
  onReserveSifproRecords?: (selectedRecords: SifproInventoryRecord[]) => void;
  reservedSifproIds?: string[];
  isMarketReleased?: boolean;
  activeUserRole?: string;
  activeTabProp?: 'physical' | 'reception' | 'sales' | 'returns' | 'available' | 'telemarketing' | 'reportes';
  onTabChange?: (tab: 'physical' | 'reception' | 'sales' | 'returns' | 'available' | 'telemarketing' | 'reportes') => void;
}

// Helper to filter out corrupted binary artifacts or XML font tags from previous bad uploads
const isCleanRecord = (r: SifproInventoryRecord): boolean => {
  if (!r || typeof r !== 'object') return false;
  const code = String(r.code || '').trim();
  const name = String(r.name || '').trim();
  const weight = String(r.weight || '').trim();

  if (!code && !name) return false;

  const combined = (code + ' ' + name + ' ' + weight).toLowerCase();

  // Filter out Excel binary markers, font definitions, XML tags, or ZIP container artifacts
  if (
    combined.includes('calibri') ||
    combined.includes('xml') ||
    combined.includes('theme') ||
    combined.includes('font') ||
    combined.includes('schema') ||
    combined.includes('worksheet') ||
    combined.includes('xmlns') ||
    combined.includes('<?xml') ||
    combined.includes('pk\x03\x04') ||
    /^[^\w\s-]{3,}/.test(code) // starts with multiple weird control symbols
  ) {
    return false;
  }
  return true;
};

// Demo initial items matching user screenshot
const INITIAL_DEMO_SIFPRO: SifproInventoryRecord[] = [
  {
    id: 'sif-001',
    code: '06-106',
    name: 'Top Sirloin TT',
    date: '20260516',
    folio: '5248',
    lot: '10480',
    weight: '24.09',
    readingDate: '20260627',
    warehouseId: '1',
    recordType: 'Físico SIFPRO',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-002',
    code: '06-108',
    name: 'Rib Eye TT Premium',
    date: '20260518',
    folio: '5249',
    lot: '10481',
    weight: '18.50',
    readingDate: '20260627',
    warehouseId: '1',
    recordType: 'Físico SIFPRO',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-003',
    code: '06-110',
    name: 'New York Strip Choice',
    date: '20260520',
    folio: '5250',
    lot: '10482',
    weight: '31.25',
    readingDate: '20260628',
    warehouseId: '1',
    recordType: 'Físico SIFPRO',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-004',
    code: '06-112',
    name: 'Diezmillo Sin Hueso',
    date: '20260521',
    folio: '5251',
    lot: '10483',
    weight: '22.80',
    readingDate: '20260628',
    warehouseId: '2',
    recordType: 'Físico SIFPRO',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-005',
    code: '06-106',
    name: 'Top Sirloin TT',
    date: '20260601',
    folio: '5290',
    lot: '10512',
    weight: '10.00',
    readingDate: '20260629',
    warehouseId: '1',
    recordType: 'Venta Diaria',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-006',
    code: '06-115',
    name: 'Arrachera Marinada T',
    date: '20260522',
    folio: '5252',
    lot: '10484',
    weight: '15.40',
    readingDate: '20260629',
    warehouseId: '1',
    recordType: 'Físico SIFPRO',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-007',
    code: '06-108',
    name: 'Rib Eye TT Premium',
    date: '20260602',
    folio: '5291',
    lot: '10513',
    weight: '$5.50',
    readingDate: '20260630',
    warehouseId: '1',
    recordType: 'Venta Diaria',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-008',
    code: '06-106',
    name: 'Top Sirloin TT',
    date: '20260603',
    folio: '5295',
    lot: '10515',
    weight: '12.30',
    readingDate: '20260701',
    warehouseId: '1',
    recordType: 'Devolución SIFPRO',
    reason: 'Rechazo de cliente - Fuera de horario de entrega',
    uploadedAt: new Date().toISOString(),
  },
  {
    id: 'sif-009',
    code: '06-110',
    name: 'New York Strip Choice',
    date: '20260603',
    folio: '5296',
    lot: '10516',
    weight: '14.80',
    readingDate: '20260701',
    warehouseId: '2',
    recordType: 'Devolución SIFPRO',
    reason: 'Devolución por cambio de pedido de cliente',
    uploadedAt: new Date().toISOString(),
  }
];

export const SifproInventorySubmenu: React.FC<SifproInventorySubmenuProps> = ({
  isMarketDevelopmentMode = false,
  onReserveSifproRecords,
  reservedSifproIds = [],
  isMarketReleased = true,
  activeUserRole = '',
  activeTabProp,
  onTabChange,
}) => {
  const {
    products,
    sifproRecords,
    activeUser,
    addSifproRecords,
    updateSifproRecords,
    deleteSingleSifproRecord,
    deleteSifproRecordsByBatchOrDate,
    deleteAllSifproRecords,
  } = useInventory();

  const isTelemarketingAllowed = Boolean(
    activeUser &&
    (isRootUser(activeUser) || activeUser.role === 'Sistemas' || activeUser.role === 'Telemarketing') &&
    activeUser.role !== 'Desarrollador de Mercado' &&
    activeUser.role !== 'Jefe de Ventas'
  );

  // Scale & Yoreme Barcode Scanner States for Returns (Devoluciones)
  const [returnScaleWeight, setReturnScaleWeight] = useState<number>(0);
  const [isReturnScaleConnected, setIsReturnScaleConnected] = useState<boolean>(false);
  const [returnBarcode, setReturnBarcode] = useState<string>('');
  const [returnScanError, setReturnScanError] = useState<string | null>(null);
  const [lastScannedReturnResult, setLastScannedReturnResult] = useState<{
    productName: string;
    productCode: string;
    folio: string;
    productionDate: string;
    labelWeight: number;
    scaleWeight: number;
    difference: number;
    diffPercentage: number;
    timeStr: string;
    isLiberated: boolean;
    timestamp: string;
  } | null>(null);

  // Connect Torrey Scale Serial COM port
  const handleConnectScaleCOM = async () => {
    try {
      if (typeof window !== 'undefined' && 'serial' in navigator) {
        const client = new TorreyScaleSerialClient();
        client.onReading((r) => {
          if (r && typeof r.weight === 'number') {
            setReturnScaleWeight(r.weight);
            setIsReturnScaleConnected(true);
          }
        });
        client.onError((err) => {
          alert(`Información de Báscula: ${err}`);
        });
        await client.connect();
      } else {
        alert('Web Serial API no está disponible en esta ventana/iframe. Puede ingresar el peso en los controles de pesaje manual o botones de prueba.');
      }
    } catch (e: any) {
      alert(`Error al conectar báscula: ${e?.message || e}`);
    }
  };

  // Process Yoreme 29-digit Barcode
  const handleYoremeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnScaleWeight <= 0) {
      setReturnScanError('⚠️ Coloque primero la caja en la báscula física o establezca un peso mayor a 0.00 KG en la báscula antes de escanear.');
      return;
    }

    const clean = returnBarcode.replace(/[^0-9]/g, '').trim();
    if (clean.length !== 29) {
      setReturnScanError(`⚠️ El código de barras Yoreme debe contener exactamente 29 dígitos (se detectaron ${clean.length} dígitos). Ejemplo: 06012000185020240319111401600`);
      return;
    }

    // Desglose Yoreme:
    // [1] Código de producto: 06012 (5 dígitos)
    // [2] Peso: 0001850 (7 dígitos -> 18.50 kg)
    // [3] Fecha de producción: 20240319 (8 dígitos)
    // [4] Hora de etiquetado: 1114 (4 dígitos)
    // [5] Folio de producto: 01600 (5 dígitos)
    const rawCode = clean.substring(0, 5);
    const rawWeightStr = clean.substring(5, 12);
    const rawDateStr = clean.substring(12, 20);
    const rawTimeStr = clean.substring(20, 24);
    const rawFolioStr = clean.substring(24, 29);

    const formattedCode = `${rawCode.substring(0, 2)}-${rawCode.substring(2)}`;
    const labelWeight = parseFloat(rawWeightStr) / 100;

    let dateFormatted = rawDateStr;
    if (rawDateStr.length === 8) {
      const y = rawDateStr.substring(0, 4);
      const m = rawDateStr.substring(4, 6);
      const d = rawDateStr.substring(6, 8);
      dateFormatted = `${d}/${m}/${y}`;
    }

    let timeFormatted = rawTimeStr;
    if (rawTimeStr.length === 4) {
      timeFormatted = `${rawTimeStr.substring(0, 2)}:${rawTimeStr.substring(2)} hrs`;
    }

    const folio = rawFolioStr;
    const currentScaleWeight = returnScaleWeight;

    const diff = parseFloat((currentScaleWeight - labelWeight).toFixed(2));
    const diffPct = labelWeight > 0 ? parseFloat(((diff / labelWeight) * 100).toFixed(2)) : 0;

    // Matching in Inventory
    const normCodeScanned = formattedCode.replace(/[^0-9]/g, '');
    const normFolioScanned = folio.replace(/^0+/, '');

    // Search reserved item in sifproRecords to liberate it
    const reservedMatch = (sifproRecords || []).find((r) => {
      const normRCode = (r.code || '').replace(/[^0-9]/g, '');
      const normRFolio = (r.folio || '').replace(/^0+/, '');
      return r.isReserved && normRCode === normCodeScanned && (normRFolio === normFolioScanned || r.lot === rawDateStr);
    });

    // Also search existing records or catalog to find product name
    const existingMatch = records.find((r) => {
      const normRCode = (r.code || '').replace(/[^0-9]/g, '');
      return normRCode === normCodeScanned;
    });

    let productName = reservedMatch?.name || existingMatch?.name || '';
    if (!productName) {
      const catProd = (products || []).find((p) => (p.code || '').replace(/[^0-9]/g, '') === normCodeScanned);
      productName = catProd?.name || `PRODUCTO CÓDIGO ${formattedCode}`;
    }

    // Liberate reserved item if found
    let isLiberated = false;
    if (reservedMatch) {
      const liberated: SifproInventoryRecord = {
        ...reservedMatch,
        isReserved: false,
        reservedBy: undefined,
      };
      await updateSifproRecords([liberated]);
      isLiberated = true;
    }

    // Save Return record
    const newReturn: SifproInventoryRecord = {
      id: `dev-scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: formattedCode,
      name: productName,
      date: rawDateStr,
      folio: folio,
      lot: rawDateStr,
      weight: currentScaleWeight, // Peso pesado en báscula
      outWeight: labelWeight, // Peso impreso en etiqueta
      readingDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      warehouseId: '1',
      recordType: 'Devolución SIFPRO',
      uploadedAt: new Date().toISOString(),
      docDate: customReturnsDate || new Date().toISOString().slice(0, 10),
      reason: `Escaneo Báscula Yoreme (${timeFormatted})`,
      isReserved: false, // Liberado a disponible de nuevo
    };

    await addSifproRecords([newReturn]);

    setLastScannedReturnResult({
      productName,
      productCode: formattedCode,
      folio,
      productionDate: dateFormatted,
      labelWeight,
      scaleWeight: currentScaleWeight,
      difference: diff,
      diffPercentage: diffPct,
      timeStr: timeFormatted,
      isLiberated,
      timestamp: new Date().toLocaleTimeString(),
    });

    setReturnScanError(null);
    setReturnBarcode('');
  };

  // Clean records list synced via Firebase Firestore / Context
  const records = useMemo(() => {
    return (sifproRecords || []).filter(isCleanRecord);
  }, [sifproRecords]);

  // Selection state for reserving SIFPRO boxes in Market Development mode
  const [selectedSifproIds, setSelectedSifproIds] = useState<string[]>([]);

  // Active sub-tab inside SIFPRO: physical, reception, sales, returns, available, telemarketing, reportes
  const [internalTab, setInternalTab] = useState<'physical' | 'reception' | 'sales' | 'returns' | 'available' | 'telemarketing' | 'reportes'>(
    activeTabProp || (isMarketDevelopmentMode ? 'available' : 'physical')
  );

  const activeTab = activeTabProp || internalTab;
  const setActiveTab = (t: 'physical' | 'reception' | 'sales' | 'returns' | 'available' | 'telemarketing' | 'reportes') => {
    const safeTab = (t === 'telemarketing' && !isTelemarketingAllowed) ? 'physical' : t;
    setInternalTab(safeTab);
    if (onTabChange) onTabChange(safeTab);
  };

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');

  // Manual entry modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('06-106');
  const [newName, setNewName] = useState('Top Sirloin TT');
  const [newDate, setNewDate] = useState('20260516');
  const [newFolio, setNewFolio] = useState('');
  const [newLot, setNewLot] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newReadingDate, setNewReadingDate] = useState('20260627');
  const [newWarehouseId, setNewWarehouseId] = useState('1');
  const [newReason, setNewReason] = useState('');
  const [newRecordType, setNewRecordType] = useState<'Físico SIFPRO' | 'Recepción Matriz' | 'Venta Diaria' | 'Devolución SIFPRO'>('Físico SIFPRO');

  // Selected date before uploading physical inventory file
  const [customPhysicalDate, setCustomPhysicalDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return today; // e.g. "2026-08-05"
  });

  // Selected date before uploading Recepción Matriz file
  const [customReceptionDate, setCustomReceptionDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return today;
  });

  // Selected date before uploading daily sales (Venta Diaria) file
  const [customSalesDate, setCustomSalesDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return today;
  });

  // Selected date before uploading Devoluciones SIFPRO file
  const [customReturnsDate, setCustomReturnsDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return today;
  });

  // Selected date for batch deletion in physical inventory
  const [selectedDateToDelete, setSelectedDateToDelete] = useState<string>('');

  // Selected date for batch deletion in Recepción Matriz
  const [selectedReceptionDateToDelete, setSelectedReceptionDateToDelete] = useState<string>('');

  // Selected date for batch deletion in Venta Diaria
  const [selectedSalesDateToDelete, setSelectedSalesDateToDelete] = useState<string>('');

  // Selected date for batch deletion in Devoluciones SIFPRO
  const [selectedReturnsDateToDelete, setSelectedReturnsDateToDelete] = useState<string>('');

  // Limit Table 1 to 50 records for informative display
  const [showAllPhysical, setShowAllPhysical] = useState<boolean>(false);

  // Limit Table 2 (Recepción Matriz) to 50 records for informative display
  const [showAllReception, setShowAllReception] = useState<boolean>(false);

  // Limit Table 3 (Venta Diaria) to 50 records for informative display
  const [showAllSales, setShowAllSales] = useState<boolean>(false);

  // Limit Table 4 (Devoluciones SIFPRO) to 50 records for informative display
  const [showAllReturns, setShowAllReturns] = useState<boolean>(false);

  // Array of product codes currently expanded in Tab 3 (Disponible para Venta)
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

  // Toggle single product expansion
  const toggleExpandProduct = (code: string) => {
    setExpandedProducts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Custom confirmation modal state (replaces window.confirm which is blocked in iframe)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmBtnText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Feedback banner
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Legacy fallback save helper
  const saveRecords = async (items: SifproInventoryRecord[]) => {
    await addSifproRecords(items);
  };

  // Helper to parse numeric weight from "$24.09" or "24.09"
  const parseWeightValue = (val: number | string): number => {
    if (typeof val === 'number') return val;
    const clean = val.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to toggle single SIFPRO box record selection
  const toggleSelectSifproRecord = (id: string) => {
    const rec = records.find((r) => r.id === id);
    if (rec && (rec.isReserved || reservedSifproIds.includes(id))) {
      return; // Cannot select reserved items
    }
    setSelectedSifproIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to toggle all boxes of an article
  const toggleSelectAllForProduct = (physicalRecords: SifproInventoryRecord[]) => {
    const availableRecIds = physicalRecords
      .filter((r) => !r.isReserved && !reservedSifproIds.includes(r.id))
      .map((r) => r.id);
    const allSelected = availableRecIds.length > 0 && availableRecIds.every((id) => selectedSifproIds.includes(id));

    if (allSelected) {
      setSelectedSifproIds((prev) => prev.filter((id) => !availableRecIds.includes(id)));
    } else {
      setSelectedSifproIds((prev) => Array.from(new Set([...prev, ...availableRecIds])));
    }
  };

  // Selected SIFPRO box records list & total weight
  const selectedSifproRecordsList = useMemo(() => {
    return records.filter((r) => r.recordType === 'Físico SIFPRO' && selectedSifproIds.includes(r.id));
  }, [records, selectedSifproIds]);

  const selectedSifproTotalWeight = useMemo(() => {
    return selectedSifproRecordsList.reduce((acc, r) => acc + parseWeightValue(r.weight), 0);
  }, [selectedSifproRecordsList]);

  // Handle triggering reservation callback
  const handleTriggerReserveSifpro = () => {
    if (selectedSifproRecordsList.length === 0) return;
    if (onReserveSifproRecords) {
      onReserveSifproRecords(selectedSifproRecordsList);
    }
  };

  // Extract unique physical inventory document loads (batches) with count, total weight, and filename
  const physicalBatchDates = useMemo(() => {
    const physicals = records.filter((r) => r.recordType === 'Físico SIFPRO');
    const map = new Map<string, {
      key: string;
      date: string;
      batchId?: string;
      fileName?: string;
      count: number;
      totalWeight: number;
    }>();

    physicals.forEach((r) => {
      const d = r.docDate || r.date || 'Sin Fecha';
      // Group key prioritizes batchId if available, otherwise document date
      const key = r.batchId || d;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: d,
          batchId: r.batchId,
          fileName: r.fileName,
          count: 0,
          totalWeight: 0,
        });
      }
      const item = map.get(key)!;
      item.count += 1;
      item.totalWeight += parseWeightValue(r.weight);
      if (!item.fileName && r.fileName) {
        item.fileName = r.fileName;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  // Handle deleting the entire document load (all products that compose the uploaded document)
  const handleDeletePhysicalByDate = (targetKey: string) => {
    if (!targetKey) return;

    // Find target document batch
    const targetBatch = physicalBatchDates.find(
      (b) => b.key === targetKey || b.date === targetKey || b.batchId === targetKey
    );
    const normTarget = targetKey.replace(/[^0-9a-zA-Z]/g, '');

    const matching = records.filter((r) => {
      if (r.recordType !== 'Físico SIFPRO') return false;
      if (targetBatch?.batchId && r.batchId) {
        return r.batchId === targetBatch.batchId;
      }
      if (r.batchId && r.batchId === targetKey) {
        return true;
      }
      const d1 = (r.docDate || r.date || '').replace(/[^0-9a-zA-Z]/g, '');
      return d1 === normTarget || r.date === targetKey || r.docDate === targetKey;
    });

    if (matching.length === 0) {
      setUploadMessage({
        text: `No se encontraron registros pertenecientes a la carga del documento "${targetKey}".`,
        type: 'error',
      });
      return;
    }

    const totalKg = matching.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
    const dateLabel = targetBatch?.date || targetKey;
    const fileLabel = targetBatch?.fileName ? ` (Archivo: "${targetBatch.fileName}")` : '';

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminación de Carga de Documento',
      message: `¿Está seguro de eliminar la CARGA COMPLETA del documento cargado para la fecha ${dateLabel}${fileLabel}?\n\nEsta acción eliminará TODOS los ${matching.length} productos/filas que componen este documento (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Borrar Documento Completo',
      onConfirm: async () => {
        await deleteSifproRecordsByBatchOrDate(targetKey, 'Físico SIFPRO');
        setSelectedDateToDelete('');
        setUploadMessage({
          text: `¡Carga de documento eliminada! Se borró completamente el documento cargado para la fecha "${dateLabel}" (${matching.length} productos en total).`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Handle deleting ALL physical inventory records
  const handleDeleteAllPhysical = () => {
    const physicals = records.filter((r) => r.recordType === 'Físico SIFPRO');
    if (physicals.length === 0) {
      setUploadMessage({
        text: 'No existen registros de inventario físico para borrar.',
        type: 'info',
      });
      return;
    }

    const totalKg = physicals.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Vaciamiento de Inventario Físico',
      message: `¿Está seguro de BORRAR ABSOLUTAMENTE TODOS los ${physicals.length} registros del Inventario Físico?\n\nEsta acción eliminará por completo todas las cargas del inventario físico (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Vaciar Todo el Inventario Físico',
      onConfirm: async () => {
        await deleteAllSifproRecords('Físico SIFPRO');
        setSelectedDateToDelete('');
        setUploadMessage({
          text: `¡Inventario físico vaciado con éxito! Se eliminaron los ${physicals.length} registros de inventario físico.`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Extract unique Venta Diaria inventory document loads (batches) with count, total weight, and filename
  const salesBatchDates = useMemo(() => {
    const sales = records.filter((r) => r.recordType === 'Venta Diaria');
    const map = new Map<string, {
      key: string;
      date: string;
      batchId?: string;
      fileName?: string;
      count: number;
      totalWeight: number;
    }>();

    sales.forEach((r) => {
      const d = r.docDate || r.date || 'Sin Fecha';
      const key = r.batchId || d;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: d,
          batchId: r.batchId,
          fileName: r.fileName,
          count: 0,
          totalWeight: 0,
        });
      }
      const item = map.get(key)!;
      item.count += 1;
      item.totalWeight += parseWeightValue(r.weight);
      if (!item.fileName && r.fileName) {
        item.fileName = r.fileName;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  // Extract unique Recepción Matriz document loads (batches)
  const receptionBatchDates = useMemo(() => {
    const receptions = records.filter((r) => r.recordType === 'Recepción Matriz');
    const map = new Map<string, {
      key: string;
      date: string;
      batchId?: string;
      fileName?: string;
      count: number;
      totalWeight: number;
    }>();

    receptions.forEach((r) => {
      const d = r.docDate || r.date || 'Sin Fecha';
      const key = r.batchId || d;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: d,
          batchId: r.batchId,
          fileName: r.fileName,
          count: 0,
          totalWeight: 0,
        });
      }
      const item = map.get(key)!;
      item.count += 1;
      item.totalWeight += parseWeightValue(r.weight);
      if (!item.fileName && r.fileName) {
        item.fileName = r.fileName;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  // Handle deleting the entire Recepción Matriz document load
  const handleDeleteReceptionByDate = (targetKey: string) => {
    if (!targetKey) return;

    const targetBatch = receptionBatchDates.find(
      (b) => b.key === targetKey || b.date === targetKey || b.batchId === targetKey
    );
    const normTarget = targetKey.replace(/[^0-9a-zA-Z]/g, '');

    const matching = records.filter((r) => {
      if (r.recordType !== 'Recepción Matriz') return false;
      if (targetBatch?.batchId && r.batchId) {
        return r.batchId === targetBatch.batchId;
      }
      if (r.batchId && r.batchId === targetKey) {
        return true;
      }
      const d1 = (r.docDate || r.date || '').replace(/[^0-9a-zA-Z]/g, '');
      return d1 === normTarget || r.date === targetKey || r.docDate === targetKey;
    });

    if (matching.length === 0) {
      setUploadMessage({
        text: `No se encontraron registros pertenecientes a la carga de recepción matriz "${targetKey}".`,
        type: 'error',
      });
      return;
    }

    const totalKg = matching.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
    const dateLabel = targetBatch?.date || targetKey;
    const fileLabel = targetBatch?.fileName ? ` (Archivo: "${targetBatch.fileName}")` : '';

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminación de Carga de Recepción Matriz',
      message: `¿Está seguro de eliminar la CARGA COMPLETA del documento de Recepción Matriz cargado para la fecha ${dateLabel}${fileLabel}?\n\nEsta acción eliminará TODOS los ${matching.length} registros que componen este documento (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Borrar Documento de Recepción Completo',
      onConfirm: async () => {
        await deleteSifproRecordsByBatchOrDate(targetKey, 'Recepción Matriz');
        setSelectedReceptionDateToDelete('');
        setUploadMessage({
          text: `¡Carga de Recepción Matriz eliminada! Se borró completamente el documento cargado para la fecha "${dateLabel}" (${matching.length} entradas en total).`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Handle deleting ALL reception records
  const handleDeleteAllReception = () => {
    const receptions = records.filter((r) => r.recordType === 'Recepción Matriz');
    if (receptions.length === 0) {
      setUploadMessage({
        text: 'No existen registros de Recepción Matriz para borrar.',
        type: 'info',
      });
      return;
    }

    const totalKg = receptions.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Vaciamiento de Recepción Matriz',
      message: `¿Está seguro de BORRAR ABSOLUTAMENTE TODOS los ${receptions.length} registros de Recepción Matriz?\n\nEsta acción eliminará por completo todas las cargas de Recepción Matriz (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Vaciar Toda la Recepción Matriz',
      onConfirm: async () => {
        await deleteAllSifproRecords('Recepción Matriz');
        setSelectedReceptionDateToDelete('');
        setUploadMessage({
          text: `¡Registros de Recepción Matriz vaciados con éxito! Se eliminaron los ${receptions.length} registros.`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Handle deleting the entire Venta Diaria document load
  const handleDeleteSalesByDate = (targetKey: string) => {
    if (!targetKey) return;

    const targetBatch = salesBatchDates.find(
      (b) => b.key === targetKey || b.date === targetKey || b.batchId === targetKey
    );
    const normTarget = targetKey.replace(/[^0-9a-zA-Z]/g, '');

    const matching = records.filter((r) => {
      if (r.recordType !== 'Venta Diaria') return false;
      if (targetBatch?.batchId && r.batchId) {
        return r.batchId === targetBatch.batchId;
      }
      if (r.batchId && r.batchId === targetKey) {
        return true;
      }
      const d1 = (r.docDate || r.date || '').replace(/[^0-9a-zA-Z]/g, '');
      return d1 === normTarget || r.date === targetKey || r.docDate === targetKey;
    });

    if (matching.length === 0) {
      setUploadMessage({
        text: `No se encontraron registros pertenecientes a la carga de venta diaria "${targetKey}".`,
        type: 'error',
      });
      return;
    }

    const totalKg = matching.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
    const dateLabel = targetBatch?.date || targetKey;
    const fileLabel = targetBatch?.fileName ? ` (Archivo: "${targetBatch.fileName}")` : '';

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminación de Carga de Venta Diaria',
      message: `¿Está seguro de eliminar la CARGA COMPLETA del documento de venta diaria cargado para la fecha ${dateLabel}${fileLabel}?\n\nEsta acción eliminará TODOS los ${matching.length} registros de venta que componen este documento (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Borrar Documento de Venta Completo',
      onConfirm: async () => {
        await deleteSifproRecordsByBatchOrDate(targetKey, 'Venta Diaria');
        setSelectedSalesDateToDelete('');
        setUploadMessage({
          text: `¡Carga de venta diaria eliminada! Se borró completamente el documento cargado para la fecha "${dateLabel}" (${matching.length} salidas en total).`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Handle deleting ALL sales records
  const handleDeleteAllSales = () => {
    const sales = records.filter((r) => r.recordType === 'Venta Diaria');
    if (sales.length === 0) {
      setUploadMessage({
        text: 'No existen registros de Venta Diaria para borrar.',
        type: 'info',
      });
      return;
    }

    const totalKg = sales.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Vaciamiento de Venta Diaria',
      message: `¿Está seguro de BORRAR ABSOLUTAMENTE TODOS los ${sales.length} registros de Venta Diaria?\n\nEsta acción eliminará por completo todas las cargas de venta diaria (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Vaciar Toda la Venta Diaria',
      onConfirm: async () => {
        await deleteAllSifproRecords('Venta Diaria');
        setSelectedSalesDateToDelete('');
        setUploadMessage({
          text: `¡Registros de Venta Diaria vaciados con éxito! Se eliminaron los ${sales.length} registros de venta diaria.`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Extract unique document batches for Devoluciones SIFPRO
  const returnsBatchDates = useMemo(() => {
    const returns = records.filter((r) => r.recordType === 'Devolución SIFPRO');
    const map = new Map<string, {
      key: string;
      date: string;
      batchId?: string;
      fileName?: string;
      count: number;
      totalWeight: number;
    }>();

    returns.forEach((r) => {
      const d = r.docDate || r.date || 'Sin Fecha';
      const key = r.batchId || d;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: d,
          batchId: r.batchId,
          fileName: r.fileName,
          count: 0,
          totalWeight: 0,
        });
      }
      const item = map.get(key)!;
      item.count += 1;
      item.totalWeight += parseWeightValue(r.weight);
      if (!item.fileName && r.fileName) {
        item.fileName = r.fileName;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  // Handle deleting a returns document batch by date or key
  const handleDeleteReturnsByDate = (targetKey: string) => {
    if (!targetKey) return;

    const targetBatch = returnsBatchDates.find(
      (b) => b.key === targetKey || b.date === targetKey || b.batchId === targetKey
    );
    const normTarget = targetKey.replace(/[^0-9a-zA-Z]/g, '');

    const matching = records.filter((r) => {
      if (r.recordType !== 'Devolución SIFPRO') return false;
      if (targetBatch?.batchId && r.batchId) {
        return r.batchId === targetBatch.batchId;
      }
      if (r.batchId && r.batchId === targetKey) {
        return true;
      }
      const d1 = (r.docDate || r.date || '').replace(/[^0-9a-zA-Z]/g, '');
      return d1 === normTarget || r.date === targetKey || r.docDate === targetKey;
    });

    if (matching.length === 0) {
      setUploadMessage({
        text: `No se encontraron registros pertenecientes a la carga de devoluciones "${targetKey}".`,
        type: 'error',
      });
      return;
    }

    const totalKg = matching.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
    const dateLabel = targetBatch?.date || targetKey;
    const fileLabel = targetBatch?.fileName ? ` (Archivo: "${targetBatch.fileName}")` : '';

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminación de Carga de Devoluciones',
      message: `¿Está seguro de eliminar la CARGA COMPLETA del documento de devoluciones cargado para la fecha ${dateLabel}${fileLabel}?\n\nEsta acción eliminará TODOS los ${matching.length} registros que componen este documento (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Borrar Documento de Devoluciones Completo',
      onConfirm: async () => {
        await deleteSifproRecordsByBatchOrDate(targetKey, 'Devolución SIFPRO');
        setSelectedReturnsDateToDelete('');
        setUploadMessage({
          text: `¡Carga de devoluciones SIFPRO eliminada! Se borró completamente el documento cargado para la fecha "${dateLabel}" (${matching.length} devoluciones en total).`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Handle deleting all returns records
  const handleDeleteAllReturns = () => {
    const returns = records.filter((r) => r.recordType === 'Devolución SIFPRO');
    if (returns.length === 0) {
      setUploadMessage({
        text: 'No existen registros de Devoluciones SIFPRO para borrar.',
        type: 'info',
      });
      return;
    }

    const totalKg = returns.reduce((sum, r) => sum + parseWeightValue(r.weight), 0);

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Vaciamiento de Devoluciones SIFPRO',
      message: `¿Está seguro de BORRAR ABSOLUTAMENTE TODOS los ${returns.length} registros de Devoluciones?\n\nEsta acción eliminará por completo todas las cargas de devoluciones (Peso total: ${totalKg.toFixed(2)} KG).`,
      confirmBtnText: 'Sí, Vaciar Todas las Devoluciones SIFPRO',
      onConfirm: async () => {
        await deleteAllSifproRecords('Devolución SIFPRO');
        setSelectedReturnsDateToDelete('');
        setUploadMessage({
          text: `¡Registros de Devoluciones SIFPRO vaciados con éxito! Se eliminaron los ${returns.length} registros.`,
          type: 'success',
        });
        setConfirmModal(null);
      },
    });
  };

  // Extract unique dates for filtering Venta Diaria
  const uniqueSalesDates = useMemo(() => {
    const sales = records.filter((r) => r.recordType === 'Venta Diaria');
    const dates = Array.from(new Set(sales.map((s) => s.date || s.readingDate))).filter(Boolean);
    return dates.sort().reverse();
  }, [records]);

  // Extract unique dates for filtering Recepción Matriz
  const uniqueReceptionDates = useMemo(() => {
    const receptions = records.filter((r) => r.recordType === 'Recepción Matriz');
    const dates = Array.from(new Set(receptions.map((s) => s.date || s.readingDate))).filter(Boolean);
    return dates.sort().reverse();
  }, [records]);

  // Extract unique dates for filtering Devoluciones SIFPRO
  const uniqueReturnsDates = useMemo(() => {
    const returns = records.filter((r) => r.recordType === 'Devolución SIFPRO');
    const dates = Array.from(new Set(returns.map((s) => s.date || s.readingDate))).filter(Boolean);
    return dates.sort().reverse();
  }, [records]);

  // Physical Inventory Records
  const physicalRecords = useMemo(() => {
    return records.filter((rec) => {
      if (rec.recordType !== 'Físico SIFPRO') return false;
      const matchSearch =
        rec.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.lot.toLowerCase().includes(searchTerm.toLowerCase());
      const matchWh = filterWarehouse === 'all' || rec.warehouseId === filterWarehouse;
      return matchSearch && matchWh;
    });
  }, [records, searchTerm, filterWarehouse]);

  // Recepción Matriz Records
  const receptionRecords = useMemo(() => {
    return records.filter((rec) => {
      if (rec.recordType !== 'Recepción Matriz') return false;
      const matchSearch =
        rec.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.lot.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = selectedDateFilter === 'all' || rec.date === selectedDateFilter || rec.readingDate === selectedDateFilter;
      const matchWh = filterWarehouse === 'all' || rec.warehouseId === filterWarehouse;
      return matchSearch && matchDate && matchWh;
    });
  }, [records, searchTerm, selectedDateFilter, filterWarehouse]);

  // Sales Records
  const salesRecords = useMemo(() => {
    return records.filter((rec) => {
      if (rec.recordType !== 'Venta Diaria') return false;
      const matchSearch =
        rec.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.lot.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = selectedDateFilter === 'all' || rec.date === selectedDateFilter || rec.readingDate === selectedDateFilter;
      const matchWh = filterWarehouse === 'all' || rec.warehouseId === filterWarehouse;
      return matchSearch && matchDate && matchWh;
    });
  }, [records, searchTerm, selectedDateFilter, filterWarehouse]);

  // Devoluciones SIFPRO Records
  const returnsRecords = useMemo(() => {
    return records.filter((rec) => {
      if (rec.recordType !== 'Devolución SIFPRO') return false;
      const matchSearch =
        rec.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.lot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.reason && rec.reason.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDate = selectedDateFilter === 'all' || rec.date === selectedDateFilter || rec.readingDate === selectedDateFilter;
      const matchWh = filterWarehouse === 'all' || rec.warehouseId === filterWarehouse;
      return matchSearch && matchDate && matchWh;
    });
  }, [records, searchTerm, selectedDateFilter, filterWarehouse]);

  // Calculated Net Available Inventory ( (Physical + Reception + Devoluciones) - Sales aggregated by Product Code)
  const availableInventoryGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        name: string;
        physicalCount: number;
        physicalWeight: number;
        receptionCount: number;
        receptionWeight: number;
        salesCount: number;
        salesWeight: number;
        returnsCount: number;
        returnsWeight: number;
        warehouseId: string;
        lastReadingDate: string;
        physicalRecords: SifproInventoryRecord[];
        receptionRecords: SifproInventoryRecord[];
        salesRecords: SifproInventoryRecord[];
        returnsRecords: SifproInventoryRecord[];
      }
    >();

    records.forEach((r) => {
      const key = r.code;
      const weightVal = parseWeightValue(r.weight);
      if (!map.has(key)) {
        map.set(key, {
          code: r.code,
          name: r.name,
          physicalCount: 0,
          physicalWeight: 0,
          receptionCount: 0,
          receptionWeight: 0,
          salesCount: 0,
          salesWeight: 0,
          returnsCount: 0,
          returnsWeight: 0,
          warehouseId: r.warehouseId || '1',
          lastReadingDate: r.readingDate || r.date || '',
          physicalRecords: [],
          receptionRecords: [],
          salesRecords: [],
          returnsRecords: [],
        });
      }

      const item = map.get(key)!;
      if (r.recordType === 'Físico SIFPRO') {
        item.physicalCount += 1;
        item.physicalWeight += weightVal;
        item.physicalRecords.push(r);
      } else if (r.recordType === 'Recepción Matriz') {
        item.receptionCount += 1;
        item.receptionWeight += weightVal;
        item.receptionRecords.push(r);
      } else if (r.recordType === 'Venta Diaria') {
        item.salesCount += 1;
        item.salesWeight += weightVal;
        item.salesRecords.push(r);
      } else if (r.recordType === 'Devolución SIFPRO') {
        item.returnsCount += 1;
        item.returnsWeight += weightVal;
        item.returnsRecords.push(r);
      }
      if (r.readingDate && r.readingDate > item.lastReadingDate) {
        item.lastReadingDate = r.readingDate;
      }
    });

    const result = Array.from(map.values()).map((p) => {
      const totalInflowWeight = p.physicalWeight + p.receptionWeight + p.returnsWeight;
      const totalInflowCount = p.physicalCount + p.receptionCount + p.returnsCount;
      const netWeight = Math.max(0, totalInflowWeight - p.salesWeight);
      const netCount = Math.max(0, totalInflowCount - p.salesCount);
      let status: 'Disponible' | 'Stock Bajo' | 'Agotado' = 'Disponible';

      if (netWeight === 0) {
        status = 'Agotado';
      } else if (netWeight < (totalInflowWeight || 1) * 0.25) {
        status = 'Stock Bajo';
      }

      return {
        ...p,
        totalInflowWeight,
        totalInflowCount,
        netWeight,
        netCount,
        status,
      };
    });

    return result.filter((item) => {
      const matchSearch =
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchWh = filterWarehouse === 'all' || item.warehouseId === filterWarehouse;
      return matchSearch && matchWh;
    });
  }, [records, searchTerm, filterWarehouse]);

  // Overall totals
  const totalPhysicalWeightAll = useMemo(() => {
    return records
      .filter((r) => r.recordType === 'Físico SIFPRO')
      .reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
  }, [records]);

  const totalReceptionWeightAll = useMemo(() => {
    return records
      .filter((r) => r.recordType === 'Recepción Matriz')
      .reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
  }, [records]);

  const totalSalesWeightAll = useMemo(() => {
    return records
      .filter((r) => r.recordType === 'Venta Diaria')
      .reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
  }, [records]);

  const totalReturnsWeightAll = useMemo(() => {
    return records
      .filter((r) => r.recordType === 'Devolución SIFPRO')
      .reduce((sum, r) => sum + parseWeightValue(r.weight), 0);
  }, [records]);

  const totalNetAvailableWeight = Math.max(0, (totalPhysicalWeightAll + totalReceptionWeightAll + totalReturnsWeightAll) - totalSalesWeightAll);

  // Universal Excel & CSV File Processor using SheetJS (xlsx)
  const processFileUpload = (file: File, recordType: 'Físico SIFPRO' | 'Recepción Matriz' | 'Venta Diaria' | 'Devolución SIFPRO') => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          throw new Error('El archivo seleccionado está vacío.');
        }

        // Parse workbook using XLSX library
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo no contiene hojas de trabajo válidas.');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert worksheet to 2D array matrix of raw cells
        const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
          raw: false,
        });

        if (!rawMatrix || rawMatrix.length === 0) {
          throw new Error('La hoja de cálculo está vacía.');
        }

        // Dynamically locate column indices from headers or fallback
        let colCode = -1;
        let colName = -1;
        let colDate = -1;
        let colFolio = -1;
        let colLot = -1;
        let colWeight = -1;
        let colOutWeight = -1;
        let colReadingDate = -1;
        let colWarehouse = -1;
        let startRowIndex = 0;

        // Inspect the first 10 rows for column headers
        for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
          const rowValues = rawMatrix[r].map((cell) => String(cell || '').trim().toLowerCase());
          const containsHeaderKeywords = rowValues.some(
            (v) =>
              v.includes('cod') ||
              v.includes('clave') ||
              v.includes('nom') ||
              v.includes('prod') ||
              v.includes('fol') ||
              v.includes('pes') ||
              v.includes('lot') ||
              v.includes('art') ||
              v.includes('alm')
          );

          if (containsHeaderKeywords) {
            startRowIndex = r + 1;
            rowValues.forEach((val, colIdx) => {
              if ((val.includes('cod') || val.includes('código') || val.includes('codigo') || val.includes('clave') || val.includes('sku') || val.includes('art')) && colCode === -1) colCode = colIdx;
              else if ((val.includes('nom') || val.includes('nombre') || val.includes('desc') || val.includes('prod') || val.includes('concep')) && colName === -1) colName = colIdx;
              else if ((val.includes('fech') || val.includes('fecha') || val.includes('f. emision') || val.includes('f. venta')) && !val.includes('lect') && colDate === -1) colDate = colIdx;
              else if ((val.includes('fol') || val.includes('folio') || val.includes('doc') || val.includes('tick')) && colFolio === -1) colFolio = colIdx;
              else if ((val.includes('lot') || val.includes('lote') || val.includes('batch')) && colLot === -1) colLot = colIdx;
              else if ((val.includes('peso sal') || val.includes('salida') || val.includes('peso env')) && colOutWeight === -1) colOutWeight = colIdx;
              else if ((val.includes('pes') || val.includes('peso') || val.includes('kil') || val.includes('kg') || val.includes('cant')) && !val.includes('sal') && !val.includes('env') && colWeight === -1) colWeight = colIdx;
              else if ((val.includes('lect') || val.includes('f. lect') || val.includes('fecha lect')) && colReadingDate === -1) colReadingDate = colIdx;
              else if ((val.includes('alm') || val.includes('almacén') || val.includes('almacen') || val.includes('bodeg') || val.includes('suc')) && colWarehouse === -1) colWarehouse = colIdx;
            });
            break;
          }
        }

        // Positional fallbacks if headers were not detected
        if (colCode === -1) colCode = 0;
        if (colName === -1) colName = 1;
        if (colDate === -1) colDate = 2;
        if (colFolio === -1) colFolio = 3;
        if (colLot === -1) colLot = 4;
        if (colWeight === -1) colWeight = 5;
        if (colReadingDate === -1) colReadingDate = 6;
        if (colWarehouse === -1) colWarehouse = 7;

        const uploadBatchId = `BATCH-${Date.now()}`;
        const docDateValue = recordType === 'Físico SIFPRO'
          ? (customPhysicalDate || new Date().toISOString().slice(0, 10))
          : recordType === 'Recepción Matriz'
          ? (customReceptionDate || new Date().toISOString().slice(0, 10))
          : recordType === 'Devolución SIFPRO'
          ? (customReturnsDate || new Date().toISOString().slice(0, 10))
          : (customSalesDate || new Date().toISOString().slice(0, 10));

        const parsedRecords: SifproInventoryRecord[] = [];

        for (let i = startRowIndex; i < rawMatrix.length; i++) {
          const row = rawMatrix[i];
          if (!row || row.length === 0) continue;

          // Parse date properly from Excel
          let finalDate = docDateValue;
          if (row[colDate]) {
            if (row[colDate] instanceof Date) {
              const d = row[colDate] as Date;
              if (!isNaN(d.getTime())) {
                finalDate = d.toISOString().slice(0, 10);
              }
            } else if (typeof row[colDate] === 'number') {
              const d = new Date(Math.round((row[colDate] - 25569) * 864e5));
              if (!isNaN(d.getTime())) {
                finalDate = d.toISOString().slice(0, 10);
              }
            } else {
              finalDate = String(row[colDate]).trim() || docDateValue;
            }
          }

          const rawCode = String(row[colCode] || '').trim();
          const rawName = String(row[colName] || '').trim();
          const rawDate = String(row[colDate] || '').trim();
          const rawFolio = String(row[colFolio] || '').trim();
          const rawLot = String(row[colLot] || '').trim();
          const rawWeight = String(row[colWeight] || '').trim();
          const rawOutWeight = colOutWeight !== -1 ? String(row[colOutWeight] || '').trim() : '';
          const rawReadingDate = String(row[colReadingDate] || '').trim();
          const rawWarehouse = String(row[colWarehouse] || '1').trim();

          // Skip completely empty rows
          if (!rawCode && !rawName && !rawFolio && !rawWeight) continue;

          // Clean non-printable characters or binary artifacts
          const cleanCode = rawCode.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          const cleanName = rawName.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

          // Filter out binary sheet definitions or font rows
          if (
            cleanCode.toLowerCase().includes('calibri') ||
            cleanName.toLowerCase().includes('calibri') ||
            cleanCode.toLowerCase().includes('xml') ||
            cleanName.toLowerCase().includes('xml') ||
            /^[^\w\s-]{3,}/.test(cleanCode)
          ) {
            continue;
          }

          // Format weight cleanly (e.g. 24.09 without $)
          let formattedWeight = rawWeight.replace('$', '').trim();
          const numericWeight = parseFloat(rawWeight.replace(/[^0-9.]/g, ''));
          if (!isNaN(numericWeight) && numericWeight >= 0) {
            formattedWeight = numericWeight.toFixed(2);
          } else if (!formattedWeight) {
            formattedWeight = '0.00';
          }
          
          let formattedOutWeight: string | undefined = undefined;
          if (rawOutWeight) {
            formattedOutWeight = rawOutWeight.replace('$', '').trim();
            const numOut = parseFloat(rawOutWeight.replace(/[^0-9.]/g, ''));
            if (!isNaN(numOut) && numOut >= 0) {
              formattedOutWeight = numOut.toFixed(2);
            }
          }

          parsedRecords.push({
            id: `sif-${recordType === 'Físico SIFPRO' ? 'up' : recordType === 'Devolución SIFPRO' ? 'ret' : 'sale'}-${Date.now()}-${i}`,
            code: cleanCode || '06-106',
            name: cleanName || (recordType === 'Físico SIFPRO' ? 'Producto SIFPRO' : recordType === 'Devolución SIFPRO' ? 'Devolución SIFPRO' : 'Venta SIFPRO'),
            date: finalDate,
            docDate: docDateValue,
            fileName: file.name,
            batchId: uploadBatchId,
            folio: rawFolio || `${5000 + i}`,
            lot: rawLot || `${10000 + i}`,
            weight: formattedWeight,
            outWeight: formattedOutWeight,
            readingDate: rawReadingDate || docDateValue,
            warehouseId: rawWarehouse || '1',
            recordType,
            reason: recordType === 'Devolución SIFPRO' ? 'Rechazo / Devolución de cliente' : undefined,
            uploadedAt: new Date().toISOString(),
          });
        }

        if (parsedRecords.length > 0) {
          setUploadMessage({
            text: `Sincronizando ${parsedRecords.length} registros en Firebase Firestore... Por favor espere.`,
            type: 'info',
          });
          await addSifproRecords(parsedRecords);
          setUploadMessage({
            text: `¡Éxito! Se procesó e importó correctamente "${file.name}" guardando y sincronizando ${parsedRecords.length} filas de ${recordType} en Firebase (Disponible en todas las estaciones de trabajo).`,
            type: 'success',
          });
        } else {
          setUploadMessage({
            text: `No se pudieron extraer filas de datos válidas de "${file.name}". Verifique la estructura del archivo.`,
            type: 'error',
          });
        }
      } catch (err: any) {
        setUploadMessage({
          text: `Error al procesar el archivo Excel/CSV: ${err?.message || 'Formato desconocido.'}`,
          type: 'error',
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handlePhysicalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file, 'Físico SIFPRO');
    }
    e.target.value = '';
  };

  const handleReceptionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file, 'Recepción Matriz');
    }
    e.target.value = '';
  };

  const handleSalesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file, 'Venta Diaria');
    }
    e.target.value = '';
  };

  const handleReturnsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file, 'Devolución SIFPRO');
    }
    e.target.value = '';
  };

  const handleCleanDistorted = async () => {
    const cleaned = records.filter(isCleanRecord);
    const removedCount = records.length - cleaned.length;
    if (removedCount > 0) {
      await deleteAllSifproRecords();
      await addSifproRecords(cleaned);
    }
    setUploadMessage({
      text: removedCount > 0
        ? `Se limpiaron ${removedCount} registros distorsionados/corruptos de Firebase.`
        : 'No se encontraron registros distorsionados en la lista.',
      type: 'info',
    });
  };

  const handleReloadDemo = async () => {
    await deleteAllSifproRecords();
    await addSifproRecords(INITIAL_DEMO_SIFPRO);
    setUploadMessage({
      text: 'Se han recargado los datos de demostración SIFPRO limpios en Firebase.',
      type: 'info',
    });
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteSingleSifproRecord(id);
  };

  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Limpieza Total SIFPRO',
      message: '¿Está seguro de limpiar absolutamente todos los registros de SIFPRO (Inventario Físico, Recepciones Matriz, Ventas Diarias y Devoluciones) de Firebase?',
      confirmBtnText: 'Sí, Limpiar Todo',
      onConfirm: async () => {
        await deleteAllSifproRecords();
        setSelectedDateToDelete('');
        setSelectedReceptionDateToDelete('');
        setSelectedSalesDateToDelete('');
        setSelectedReturnsDateToDelete('');
        setUploadMessage({ text: 'Se borraron todos los registros SIFPRO de la nube (Firebase).', type: 'info' });
        setConfirmModal(null);
      },
    });
  };

  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: SifproInventoryRecord = {
      id: `sif-manual-${Date.now()}`,
      code: newCode.trim() || '06-106',
      name: newName.trim() || 'Top Sirloin TT',
      date: newDate.trim() || '20260516',
      folio: newFolio.trim() || `${Math.floor(5000 + Math.random() * 1000)}`,
      lot: newLot.trim() || `${Math.floor(10000 + Math.random() * 1000)}`,
      weight: newWeight.trim() ? newWeight.replace('$', '').trim() : '24.09',
      readingDate: newReadingDate.trim() || '20260627',
      warehouseId: newWarehouseId || '1',
      recordType: newRecordType,
      reason: newReason.trim() || (newRecordType === 'Devolución SIFPRO' ? 'Rechazo / Devolución de cliente' : undefined),
      uploadedAt: new Date().toISOString(),
    };

    await addSifproRecords([item]);
    setIsManualModalOpen(false);
    setNewFolio('');
    setNewLot('');
    setNewWeight('');
    setNewReason('');
    setUploadMessage({ text: 'Nuevo registro añadido y sincronizado en Firebase.', type: 'success' });
  };

  const handleExportCSV = () => {
    let csvData: string[][] = [];
    let filename = 'SIFPRO_Export.csv';

    if (activeTab === 'physical') {
      filename = `Inventario_Fisico_SIFPRO_${new Date().toISOString().slice(0, 10)}.csv`;
      csvData.push(['Código', 'Nombre', 'Fecha', 'Folio', 'Lote', 'Peso', 'Fecha Lectura', 'Almacén']);
      physicalRecords.forEach((r) => {
        csvData.push([
          r.code,
          `"${r.name}"`,
          r.date,
          r.folio,
          r.lot,
          typeof r.weight === 'number' ? r.weight.toFixed(2) : String(r.weight).replace('$', ''),
          r.readingDate,
          r.warehouseId,
        ]);
      });
    } else if (activeTab === 'reception') {
      filename = `Recepcion_Matriz_SIFPRO_${new Date().toISOString().slice(0, 10)}.csv`;
      csvData.push(['Código', 'Nombre', 'Fecha Recepción', 'Folio', 'Lote', 'Peso Ingresado', 'Fecha Lectura', 'Almacén']);
      receptionRecords.forEach((r) => {
        csvData.push([
          r.code,
          `"${r.name}"`,
          r.date,
          r.folio,
          r.lot,
          typeof r.weight === 'number' ? r.weight.toFixed(2) : String(r.weight).replace('$', ''),
          r.readingDate,
          r.warehouseId,
        ]);
      });
    } else if (activeTab === 'sales') {
      filename = `Venta_Diaria_SIFPRO_${new Date().toISOString().slice(0, 10)}.csv`;
      csvData.push(['Código', 'Nombre', 'Fecha Venta', 'Folio', 'Lote', 'Peso Vendido', 'Fecha Lectura', 'Almacén']);
      salesRecords.forEach((r) => {
        csvData.push([
          r.code,
          `"${r.name}"`,
          r.date,
          r.folio,
          r.lot,
          typeof r.weight === 'number' ? r.weight.toFixed(2) : String(r.weight).replace('$', ''),
          r.readingDate,
          r.warehouseId,
        ]);
      });
    } else if (activeTab === 'returns') {
      filename = `Devoluciones_SIFPRO_${new Date().toISOString().slice(0, 10)}.csv`;
      csvData.push(['Código', 'Nombre', 'Fecha Devolución', 'Folio', 'Lote', 'Peso Devuelto', 'Fecha Lectura', 'Almacén', 'Motivo / Cliente']);
      returnsRecords.forEach((r) => {
        csvData.push([
          r.code,
          `"${r.name}"`,
          r.date,
          r.folio,
          r.lot,
          typeof r.weight === 'number' ? r.weight.toFixed(2) : String(r.weight).replace('$', ''),
          r.readingDate,
          r.warehouseId,
          `"${r.reason || 'Rechazo de cliente'}"`,
        ]);
      });
    } else {
      filename = `Disponible_Para_Venta_SIFPRO_${new Date().toISOString().slice(0, 10)}.csv`;
      csvData.push(['Código', 'Nombre', 'Peso Físico Total', 'Peso Recepción Matriz', 'Peso Devoluciones', 'Peso Vendido Total', 'Peso Disponible Neto', 'Estatus']);
      availableInventoryGrouped.forEach((r) => {
        csvData.push([
          r.code,
          `"${r.name}"`,
          r.physicalWeight.toFixed(2),
          r.receptionWeight.toFixed(2),
          r.returnsWeight.toFixed(2),
          r.salesWeight.toFixed(2),
          r.netWeight.toFixed(2),
          r.status,
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvData.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* SIFPRO Main Header & Sub-Tab Navigation Bar */}
      <div className="bg-[#141414] text-white p-4 border-2 border-amber-400/80 rounded-xs shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#2C2C28] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 text-[#141414] flex items-center justify-center font-black rounded shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-base uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <span>{isMarketDevelopmentMode ? 'INVENTARIO SIFPRO DISPONIBLE PARA VENTA' : 'GESTIÓN DE INVENTARIOS SIFPRO'}</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-400/40 font-mono">
                  {isMarketDevelopmentMode ? 'DESARROLLO DE MERCADO' : 'SISTEMA EXTERNO'}
                </span>
              </h2>
              <p className="text-xs text-[#A0A09C]">
                {isMarketDevelopmentMode
                  ? 'Catálogo de cajas y articulos SIFPRO listos para selección y apartado de productos'
                  : 'Sincronización de Inventario Físico, Registros de Venta Diaria y Cálculo de Disponible en Existencia'}
              </p>
            </div>
          </div>

          {!isMarketDevelopmentMode && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCleanDistorted}
                className="px-3 py-1.5 bg-[#282824] hover:bg-amber-900/40 text-amber-300 border border-amber-400/30 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Limpiar filas corruptas o distorsionadas"
              >
                <Eraser className="w-3.5 h-3.5 text-amber-400" />
                <span>Limpiar Distorsionados</span>
              </button>

              <button
                type="button"
                onClick={handleReloadDemo}
                className="px-3 py-1.5 bg-[#282824] hover:bg-[#383834] text-amber-300 border border-amber-400/40 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Restablecer datos de prueba"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Datos Demo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#141414] text-xs font-black uppercase rounded flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Registro</span>
              </button>
            </div>
          )}
        </div>

        {/* 7 Main SIFPRO Sub-Menu Tabs (Hidden in Market Development Mode) */}
        {!isMarketDevelopmentMode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 font-mono">
            {/* Tab 1: Datos de Inventario Físico */}
            <button
              type="button"
              onClick={() => setActiveTab('physical')}
              className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'physical'
                  ? 'bg-amber-400 text-[#141414] border-amber-500 font-black shadow-md scale-[1.01]'
                  : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                  activeTab === 'physical' ? 'bg-[#141414] text-amber-300' : 'bg-[#282824] text-amber-400'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">1. Físico</div>
                <div className={`text-[9px] mt-0.5 ${activeTab === 'physical' ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                  {records.filter((r) => r.recordType === 'Físico SIFPRO').length} registros
                </div>
              </div>
            </button>

            {/* Tab 2: Recepción Matriz */}
            <button
              type="button"
              onClick={() => setActiveTab('reception')}
              className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'reception'
                  ? 'bg-cyan-500 text-white border-cyan-600 font-black shadow-md scale-[1.01]'
                  : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                  activeTab === 'reception' ? 'bg-[#141414] text-cyan-300' : 'bg-[#282824] text-cyan-400'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">2. Recepciones</div>
                <div className={`text-[9px] mt-0.5 ${activeTab === 'reception' ? 'text-white/80 font-bold' : 'text-gray-400'}`}>
                  {records.filter((r) => r.recordType === 'Recepción Matriz').length} entradas
                </div>
              </div>
            </button>

            {/* Tab 3: Venta Diaria */}
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-purple-500 text-white border-purple-600 font-black shadow-md scale-[1.01]'
                  : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                  activeTab === 'sales' ? 'bg-[#141414] text-purple-300' : 'bg-[#282824] text-purple-400'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">3. Ventas</div>
                <div className={`text-[9px] mt-0.5 ${activeTab === 'sales' ? 'text-white/80 font-bold' : 'text-gray-400'}`}>
                  {records.filter((r) => r.recordType === 'Venta Diaria').length} salidas
                </div>
              </div>
            </button>

            {/* Tab 4: Devoluciones SIFPRO */}
            <button
              type="button"
              onClick={() => setActiveTab('returns')}
              className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-orange-500 text-white border-orange-600 font-black shadow-md scale-[1.01]'
                  : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                  activeTab === 'returns' ? 'bg-[#141414] text-orange-300' : 'bg-[#282824] text-orange-400'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">4. Devoluciones</div>
                <div className={`text-[9px] mt-0.5 ${activeTab === 'returns' ? 'text-white/80 font-bold' : 'text-gray-400'}`}>
                  {records.filter((r) => r.recordType === 'Devolución SIFPRO').length} retornos
                </div>
              </div>
            </button>

            {/* Tab 5: Disponible para Venta */}
            <button
              type="button"
              onClick={() => setActiveTab('available')}
              className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-emerald-500 text-white border-emerald-600 font-black shadow-md scale-[1.01]'
                  : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                  activeTab === 'available' ? 'bg-[#141414] text-emerald-300' : 'bg-[#282824] text-emerald-400'
                }`}
              >
                <Boxes className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">5. Disponible</div>
                <div className={`text-[9px] mt-0.5 ${activeTab === 'available' ? 'text-white/80 font-bold' : 'text-gray-400'}`}>
                  {totalNetAvailableWeight.toFixed(1)} KG
                </div>
              </div>
            </button>

            {/* Tab 6: Telemarketing SIFPRO */}
            {isTelemarketingAllowed && (
              <button
                type="button"
                onClick={() => setActiveTab('telemarketing')}
                className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'telemarketing'
                    ? 'bg-indigo-500 text-white border-indigo-600 font-black shadow-md scale-[1.01]'
                    : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                    activeTab === 'telemarketing' ? 'bg-[#141414] text-indigo-300' : 'bg-[#282824] text-indigo-400'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">6. Telemarketing</div>
                  <div className={`text-[9px] mt-0.5 ${activeTab === 'telemarketing' ? 'text-white/80 font-bold' : 'text-gray-400'}`}>
                    Apartados SIFPRO
                  </div>
                </div>
              </button>
            )}

            {/* Tab 7: Reportes SIFPRO */}
            <button
              type="button"
              onClick={() => setActiveTab('reportes')}
              className={`p-2.5 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'reportes'
                  ? 'bg-teal-500 text-white border-teal-600 font-black shadow-md scale-[1.01]'
                  : 'bg-[#1D1D1B] hover:bg-[#282824] text-gray-300 border-[#3A3A36]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center font-bold shrink-0 ${
                  activeTab === 'reportes' ? 'bg-[#141414] text-teal-300' : 'bg-[#282824] text-teal-400'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[11px] uppercase font-extrabold tracking-wider truncate">7. Reportes</div>
                <div className={`text-[9px] mt-0.5 ${activeTab === 'reportes' ? 'text-white/80 font-bold' : 'text-gray-400'}`}>
                  Caducidades & FIFO
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Upload Alert Feedback */}
        {uploadMessage && (
          <div
            className={`p-2.5 rounded text-xs font-bold flex items-center justify-between border ${
              uploadMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600'
                : uploadMessage.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-600'
                : 'bg-blue-950/90 text-blue-200 border-blue-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{uploadMessage.text}</span>
            </div>
            <button
              onClick={() => setUploadMessage(null)}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="bg-[#141414] p-3 border border-[#3A3A36] text-white rounded-xs">
          <span className="text-[10px] text-[#A0A09C] uppercase block font-bold">1. Total Físico</span>
          <div className="text-lg font-black text-amber-400 mt-1 flex items-center justify-between">
            <span>{totalPhysicalWeightAll.toFixed(2)} KG</span>
            <Scale className="w-4 h-4 text-amber-400/60" />
          </div>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {records.filter((r) => r.recordType === 'Físico SIFPRO').length} folios en sistema
          </span>
        </div>

        <div className="bg-[#141414] p-3 border border-[#3A3A36] text-white rounded-xs">
          <span className="text-[10px] text-[#A0A09C] uppercase block font-bold">2. Recepción Matriz</span>
          <div className="text-lg font-black text-cyan-400 mt-1 flex items-center justify-between">
            <span>{totalReceptionWeightAll.toFixed(2)} KG</span>
            <Building2 className="w-4 h-4 text-cyan-400/60" />
          </div>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {records.filter((r) => r.recordType === 'Recepción Matriz').length} entradas Matriz
          </span>
        </div>

        <div className="bg-[#141414] p-3 border border-[#3A3A36] text-white rounded-xs">
          <span className="text-[10px] text-[#A0A09C] uppercase block font-bold">3. Total Salidas</span>
          <div className="text-lg font-black text-purple-400 mt-1 flex items-center justify-between">
            <span>{totalSalesWeightAll.toFixed(2)} KG</span>
            <TrendingDown className="w-4 h-4 text-purple-400/60" />
          </div>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {records.filter((r) => r.recordType === 'Venta Diaria').length} registros de venta
          </span>
        </div>

        <div className="bg-[#141414] p-3 border border-[#3A3A36] text-white rounded-xs">
          <span className="text-[10px] text-[#A0A09C] uppercase block font-bold">4. Devoluciones</span>
          <div className="text-lg font-black text-orange-400 mt-1 flex items-center justify-between">
            <span>{totalReturnsWeightAll.toFixed(2)} KG</span>
            <RotateCcw className="w-4 h-4 text-orange-400/60" />
          </div>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {records.filter((r) => r.recordType === 'Devolución SIFPRO').length} devoluciones
          </span>
        </div>

        <div className="bg-[#141414] p-3 border border-[#3A3A36] text-white rounded-xs">
          <span className="text-[10px] text-[#A0A09C] uppercase block font-bold">5. Disponible para Venta</span>
          <div className="text-lg font-black text-emerald-400 mt-1 flex items-center justify-between">
            <span>{totalNetAvailableWeight.toFixed(2)} KG</span>
            <Boxes className="w-4 h-4 text-emerald-400/60" />
          </div>
          <span className="text-[10px] text-emerald-300 block mt-0.5">
            Inventario Neto en Existencia
          </span>
        </div>

        <div className="bg-[#141414] p-3 border border-[#3A3A36] text-white rounded-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] text-[#A0A09C] uppercase block font-bold">Acciones Rápidas</span>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] rounded flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
            <button
              onClick={handleClearAll}
              className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-[11px] rounded flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-[#F8F7F4] p-3 border border-[#141414] flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por Código, Nombre, Folio o Lote SIFPRO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#141414] focus:outline-none font-bold"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {activeTab === 'reception' && (
            <div className="flex items-center gap-1 bg-white p-1 border border-[#141414]">
              <span className="text-[10px] font-bold text-gray-600 px-1 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-600" />
                Fecha Recepción:
              </span>
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-transparent font-bold text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las Fechas</option>
                {uniqueReceptionDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="flex items-center gap-1 bg-white p-1 border border-[#141414]">
              <span className="text-[10px] font-bold text-gray-600 px-1 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-600" />
                Fecha Venta:
              </span>
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-transparent font-bold text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las Fechas</option>
                {uniqueSalesDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 bg-white p-1 border border-[#141414]">
            <span className="text-[10px] font-bold text-gray-600 px-1 uppercase">Almacén:</span>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="bg-transparent font-bold text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Almacenes</option>
              <option value="1">Almacén 1</option>
              <option value="2">Almacén 2</option>
              <option value="3">Almacén 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: DATOS DE INVENTARIO FÍSICO */}
      {activeTab === 'physical' && (
        <div className="space-y-4">
          {/* File Upload & Date Selection Banner for Physical Inventory */}
          <div className="bg-[#1D1D1B] p-4 border border-[#3A3A36] rounded text-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Cargar Archivo de Inventario Físico SIFPRO</span>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-mono">
                Sincronización SIFPRO
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Especifique la fecha del inventario físico antes de subir el archivo Excel/CSV. Todos los registros importados se asociarán a la fecha seleccionada.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-[#10100E] p-3 rounded border border-[#3A3A36]">
              <div>
                <label className="block text-[11px] font-extrabold text-amber-300 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fecha de Inventario Físico:</span>
                </label>
                <input
                  type="date"
                  value={customPhysicalDate}
                  onChange={(e) => setCustomPhysicalDate(e.target.value)}
                  className="w-full bg-[#181816] text-amber-300 border border-amber-400/60 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-400 rounded cursor-pointer"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-amber-300 uppercase mb-1">
                  <span>Seleccionar Archivo (Excel / CSV / TXT):</span>
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-amber-400/10 hover:bg-amber-400/20 border border-dashed border-amber-400 text-amber-300 hover:text-amber-200 text-xs font-bold rounded cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Subir Archivo Físico SIFPRO ({customPhysicalDate || 'Sin Fecha'})</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handlePhysicalFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Control Panel: Consult and Delete Load by Date */}
          <div className="bg-[#181816] p-3.5 border border-red-500/30 rounded text-white space-y-2 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-red-400">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Borrar Carga de Inventario Físico</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  Consulte las cargas registradas o borre el inventario completo
                </span>
                <button
                  type="button"
                  onClick={handleDeleteAllPhysical}
                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-red-100 text-[11px] font-extrabold rounded flex items-center gap-1 cursor-pointer transition-colors"
                  title="Eliminar absolutamente todos los registros del inventario físico"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Borrar Todo el Inventario Físico</span>
                </button>
              </div>
            </div>

            {physicalBatchDates.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                No hay cargas de inventario físico registradas por fecha.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-300">Consultar y Borrar Carga:</span>
                  <select
                    value={selectedDateToDelete}
                    onChange={(e) => setSelectedDateToDelete(e.target.value)}
                    className="bg-[#10100E] text-amber-300 border border-red-500/50 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none rounded cursor-pointer min-w-[280px]"
                  >
                    <option value="">-- Seleccionar Carga / Fecha a Borrar --</option>
                    {physicalBatchDates.map((b) => (
                      <option key={b.key} value={b.key}>
                        Documento: {b.date} {b.fileName ? `[${b.fileName}]` : ''} ({b.count} productos - {b.totalWeight.toFixed(2)} KG)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedDateToDelete}
                    onClick={() => handleDeletePhysicalByDate(selectedDateToDelete)}
                    className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-200" />
                    <span>Borrar Carga Completa del Documento</span>
                  </button>
                </div>

                {/* List of Batch Badges with Direct Delete Icon */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-gray-400 font-bold self-center">Documentos Cargados:</span>
                  {physicalBatchDates.map((b) => (
                    <div
                      key={b.key}
                      className="bg-[#10100E] border border-[#3A3A36] hover:border-red-500/60 px-2.5 py-1 rounded text-[11px] flex items-center gap-2 text-gray-200"
                    >
                      <span className="font-bold text-amber-300">{b.date}</span>
                      {b.fileName && <span className="text-gray-400 font-sans italic text-[10px]">({b.fileName})</span>}
                      <span className="text-gray-400 font-bold">({b.count} productos | {b.totalWeight.toFixed(2)} KG)</span>
                      <button
                        type="button"
                        onClick={() => handleDeletePhysicalByDate(b.key)}
                        className="p-1 hover:bg-red-950 text-red-400 hover:text-red-200 rounded cursor-pointer transition-colors"
                        title={`Eliminar toda la carga del documento del ${b.date}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Physical Inventory Data Table matching screenshot */}
          <div className="bg-[#141414] border-2 border-[#3A3A36] rounded-xs overflow-hidden shadow-lg font-mono">
            <div className="bg-[#1D1D1B] px-4 py-2.5 border-b border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>TABLA 1: REGISTROS DE INVENTARIO FÍSICO SIFPRO</span>
              </span>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>
                  Total Ingresado: <strong className="text-amber-400">{totalPhysicalWeightAll.toFixed(2)} KG</strong> ({physicalRecords.length} productos en total)
                </span>
              </div>
            </div>

            {/* Informative Notice Banner for 50-record limit */}
            {physicalRecords.length > 0 && (
              <div className="bg-[#10100E] px-4 py-2 border-b border-[#2C2C28] flex flex-wrap items-center justify-between gap-2 text-xs text-amber-300/90">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Muestra Informativa
                  </span>
                  <span className="text-gray-300 text-[11px]">
                    Mostrando los primeros <strong>{showAllPhysical ? physicalRecords.length : Math.min(50, physicalRecords.length)}</strong> de <strong>{physicalRecords.length}</strong> registros cargados.
                  </span>
                </div>

                {physicalRecords.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPhysical(!showAllPhysical)}
                    className="px-2.5 py-1 bg-[#22221E] hover:bg-[#33332D] border border-amber-500/40 text-amber-200 text-[11px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                  >
                    {showAllPhysical ? 'Ver solo primeros 50' : `Ver los ${physicalRecords.length} registros completos`}
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
                      <div className="flex items-center justify-between"><span>Código</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">
                      <div className="flex items-center justify-between"><span>Nombre</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">
                      <div className="flex items-center justify-between"><span>Fecha de Producción</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
                      <div className="flex items-center justify-between"><span>Folio</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
                      <div className="flex items-center justify-between"><span>Lote</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">
                      <div className="flex items-center justify-between"><span>Peso Físico</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">
                      <div className="flex items-center justify-between"><span>Fecha Lectura</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">
                      <div className="flex items-center justify-center gap-1"><span>Almacén</span><Filter className="w-3 h-3 text-gray-400" /></div>
                    </th>
                    <th className="p-2.5 text-center min-w-[70px]">
                      <span>Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {physicalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay registros en el Inventario Físico SIFPRO. Seleccione un archivo para cargar.
                      </td>
                    </tr>
                  ) : (
                    (showAllPhysical ? physicalRecords : physicalRecords.slice(0, 50)).map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#282824] transition-colors text-xs ${
                          idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]'
                        }`}
                      >
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-amber-300">{r.code}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">{r.name}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.date}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">{r.folio}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.lot}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-emerald-300">
                          {typeof r.weight === 'number' ? `${r.weight.toFixed(2)} KG` : `${String(r.weight).replace('$', '')} KG`}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.readingDate}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">{r.warehouseId}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: RECEPCIÓN MATRIZ */}
      {activeTab === 'reception' && (
        <div className="space-y-4">
          {/* File Upload Banner for Reception */}
          <div className="bg-[#1D1D1B] p-4 border border-[#3A3A36] rounded text-white space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-300">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Cargar Archivo Excel de Recepción Matriz</span>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded font-mono">
                Recepción SIFPRO
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Seleccione la fecha deseada para la carga y adjunte el archivo Excel o CSV con las entradas (Recepción Matriz).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-extrabold text-cyan-300 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fecha Recepción / Documento:</span>
                </label>
                <input
                  type="date"
                  value={customReceptionDate}
                  onChange={(e) => setCustomReceptionDate(e.target.value)}
                  className="w-full bg-[#181816] text-cyan-300 border border-cyan-400/60 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 rounded cursor-pointer"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-cyan-300 uppercase mb-1">
                  <span>Seleccionar Archivo (Excel / CSV / TXT):</span>
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-cyan-400/10 hover:bg-cyan-400/20 border border-dashed border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-bold rounded cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Subir Archivo Recepción ({customReceptionDate || 'Sin Fecha'})</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleReceptionFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Control Panel: Consult and Delete Reception Load by Date */}
          <div className="bg-[#181816] p-3.5 border border-red-500/30 rounded text-white space-y-2 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-red-400">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Borrar Carga de Recepción Matriz</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAllReception}
                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-red-100 text-[11px] font-extrabold rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Borrar Todo de Recepción</span>
                </button>
              </div>
            </div>
            {receptionBatchDates.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                No hay cargas de recepción matriz registradas por fecha.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-300">Consultar y Borrar Carga:</span>
                  <select
                    value={selectedReceptionDateToDelete}
                    onChange={(e) => setSelectedReceptionDateToDelete(e.target.value)}
                    className="bg-[#10100E] text-cyan-300 border border-red-500/50 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none rounded cursor-pointer min-w-[280px]"
                  >
                    <option value="">-- Seleccionar Carga a Borrar --</option>
                    {receptionBatchDates.map((b) => (
                      <option key={b.key} value={b.key}>
                        Documento: {b.date} {b.fileName ? `[${b.fileName}]` : ''} ({b.count} productos - {b.totalWeight.toFixed(2)} KG)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedReceptionDateToDelete}
                    onClick={() => handleDeleteReceptionByDate(selectedReceptionDateToDelete)}
                    className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-200" />
                    <span>Borrar Carga Completa</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-gray-400 font-bold self-center">Documentos Cargados:</span>
                  {receptionBatchDates.map((b) => (
                    <div
                      key={b.key}
                      className="bg-[#10100E] border border-[#3A3A36] hover:border-red-500/60 px-2.5 py-1 rounded text-[11px] flex items-center gap-2 text-gray-200"
                    >
                      <span className="font-bold text-cyan-300">{b.date}</span>
                      {b.fileName && <span className="text-gray-400 font-sans italic text-[10px]">({b.fileName})</span>}
                      <span className="text-gray-400 font-bold">({b.count} prod | {b.totalWeight.toFixed(2)} KG)</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReceptionByDate(b.key)}
                        className="p-1 hover:bg-red-950 text-red-400 hover:text-red-200 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reception Data Table */}
          <div className="bg-[#141414] border border-cyan-500/30 rounded-xs overflow-hidden shadow-lg font-mono">
            <div className="bg-[#1D1D1B] px-4 py-2.5 border-b border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-black text-cyan-300 uppercase">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Registros de Entradas (Recepción Matriz)</span>
                <span className="bg-cyan-950 text-cyan-200 px-2 py-0.5 rounded ml-2 border border-cyan-700">
                  {receptionRecords.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {receptionRecords.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setShowAllReception(!showAllReception)}
                    className="px-2.5 py-1 bg-[#22221E] hover:bg-[#33332D] border border-cyan-500/40 text-cyan-200 text-[11px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                  >
                    {showAllReception ? 'Ver solo primeros 50' : `Ver los ${receptionRecords.length} registros`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Código</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">Nombre</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">Fecha de Producción</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Folio</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Lote</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">Peso Físico (KG)</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">Fecha Lectura</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">Almacén</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">Fecha de Recepción</th>
                    <th className="p-2.5 text-center min-w-[70px]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {receptionRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay registros de Recepción Matriz. Cargue el archivo correspondiente.
                      </td>
                    </tr>
                  ) : (
                    (showAllReception ? receptionRecords : receptionRecords.slice(0, 50)).map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#282824] transition-colors text-xs ${
                          idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]'
                        }`}
                      >
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-cyan-300">{r.code}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">{r.name}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.date}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">{r.folio}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.lot}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-cyan-300">
                          {typeof r.weight === 'number' ? `${r.weight.toFixed(2)} KG` : `${String(r.weight).replace('$', '')} KG`}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.readingDate}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">{r.warehouseId}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.docDate || r.uploadedAt}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VENTA DIARIA */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* File Upload Banner for Daily Sales */}
          <div className="bg-[#1D1D1B] p-4 border border-[#3A3A36] rounded text-white space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-300">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Cargar Archivo Excel de Salidas / Venta Diaria</span>
              </div>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700 px-2 py-0.5 rounded font-mono">
                Venta Diaria SIFPRO
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Seleccione la fecha deseada para la carga y adjunte el archivo Excel o CSV con las salidas y ventas diarias para realizar el descuento sobre el inventario físico.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-extrabold text-purple-300 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fecha de Venta / Documento:</span>
                </label>
                <input
                  type="date"
                  value={customSalesDate}
                  onChange={(e) => setCustomSalesDate(e.target.value)}
                  className="w-full bg-[#181816] text-purple-300 border border-purple-400/60 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-purple-400 rounded cursor-pointer"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-purple-300 uppercase mb-1">
                  <span>Seleccionar Archivo (Excel / CSV / TXT):</span>
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-purple-400/10 hover:bg-purple-400/20 border border-dashed border-purple-400 text-purple-300 hover:text-purple-200 text-xs font-bold rounded cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Subir Archivo Venta Diaria ({customSalesDate || 'Sin Fecha'})</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleSalesFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Control Panel: Consult and Delete Sales Load by Date */}
          <div className="bg-[#181816] p-3.5 border border-red-500/30 rounded text-white space-y-2 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-red-400">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Borrar Carga de Venta Diaria</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  Consulte las cargas registradas o borre las ventas por completo
                </span>
                <button
                  type="button"
                  onClick={handleDeleteAllSales}
                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-red-100 text-[11px] font-extrabold rounded flex items-center gap-1 cursor-pointer transition-colors"
                  title="Eliminar absolutamente todos los registros de Venta Diaria"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Borrar Todo de Venta Diaria</span>
                </button>
              </div>
            </div>

            {salesBatchDates.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                No hay cargas de venta diaria registradas por fecha.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-300">Consultar y Borrar Carga:</span>
                  <select
                    value={selectedSalesDateToDelete}
                    onChange={(e) => setSelectedSalesDateToDelete(e.target.value)}
                    className="bg-[#10100E] text-purple-300 border border-red-500/50 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none rounded cursor-pointer min-w-[280px]"
                  >
                    <option value="">-- Seleccionar Carga / Fecha a Borrar --</option>
                    {salesBatchDates.map((b) => (
                      <option key={b.key} value={b.key}>
                        Documento: {b.date} {b.fileName ? `[${b.fileName}]` : ''} ({b.count} salidas - {b.totalWeight.toFixed(2)} KG)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedSalesDateToDelete}
                    onClick={() => handleDeleteSalesByDate(selectedSalesDateToDelete)}
                    className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-200" />
                    <span>Borrar Carga Completa del Documento</span>
                  </button>
                </div>

                {/* List of Batch Badges with Direct Delete Icon */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-gray-400 font-bold self-center">Documentos Cargados:</span>
                  {salesBatchDates.map((b) => (
                    <div
                      key={b.key}
                      className="bg-[#10100E] border border-[#3A3A36] hover:border-red-500/60 px-2.5 py-1 rounded text-[11px] flex items-center gap-2 text-gray-200"
                    >
                      <span className="font-bold text-purple-300">{b.date}</span>
                      {b.fileName && <span className="text-gray-400 font-sans italic text-[10px]">({b.fileName})</span>}
                      <span className="text-gray-400 font-bold">({b.count} salidas | {b.totalWeight.toFixed(2)} KG)</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSalesByDate(b.key)}
                        className="p-1 hover:bg-red-950 text-red-400 hover:text-red-200 rounded cursor-pointer transition-colors"
                        title={`Eliminar toda la carga del documento de venta del ${b.date}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sales Data Table */}
          <div className="bg-[#141414] border-2 border-[#3A3A36] rounded-xs overflow-hidden shadow-lg font-mono">
            <div className="bg-[#1D1D1B] px-4 py-2.5 border-b border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-purple-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>TABLA 2: REGISTROS DE VENTA DIARIA POR FECHA</span>
              </span>
              <span className="text-[11px] text-gray-400">
                Total Vendido: <strong className="text-purple-400">{totalSalesWeightAll.toFixed(2)} KG</strong> ({salesRecords.length} salidas)
              </span>
            </div>

            {/* Informative Notice Banner for 50-record limit */}
            {salesRecords.length > 0 && (
              <div className="bg-[#10100E] px-4 py-2 border-b border-[#2C2C28] flex flex-wrap items-center justify-between gap-2 text-xs text-purple-300/90 font-mono">
                <div className="flex items-center gap-2">
                  <span className="bg-purple-400/20 text-purple-300 border border-purple-400/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Muestra Informativa
                  </span>
                  <span className="text-gray-300 text-[11px]">
                    Mostrando los primeros <strong>{showAllSales ? salesRecords.length : Math.min(50, salesRecords.length)}</strong> de <strong>{salesRecords.length}</strong> registros cargados.
                  </span>
                </div>

                {salesRecords.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSales(!showAllSales)}
                    className="px-2.5 py-1 bg-[#22221E] hover:bg-[#33332D] border border-purple-500/40 text-purple-200 text-[11px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                  >
                    {showAllSales ? 'Ver solo primeros 50' : `Ver los ${salesRecords.length} registros completos`}
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
                      <div className="flex items-center justify-between">
                        <span>Código</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">
                      <div className="flex items-center justify-between">
                        <span>Nombre</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">
                      <div className="flex items-center justify-between">
                        <span>Fecha Venta</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
                      <div className="flex items-center justify-between">
                        <span>Folio Venta</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
                      <div className="flex items-center justify-between">
                        <span>Lote</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">
                      <div className="flex items-center justify-between">
                        <span>Peso Salida</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">
                      <div className="flex items-center justify-between">
                        <span>Fecha de Producción</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span>Fecha Lectura</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>Almacén</span>
                        <Filter className="w-3 h-3 text-gray-400" />
                      </div>
                    </th>
                    <th className="p-2.5 text-center min-w-[70px]">
                      <span>Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {salesRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay registros de Venta Diaria para los criterios seleccionados. Cargue el Excel de Venta Diaria.
                      </td>
                    </tr>
                  ) : (
                    (showAllSales ? salesRecords : salesRecords.slice(0, 50)).map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#282824] transition-colors text-xs ${
                          idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]'
                        }`}
                      >
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-purple-300">
                          {r.code}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">
                          {r.name}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.docDate || r.uploadedAt}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">
                          {r.folio}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.lot}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-purple-300">
                          {typeof r.weight === 'number' ? `${r.weight.toFixed(2)} KG` : `${String(r.weight).replace('$', '')} KG`}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.date}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.readingDate}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">
                          {r.warehouseId}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Eliminar venta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEVOLUCIONES SIFPRO (PRODUCTO RETORNADO RECHAZADO POR CLIENTE) */}
      {activeTab === 'returns' && (
        <div className="space-y-4 font-mono">

          {/* MÓDULO DE ESCANEO DE PRODUCTO DEVUELTO CON BÁSCULA SIFPRO (YOREME 29 DÍGITOS) */}
          <div className="bg-[#181816] border-2 border-amber-500/80 rounded p-4 text-white space-y-4 shadow-xl font-mono">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#3A3A36] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 text-black font-black flex items-center justify-center rounded shrink-0">
                  <Scan className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base uppercase text-amber-300 flex items-center gap-2 flex-wrap">
                    <span>ESCANEO DE PRODUCTO DEVUELTO Y LECTURA DE BÁSCULA</span>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/40">YOREME 29 DÍGITOS</span>
                  </h3>
                  <p className="text-xs text-gray-300">
                    Primero coloque la caja en la báscula. Al detectar un pesaje activo, el escáner se habilitará para procesar la etiqueta Yoreme, verificar la diferencia de peso y liberar el producto a disponible.
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: 1) Scale Reading & 2) Yoreme Barcode Scanner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              {/* COLUMN 1: PASO 1 - LECTURA DE BÁSCULA (5 cols) */}
              <div className="lg:col-span-5 bg-[#121210] border border-[#3A3A36] rounded p-3.5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-400" />
                      1. PASO 1: LECTURA DE BÁSCULA
                    </span>
                    {returnScaleWeight > 0 ? (
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-600/60 text-[10px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        PESO ACTIVO
                      </span>
                    ) : (
                      <span className="bg-rose-950 text-rose-400 border border-rose-600/60 text-[10px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        SIN PESO (0.00 KG)
                      </span>
                    )}
                  </div>

                  {/* Live Weight Display */}
                  <div className={`p-4 rounded border text-center transition-all ${
                    returnScaleWeight > 0 
                      ? 'bg-[#0E1F14] border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-[#181816] border-[#3A3A36] text-gray-400'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">
                      PESO EN PLATAFORMA BÁSCULA
                    </div>
                    <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-400 flex items-baseline justify-center gap-1">
                      <span>{returnScaleWeight.toFixed(2)}</span>
                      <span className="text-lg font-bold text-gray-400">KG</span>
                    </div>
                    <div className="text-[11px] text-gray-300 mt-1.5 font-sans">
                      {returnScaleWeight > 0 
                        ? '✅ Pesaje fijado. Escáner de código de barras desbloqueado.' 
                        : '⚠️ Coloque la caja devuelta en la plataforma para desbloquear el escáner.'}
                    </div>
                  </div>

                  {/* Manual Weight Input & Quick Presets */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ingresar peso manual (KG)..."
                        value={returnScaleWeight > 0 ? returnScaleWeight : ''}
                        onChange={(e) => setReturnScaleWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#1A1A18] border border-[#3A3A36] focus:border-amber-500 text-xs text-white font-mono font-bold px-3 py-1.5 rounded outline-none"
                      />
                      {returnScaleWeight > 0 && (
                        <button
                          type="button"
                          onClick={() => setReturnScaleWeight(0)}
                          className="bg-[#2A2A26] hover:bg-red-950 text-gray-300 hover:text-red-300 text-xs font-bold px-2.5 py-1.5 rounded border border-[#3A3A36] shrink-0 transition-colors cursor-pointer"
                          title="Poner báscula a Cero (0.00 KG)"
                        >
                          Cero
                        </button>
                      )}
                    </div>

                    {/* Scale Weight Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold block">Pruebas Rápidas de Pesaje (Simulador Báscula):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[18.20, 18.50, 24.00, 17.80, 21.30].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setReturnScaleWeight(w)}
                            className={`px-2 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer transition-all ${
                              returnScaleWeight === w
                                ? 'bg-amber-500 text-black border-amber-400 font-black'
                                : 'bg-[#181816] text-gray-300 border-[#3A3A36] hover:border-amber-500/50'
                            }`}
                          >
                            {w.toFixed(2)} KG
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Serial COM button */}
                <div className="pt-2 border-t border-[#2C2C28]">
                  <button
                    type="button"
                    onClick={handleConnectScaleCOM}
                    className="w-full py-1.5 bg-[#1F1F1C] hover:bg-[#2A2A26] border border-[#3A3A36] text-gray-300 hover:text-amber-300 text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Usb className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isReturnScaleConnected ? 'Báscula COM Conectada' : 'Conectar Báscula por Puerto COM / USB'}</span>
                  </button>
                </div>
              </div>

              {/* COLUMN 2: PASO 2 - ESCÁNER DE CÓDIGO YOREME (7 cols) */}
              <div className="lg:col-span-7 bg-[#121210] border border-[#3A3A36] rounded p-3.5 space-y-3 relative flex flex-col justify-between">
                
                {/* Overlay if scale weight is <= 0 */}
                {returnScaleWeight <= 0 && (
                  <div className="absolute inset-0 bg-[#0E0E0C]/90 backdrop-blur-xs z-10 rounded p-6 flex flex-col items-center justify-center text-center space-y-2 border border-rose-900/40">
                    <div className="w-12 h-12 bg-rose-950 text-rose-400 rounded-full flex items-center justify-center border border-rose-800">
                      <Lock className="w-6 h-6 text-rose-400" />
                    </div>
                    <h4 className="text-sm font-black text-rose-300 uppercase">ESCÁNER BLOQUEADO</h4>
                    <p className="text-xs text-gray-300 max-w-sm">
                      Para escanear el producto devuelto, primero debe colocar la caja en la báscula y registrar un pesaje mayor a 0.00 KG.
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setReturnScaleWeight(18.20)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded cursor-pointer transition-colors shadow"
                      >
                        Simular Pesaje (18.20 KG) y Desbloquear
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  {/* Header Paso 2 */}
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-amber-400" />
                      2. PASO 2: ESCANEAR CÓDIGO YOREME (29 DÍGITOS)
                    </span>
                    <span className="bg-emerald-950 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-600/60 font-bold">
                      DESBLOQUEADO
                    </span>
                  </div>

                  {/* Barcode Form */}
                  <form onSubmit={handleYoremeSubmit} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Código de Barras Yoreme (Etiqueta de Caja):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={returnBarcode}
                          onChange={(e) => {
                            setReturnBarcode(e.target.value);
                            setReturnScanError(null);
                          }}
                          placeholder="Ej. 06012000185020240319111401600"
                          maxLength={35}
                          className="w-full bg-[#1A1A18] border border-[#3A3A36] focus:border-amber-500 text-amber-300 font-mono font-extrabold text-sm px-3 py-2 rounded outline-none placeholder:text-gray-600 tracking-wider"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={returnScaleWeight <= 0 || !returnBarcode.trim()}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs uppercase rounded shrink-0 transition-colors shadow cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Procesar Return</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Barcode Parse Preview */}
                    {returnBarcode.trim().length >= 10 && (
                      <div className="bg-[#181816] p-2.5 rounded border border-[#3A3A36] space-y-1.5 text-[11px] font-mono">
                        <div className="text-gray-400 font-bold uppercase text-[10px]">Previsualización de Desglose Yoreme:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-gray-500 block">Código Prod:</span>
                            <span className="text-amber-300 font-bold">{returnBarcode.substring(0, 5)} → {returnBarcode.substring(0, 2)}-{returnBarcode.substring(2, 5)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Peso Etiqueta:</span>
                            <span className="text-white font-bold">{returnBarcode.length >= 12 ? (parseFloat(returnBarcode.substring(5, 12)) / 100).toFixed(2) + ' KG' : '...'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Fecha Prod:</span>
                            <span className="text-white font-bold">{returnBarcode.length >= 20 ? returnBarcode.substring(12, 20) : '...'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Folio:</span>
                            <span className="text-amber-300 font-bold">{returnBarcode.length >= 29 ? returnBarcode.substring(24, 29) : '...'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sample Barcodes for Quick Testing */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-gray-400 font-bold block">Ejemplos de Códigos Yoreme de Prueba (Haga clic para cargar):</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReturnBarcode('06012000185020240319111401600');
                            setReturnScanError(null);
                          }}
                          className="bg-[#1A1A18] hover:bg-[#282824] border border-[#3A3A36] text-[11px] px-2.5 py-1 rounded text-left font-mono transition-colors cursor-pointer"
                        >
                          <span className="text-amber-300 font-bold block">06012000185020240319111401600</span>
                          <span className="text-[10px] text-gray-400 block">Cod: 06-012 | Peso Etiqueta: 18.50 KG | Folio: 01600 | Fecha: 19/03/2024</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReturnBarcode('06106000240920260516103005248');
                            setReturnScanError(null);
                          }}
                          className="bg-[#1A1A18] hover:bg-[#282824] border border-[#3A3A36] text-[11px] px-2.5 py-1 rounded text-left font-mono transition-colors cursor-pointer"
                        >
                          <span className="text-amber-300 font-bold block">06106000240920260516103005248</span>
                          <span className="text-[10px] text-gray-400 block">Cod: 06-106 | Peso Etiqueta: 24.09 KG | Folio: 05248 | Fecha: 16/05/2026</span>
                        </button>
                      </div>
                    </div>

                    {/* Error message */}
                    {returnScanError && (
                      <div className="bg-rose-950/80 border border-rose-500/60 p-2.5 rounded text-rose-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{returnScanError}</span>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* LAST SCANNED RETURN RESULT CONFIRMATION CARD */}
            {lastScannedReturnResult && (
              <div className="bg-[#101F15] border-2 border-emerald-500/80 rounded p-4 text-white space-y-3 shadow-xl font-mono">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>¡DEVOLUCIÓN PROCESADA CON ÉXITO! ({lastScannedReturnResult.timestamp})</span>
                  </div>
                  <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    ESTATUS: LIBERADO A DISPONIBLE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="bg-[#0A140E] p-2 rounded border border-emerald-900/60">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Código / Producto</span>
                    <span className="text-amber-300 font-extrabold block">{lastScannedReturnResult.productCode}</span>
                    <span className="text-white text-[11px] truncate block font-bold">{lastScannedReturnResult.productName}</span>
                  </div>

                  <div className="bg-[#0A140E] p-2 rounded border border-emerald-900/60">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Folio de Caja</span>
                    <span className="text-white font-extrabold text-sm block">{lastScannedReturnResult.folio}</span>
                    <span className="text-[10px] text-gray-400 block">F. Prod: {lastScannedReturnResult.productionDate}</span>
                  </div>

                  <div className="bg-[#0A140E] p-2 rounded border border-emerald-900/60">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Peso Etiqueta (Salida)</span>
                    <span className="text-gray-300 font-extrabold text-sm block">{lastScannedReturnResult.labelWeight.toFixed(2)} KG</span>
                    <span className="text-[10px] text-gray-400 block">Hora: {lastScannedReturnResult.timeStr}</span>
                  </div>

                  <div className="bg-[#0A140E] p-2 rounded border border-emerald-900/60">
                    <span className="text-[10px] text-amber-300 block uppercase font-bold">Peso Báscula (Devuelto)</span>
                    <span className="text-amber-400 font-black text-sm block">{lastScannedReturnResult.scaleWeight.toFixed(2)} KG</span>
                    <span className="text-[10px] text-emerald-400 block">Pesado en plataforma</span>
                  </div>

                  <div className="bg-[#0A140E] p-2 rounded border border-emerald-900/60">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Diferencia de Peso</span>
                    <span className={`font-black text-sm block ${
                      lastScannedReturnResult.difference < 0 ? 'text-amber-400' : lastScannedReturnResult.difference > 0 ? 'text-cyan-300' : 'text-emerald-400'
                    }`}>
                      {lastScannedReturnResult.difference > 0 ? `+${lastScannedReturnResult.difference.toFixed(2)}` : lastScannedReturnResult.difference.toFixed(2)} KG
                    </span>
                    <span className="text-[10px] text-gray-400 block">Variación: {lastScannedReturnResult.diffPercentage}%</span>
                  </div>

                  <div className="bg-[#0A140E] p-2 rounded border border-emerald-900/60 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Estatus Inventario</span>
                    <span className="text-emerald-400 text-[11px] font-black uppercase flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Disponible
                    </span>
                    <span className="text-[10px] text-gray-300 block">Sumado a inventario</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Header Card: Devoluciones SIFPRO Upload */}
          <div className="bg-[#181816] p-4 border-2 border-orange-500/80 rounded-xs text-white space-y-3 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2C2C28] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500 text-white flex items-center justify-center font-bold rounded">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-orange-300 flex items-center gap-2">
                    <span>SECCIÓN DE DEVOLUCIONES DE PRODUCTO SIFPRO</span>
                  </h3>
                  <p className="text-xs text-gray-300">
                    Registre el retorno de producto SIFPRO que salió pero fue rechazado o no se pudo entregar al cliente para sumarlo nuevamente al inventario disponible.
                  </p>
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#10100E] px-2.5 py-1.5 rounded border border-[#3A3A36]">
                  <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-[11px] text-gray-400 font-bold">Fecha de Documento:</span>
                  <input
                    type="date"
                    value={customReturnsDate}
                    onChange={(e) => setCustomReturnsDate(e.target.value)}
                    className="bg-[#1D1D1B] text-orange-300 font-bold text-xs px-2 py-0.5 rounded border border-orange-500/40 focus:outline-none cursor-pointer"
                  />
                </div>

                <label className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-extrabold text-xs uppercase rounded flex items-center gap-2 cursor-pointer shadow transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Cargar Excel / CSV Devoluciones</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleReturnsFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Control Panel: Consult and Delete Returns Load by Date */}
          <div className="bg-[#181816] p-3.5 border border-red-500/30 rounded text-white space-y-2 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-red-400">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Borrar Carga de Devoluciones SIFPRO</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  Consulte las cargas de devoluciones o borre los registros por completo
                </span>
                <button
                  type="button"
                  onClick={handleDeleteAllReturns}
                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-red-100 text-[11px] font-extrabold rounded flex items-center gap-1 cursor-pointer transition-colors"
                  title="Eliminar absolutamente todos los registros de Devoluciones SIFPRO"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Borrar Todo de Devoluciones</span>
                </button>
              </div>
            </div>

            {returnsBatchDates.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                No hay cargas de devoluciones SIFPRO registradas por fecha.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-300">Consultar y Borrar Carga:</span>
                  <select
                    value={selectedReturnsDateToDelete}
                    onChange={(e) => setSelectedReturnsDateToDelete(e.target.value)}
                    className="bg-[#10100E] text-orange-300 border border-red-500/50 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none rounded cursor-pointer min-w-[280px]"
                  >
                    <option value="">-- Seleccionar Carga / Fecha a Borrar --</option>
                    {returnsBatchDates.map((b) => (
                      <option key={b.key} value={b.key}>
                        Documento: {b.date} {b.fileName ? `[${b.fileName}]` : ''} ({b.count} devoluciones - {b.totalWeight.toFixed(2)} KG)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedReturnsDateToDelete}
                    onClick={() => handleDeleteReturnsByDate(selectedReturnsDateToDelete)}
                    className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-200" />
                    <span>Borrar Carga Completa de Devoluciones</span>
                  </button>
                </div>

                {/* List of Batch Badges with Direct Delete Icon */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-gray-400 font-bold self-center">Documentos Cargados:</span>
                  {returnsBatchDates.map((b) => (
                    <div
                      key={b.key}
                      className="bg-[#10100E] border border-[#3A3A36] hover:border-red-500/60 px-2.5 py-1 rounded text-[11px] flex items-center gap-2 text-gray-200"
                    >
                      <span className="font-bold text-orange-300">{b.date}</span>
                      {b.fileName && <span className="text-gray-400 font-sans italic text-[10px]">({b.fileName})</span>}
                      <span className="text-gray-400 font-bold">({b.count} dev. | {b.totalWeight.toFixed(2)} KG)</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReturnsByDate(b.key)}
                        className="p-1 hover:bg-red-950 text-red-400 hover:text-red-200 rounded cursor-pointer transition-colors"
                        title={`Eliminar toda la carga del documento de devoluciones del ${b.date}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Returns Data Table */}
          <div className="bg-[#141414] border-2 border-orange-500/50 rounded-xs overflow-hidden shadow-lg font-mono">
            <div className="bg-[#1D1D1B] px-4 py-2.5 border-b border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-orange-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span>TABLA DE REGISTROS DE DEVOLUCIONES Y RECHAZOS SIFPRO</span>
              </span>
              <span className="text-[11px] text-gray-400">
                Total Devuelto: <strong className="text-orange-400">{totalReturnsWeightAll.toFixed(2)} KG</strong> ({returnsRecords.length} devoluciones)
              </span>
            </div>

            {/* Informative Notice Banner for 50-record limit */}
            {returnsRecords.length > 0 && (
              <div className="bg-[#10100E] px-4 py-2 border-b border-[#2C2C28] flex flex-wrap items-center justify-between gap-2 text-xs text-orange-300/90 font-mono">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-400/20 text-orange-300 border border-orange-400/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Muestra Informativa
                  </span>
                  <span className="text-gray-300 text-[11px]">
                    Mostrando los primeros <strong>{showAllReturns ? returnsRecords.length : Math.min(50, returnsRecords.length)}</strong> de <strong>{returnsRecords.length}</strong> registros cargados.
                  </span>
                </div>

                {returnsRecords.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setShowAllReturns(!showAllReturns)}
                    className="px-2.5 py-1 bg-[#22221E] hover:bg-[#33332D] border border-orange-500/40 text-orange-200 text-[11px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                  >
                    {showAllReturns ? 'Mostrar solo primeros 50' : 'Ver todos los registros'}
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#282824] text-gray-200 border-b border-[#3A3A36] uppercase text-[11px] font-black tracking-wide">
                    <th className="p-2.5 border-r border-[#3A3A36]">Código</th>
                    <th className="p-2.5 border-r border-[#3A3A36] min-w-[160px]">Nombre Producto</th>
                    <th className="p-2.5 border-r border-[#3A3A36]">Fecha de Producción</th>
                    <th className="p-2.5 border-r border-[#3A3A36]">Fecha Devolución</th>
                    <th className="p-2.5 border-r border-[#3A3A36]">Folio</th>
                    <th className="p-2.5 border-r border-[#3A3A36]">Lote</th>
                    <th className="p-2.5 border-r border-[#3A3A36] text-right">Peso de Salida</th>
                    <th className="p-2.5 border-r border-[#3A3A36] text-right text-orange-300 font-black">
                      Peso Devuelto (KG)
                    </th>
                    <th className="p-2.5 border-r border-[#3A3A36] text-right">Diferencia</th>
                    <th className="p-2.5 border-r border-[#3A3A36]">Fecha Lectura Devolución</th>
                    <th className="p-2.5 border-r border-[#3A3A36] text-center">Almacén</th>
                    <th className="p-2.5 border-r border-[#3A3A36]">Motivo / Cliente</th>
                    <th className="p-2.5 text-center min-w-[70px]">
                      <span>Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {returnsRecords.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay registros de Devoluciones SIFPRO para los criterios seleccionados. Cargue el Excel de Devoluciones.
                      </td>
                    </tr>
                  ) : (
                    (showAllReturns ? returnsRecords : returnsRecords.slice(0, 50)).map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#282824] transition-colors text-xs ${
                          idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]'
                        }`}
                      >
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-orange-300">
                          {r.code}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">
                          {r.name}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.date}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.docDate || r.uploadedAt}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">
                          {r.folio}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.lot}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-right text-gray-300">
                          {r.outWeight ? (typeof r.outWeight === 'number' ? `${r.outWeight.toFixed(2)} KG` : `${String(r.outWeight).replace('$', '')} KG`) : '-'}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-orange-300">
                          {typeof r.weight === 'number' ? `${r.weight.toFixed(2)} KG` : `${String(r.weight).replace('$', '')} KG`}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-right font-bold text-gray-200">
                          {r.outWeight ? (() => {
                            const diffVal = parseWeightValue(r.weight) - parseWeightValue(r.outWeight);
                            if (diffVal < 0) {
                              return (
                                <span className="text-amber-400 font-mono font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                                  {diffVal.toFixed(2)} KG
                                </span>
                              );
                            } else if (diffVal > 0) {
                              return (
                                <span className="text-cyan-300 font-mono font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                  +{diffVal.toFixed(2)} KG
                                </span>
                              );
                            }
                            return (
                              <span className="text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                                0.00 KG
                              </span>
                            );
                          })() : '-'}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">
                          {r.readingDate}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">
                          {r.warehouseId}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300 text-[11px] italic">
                          {r.reason || 'Rechazo / Devolución de cliente'}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Eliminar devolución"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DISPONIBLE PARA VENTA (RESULTADO NETO = FÍSICO + RECEPCIÓN + DEVOLUCIONES - VENTA DIARIA) */}
      {activeTab === 'available' && (
        <div className="space-y-4 font-mono">
          {/* Sticky Selection Bar for Market Development Mode */}
          {isMarketDevelopmentMode && selectedSifproIds.length > 0 && (
            <div className="sticky top-2 z-30 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-[#141414] p-3.5 rounded-xs border-2 border-amber-600 shadow-2xl font-mono flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#141414] text-amber-400 flex items-center justify-center font-bold rounded">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs uppercase tracking-wider block">
                    CAJAS SIFPRO SELECCIONADAS PARA APARTADO
                  </span>
                  <span className="text-[11px] font-bold text-[#141414]/90">
                    {selectedSifproRecordsList.length} caja(s) / folio(s) en selección — Peso Total: <strong className="underline">{selectedSifproTotalWeight.toFixed(2)} KG</strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!isMarketReleased && (activeUserRole === 'Desarrollador de Mercado' || activeUserRole === 'Telemarketing')}
                  onClick={handleTriggerReserveSifpro}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#282824] disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 font-black text-xs uppercase rounded flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>{(!isMarketReleased && (activeUserRole === 'Desarrollador de Mercado' || activeUserRole === 'Telemarketing')) ? 'Venta Cerrada' : `Apartar Cajas SIFPRO (${selectedSifproRecordsList.length})`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSifproIds([])}
                  className="px-3 py-2 bg-[#141414]/20 hover:bg-[#141414]/30 text-[#141414] font-bold text-xs rounded cursor-pointer transition-colors"
                >
                  Limpiar Selección
                </button>
              </div>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="bg-[#1D1D1B] p-4 border border-emerald-500/60 rounded text-white space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-300">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>DISPONIBLE PARA VENTA (INVENTARIO AGRUPADO POR ARTÍCULO SIFPRO)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (expandedProducts.length === availableInventoryGrouped.length) {
                      setExpandedProducts([]);
                    } else {
                      setExpandedProducts(availableInventoryGrouped.map((item) => item.code));
                    }
                  }}
                  className="px-3 py-1 bg-[#282824] hover:bg-[#383832] text-emerald-300 border border-emerald-500/50 rounded font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {expandedProducts.length === availableInventoryGrouped.length
                      ? 'Colapsar Todos'
                      : 'Expandir Todos los Artículos'}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Esta pantalla agrupa cada <strong className="text-emerald-300">Artículo / Producto SIFPRO</strong> mostrando el <strong className="text-amber-300">número de cajas que lo componen</strong> en inventario físico y sus correspondientes salidas por <strong className="text-purple-300">Venta Diaria</strong>. Haga clic en cualquier artículo para desplegar los folios y registros individuales.
            </p>
          </div>

          {/* Grouped Stock Available Table */}
          <div className="bg-[#141414] border-2 border-emerald-500/50 rounded-xs overflow-hidden shadow-lg">
            <div className="bg-[#1D1D1B] px-4 py-2.5 border-b border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>INVENTARIO NETO DISPONIBLE Y REGISTROS POR ARTÍCULO</span>
              </span>
              <span className="text-[11px] text-gray-400">
                Stock Total Disponible: <strong className="text-emerald-400">{totalNetAvailableWeight.toFixed(2)} KG</strong> ({availableInventoryGrouped.length} artículos)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
                    <th className="p-2.5 border-r border-[#4F4F4A] text-center min-w-[70px]">Ver Cajas</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Código</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">Artículo / Producto</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] text-right text-amber-300">
                      (+) Inv. Físico
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] text-right text-cyan-300">
                      (+) Recepción Matriz
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] text-right text-orange-300">
                      (+) Devoluciones
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] text-right text-purple-300">
                      (-) Venta Diaria
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] text-right text-emerald-300 font-black">
                      (=) Disponible en Existencia
                    </th>
                    <th className="p-2.5 border-r border-[#4F4F4A] text-center">Estatus Stock</th>
                    <th className="p-2.5 text-center">Almacén</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {availableInventoryGrouped.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay productos disponibles para calcular en existencia.
                      </td>
                    </tr>
                  ) : (
                    availableInventoryGrouped.map((item, idx) => {
                      const isExpanded = expandedProducts.includes(item.code);

                      return (
                        <React.Fragment key={item.code}>
                          <tr
                            onClick={() => toggleExpandProduct(item.code)}
                            className={`hover:bg-[#282824] cursor-pointer transition-colors text-xs ${
                              isExpanded ? 'bg-[#22221E] border-l-4 border-l-emerald-400' : (idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]')
                            }`}
                          >
                            <td className="p-2.5 border-r border-[#2C2C28] text-center">
                              <button
                                type="button"
                                className="p-1 bg-[#2C2C28] hover:bg-emerald-950 text-emerald-300 rounded cursor-pointer transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-bold text-amber-300">
                              {item.code}
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">
                              {item.name}
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-bold text-right text-amber-300">
                              {item.physicalWeight.toFixed(2)} KG
                              <span className="block text-[10px] text-gray-400 font-normal">
                                ({item.physicalCount} cajas / folios)
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-bold text-right text-cyan-300">
                              +{item.receptionWeight.toFixed(2)} KG
                              <span className="block text-[10px] text-gray-400 font-normal">
                                ({item.receptionCount} entradas)
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-bold text-right text-orange-300">
                              +{item.returnsWeight.toFixed(2)} KG
                              <span className="block text-[10px] text-gray-400 font-normal">
                                ({item.returnsCount} devoluciones)
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-bold text-right text-purple-300">
                              -{item.salesWeight.toFixed(2)} KG
                              <span className="block text-[10px] text-gray-400 font-normal">
                                ({item.salesCount} salidas)
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-emerald-300 text-sm bg-emerald-950/20">
                              {item.netWeight.toFixed(2)} KG
                              <span className="block text-[10px] text-emerald-400 font-normal">
                                ({item.netCount} cajas netas)
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-[#2C2C28] text-center">
                              {item.status === 'Disponible' ? (
                                <span className="inline-block bg-emerald-950 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Disponible
                                </span>
                              ) : item.status === 'Stock Bajo' ? (
                                <span className="inline-block bg-amber-950 text-amber-300 border border-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Stock Bajo
                                </span>
                              ) : (
                                <span className="inline-block bg-red-950 text-red-300 border border-red-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Agotado
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-bold text-amber-400">
                              {item.warehouseId}
                            </td>
                          </tr>

                          {/* Expanded Box / Folio Registration Details */}
                          {isExpanded && (
                            <tr key={`${item.code}-details`}>
                              <td colSpan={9} className="p-4 bg-[#10100E] border-b-2 border-emerald-500/40">
                                <div className="space-y-4 text-xs font-mono">
                                  {/* Detailed Product Card Banner */}
                                  <div className="bg-[#1A1A18] p-3 border border-[#3A3A36] rounded flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-emerald-400" />
                                      <span className="font-extrabold text-white text-xs sm:text-sm">
                                        DESGLOSE DE CAJAS Y REGISTROS SIFPRO — [{item.code}] {item.name}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                      <span className="bg-amber-950/80 text-amber-300 border border-amber-600/50 px-2.5 py-1 rounded font-bold">
                                        Inv. Físico: {item.physicalCount} cajas ({item.physicalWeight.toFixed(2)} KG)
                                      </span>
                                      <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-600/50 px-2.5 py-1 rounded font-bold">
                                        Rec. Matriz: {item.receptionCount} entradas (+{item.receptionWeight.toFixed(2)} KG)
                                      </span>
                                      <span className="bg-orange-950/80 text-orange-300 border border-orange-600/50 px-2.5 py-1 rounded font-bold">
                                        Devoluciones: {item.returnsCount} retornos (+{item.returnsWeight.toFixed(2)} KG)
                                      </span>
                                      <span className="bg-purple-950/80 text-purple-300 border border-purple-600/50 px-2.5 py-1 rounded font-bold">
                                        Venta Diaria: {item.salesCount} salidas (-{item.salesWeight.toFixed(2)} KG)
                                      </span>
                                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 px-2.5 py-1 rounded font-black text-xs">
                                        Disponible: {item.netCount} cajas netas ({item.netWeight.toFixed(2)} KG)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Sub-table A: Registros en Inventario Físico */}
                                  <div className="space-y-1.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
                                      <span className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Cajas / Registros en Inventario Físico ({item.physicalRecords.length} folios)</span>
                                      </span>
                                      <div className="flex items-center gap-2 text-[10px] font-normal">
                                        {isMarketDevelopmentMode && item.physicalRecords.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSelectAllForProduct(item.physicalRecords);
                                            }}
                                            className="px-2.5 py-1 bg-amber-400 text-[#141414] hover:bg-amber-300 font-extrabold rounded text-[10px] cursor-pointer transition-colors"
                                          >
                                            Seleccionar Cajas Disponible ({item.code})
                                          </button>
                                        )}
                                        <span className="text-gray-400">
                                          Total Peso Físico: <strong className="text-amber-300">{item.physicalWeight.toFixed(2)} KG</strong>
                                        </span>
                                      </div>
                                    </div>

                                    {item.physicalRecords.length === 0 ? (
                                      <p className="text-[11px] text-gray-500 italic p-2.5 bg-[#181816] border border-[#2C2C28] rounded">
                                        No existen cajas físicas registradas para este producto.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto border border-[#2C2C28] rounded shadow-inner">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                          <thead>
                                            <tr className="bg-[#242420] text-amber-300 uppercase font-black border-b border-[#33332E]">
  {isMarketDevelopmentMode && (
    <th className="p-2 border-r border-[#33332E] text-center min-w-[50px]">Apartar</th>
  )}
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio / Caja</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Estatus / Origen</th>
  {!isMarketDevelopmentMode && (
    <th className="p-2 text-center">Acción</th>
  )}
</tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#242420] bg-[#141412] text-gray-200">
                                            {item.physicalRecords.map((r) => {
                                              const isRecordReserved = r.isReserved || reservedSifproIds.includes(r.id);
                                              const isSelected = selectedSifproIds.includes(r.id);

                                              return (
                                                <tr
                                                  key={r.id}
                                                  className={`transition-colors ${
                                                    isSelected
                                                      ? 'bg-amber-950/40 border-l-2 border-l-amber-400'
                                                      : isRecordReserved
                                                      ? 'bg-purple-950/20 text-gray-400'
                                                      : 'hover:bg-[#22221E]'
                                                  }`}
                                                >
                                                  {isMarketDevelopmentMode && (
                                                    <td className="p-2 border-r border-[#242420] text-center">
                                                      {isRecordReserved ? (
                                                        <span title="Caja Apartada">
                                                          <Bookmark className="w-4 h-4 text-amber-400 mx-auto" />
                                                        </span>
                                                      ) : (
                                                        <input
                                                          type="checkbox"
                                                          checked={isSelected}
                                                          onChange={(e) => {
                                                            e.stopPropagation();
                                                            toggleSelectSifproRecord(r.id);
                                                          }}
                                                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                                        />
                                                      )}
                                                    </td>
                                                  )}
                                                  <td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-gray-100">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-amber-300 font-bold">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-emerald-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300 text-[10px]">
                                                    {isRecordReserved ? (
                                                      <span className="inline-block bg-amber-950 text-amber-300 border border-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        APARTADO {r.reservedBy ? `(${r.reservedBy})` : ''}
                                                      </span>
                                                    ) : (
                                                      <span className="text-gray-400 italic">
                                                        {r.fileName || 'Disponible SIFPRO'}
                                                      </span>
                                                    )}
                                                  </td>
                                                  {!isMarketDevelopmentMode && (
                                                    <td className="p-2 text-center">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDeleteRecord(r.id);
                                                        }}
                                                        className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                                                        title="Eliminar registro de caja física"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    </td>
                                                  )}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                   {/* Sub-table B: Registros de Recepción Matriz */}
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider">
                                      <span className="flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>Entradas / Registros de Recepción Matriz ({item.receptionRecords.length} entradas)</span>
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-normal">
                                        Total Recepción Matriz: <strong className="text-cyan-300">+{item.receptionWeight.toFixed(2)} KG</strong>
                                      </span>
                                    </div>

                                    {item.receptionRecords.length === 0 ? (
                                      <p className="text-[11px] text-gray-500 italic p-2.5 bg-[#181816] border border-[#2C2C28] rounded">
                                        No existen entradas de recepción matriz registradas para este producto.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto border border-[#2C2C28] rounded shadow-inner">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                          <thead>
                                            <tr className="bg-[#242420] text-cyan-300 uppercase font-black border-b border-[#33332E]">
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Recepción</th>
  <th className="p-2 text-center">Acción</th>
</tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#242420] bg-[#141412] text-gray-200">
                                            {item.receptionRecords.map((r) => (
                                              <tr key={r.id} className="hover:bg-[#22221E] transition-colors">
                                                <td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-cyan-300">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-cyan-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.docDate || r.uploadedAt}</td>
                                                <td className="p-2 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteRecord(r.id);
                                                    }}
                                                    className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                                                    title="Eliminar registro de recepción"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                   {/* Sub-table C: Registros de Devoluciones SIFPRO */}
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-extrabold text-orange-300 uppercase tracking-wider">
                                      <span className="flex items-center gap-1.5">
                                        <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                                        <span>Retornos / Registros de Devolución SIFPRO ({item.returnsRecords.length} devoluciones)</span>
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-normal">
                                        Total Devoluciones: <strong className="text-orange-300">+{item.returnsWeight.toFixed(2)} KG</strong>
                                      </span>
                                    </div>

                                    {item.returnsRecords.length === 0 ? (
                                      <p className="text-[11px] text-gray-500 italic p-2.5 bg-[#181816] border border-[#2C2C28] rounded">
                                        No existen devoluciones o rechazos de clientes registrados para este producto.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto border border-[#2C2C28] rounded shadow-inner">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                          <thead>
                                            <tr className="bg-[#242420] text-orange-300 uppercase font-black border-b border-[#33332E]">
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Devolución</th>
  <th className="p-2 border-r border-[#33332E]">Folio</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso de Salida</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Devuelto</th>
  <th className="p-2 border-r border-[#33332E] text-right">Diferencia</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura Devolución</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Motivo / Cliente</th>
  <th className="p-2 text-center">Acción</th>
</tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#242420] bg-[#141412] text-gray-200">
                                            {item.returnsRecords.map((r) => (
                                              <tr key={r.id} className="hover:bg-[#22221E] transition-colors">
                                                <td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.docDate || r.uploadedAt}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-orange-300">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right text-gray-300">
    {r.outWeight ? (typeof r.outWeight === 'number' ? `${r.outWeight.toFixed(2)} KG` : `${String(r.outWeight).replace('$', '')} KG`) : '-'}
  </td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-orange-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-right font-bold text-gray-300">
    {r.outWeight ? `${(parseWeightValue(r.weight) - parseWeightValue(r.outWeight)).toFixed(2)} KG` : '-'}
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300 italic text-[10px]">{r.reason || 'Devolución / Rechazo'}</td>
                                                <td className="p-2 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteRecord(r.id);
                                                    }}
                                                    className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                                                    title="Eliminar registro de devolución"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Sub-table C: Registros en Venta Diaria */}
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-300 uppercase tracking-wider">
                                      <span className="flex items-center gap-1.5">
                                        <TrendingDown className="w-3.5 h-3.5 text-purple-400" />
                                        <span>Salidas / Registros en Venta Diaria ({item.salesRecords.length} salidas)</span>
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-normal">
                                        Total Venta Diaria: <strong className="text-purple-300">-{item.salesWeight.toFixed(2)} KG</strong>
                                      </span>
                                    </div>

                                    {item.salesRecords.length === 0 ? (
                                      <p className="text-[11px] text-gray-500 italic p-2.5 bg-[#181816] border border-[#2C2C28] rounded">
                                        No existen salidas de venta diaria registradas para este producto.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto border border-[#2C2C28] rounded shadow-inner">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                          <thead>
                                            <tr className="bg-[#242420] text-purple-300 uppercase font-black border-b border-[#33332E]">
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Venta</th>
  <th className="p-2 border-r border-[#33332E]">Folio de Venta</th>
  <th className="p-2 text-center">Acción</th>
</tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#242420] bg-[#141412] text-gray-200">
                                            {item.salesRecords.map((r) => (
                                              <tr key={r.id} className="hover:bg-[#22221E] transition-colors">
                                                <td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-purple-300">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-purple-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.docDate || r.uploadedAt}</td>
  <td className="p-2 border-r border-[#242420] text-gray-400 italic text-[10px]">{r.fileName || 'Venta Diaria'}</td>
                                                <td className="p-2 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteRecord(r.id);
                                                    }}
                                                    className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                                                    title="Eliminar registro de venta"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Telemarketing SIFPRO */}
      {activeTab === 'telemarketing' && isTelemarketingAllowed && (
        <div className="space-y-4">
          <Phase4MarketDevelopment defaultSource="sifpro" />
        </div>
      )}

      {/* Tab 7: Reportes SIFPRO */}
      {activeTab === 'reportes' && (
        <div className="space-y-4">
          <Phase5Reports defaultInventory="sifpro" />
        </div>
      )}

      {/* Manual Add Record Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs font-sans">
          <div className="bg-[#141414] border-2 border-amber-400 shadow-2xl max-w-md w-full text-white rounded overflow-hidden">
            <div className="bg-[#1D1D1B] p-3.5 border-b border-[#3A3A36] flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Agregar Registro SIFPRO Manual</span>
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualRecord} className="p-4 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Código</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="06-106"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-amber-300 font-bold rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Nombre Producto</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Top Sirloin TT"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-white font-bold rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Fecha</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="20260516"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Folio</label>
                  <input
                    type="text"
                    value={newFolio}
                    onChange={(e) => setNewFolio(e.target.value)}
                    placeholder="5248"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-gray-200 font-bold rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Lote</label>
                  <input
                    type="text"
                    value={newLot}
                    onChange={(e) => setNewLot(e.target.value)}
                    placeholder="10480"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Peso</label>
                  <input
                    type="text"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="24.09"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-emerald-300 font-bold rounded"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Fecha Lectura</label>
                  <input
                    type="text"
                    value={newReadingDate}
                    onChange={(e) => setNewReadingDate(e.target.value)}
                    placeholder="20260627"
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Almacén</label>
                  <select
                    value={newWarehouseId}
                    onChange={(e) => setNewWarehouseId(e.target.value)}
                    className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-amber-300 font-bold rounded"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Tipo de Origen</label>
                <select
                  value={newRecordType}
                  onChange={(e) => setNewRecordType(e.target.value as any)}
                  className="w-full p-2 bg-[#10100E] border border-[#3A3A36] text-amber-300 font-bold rounded"
                >
                  <option value="Físico SIFPRO">Físico SIFPRO (Inventario Físico)</option>
                  <option value="Recepción Matriz">Recepción Matriz (Entradas)</option>
                  <option value="Devolución SIFPRO">Devolución SIFPRO (Retorno Rechazado)</option>
                  <option value="Venta Diaria">Venta Diaria (Salidas Excel)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1.5 bg-[#282824] text-gray-300 hover:text-white rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black uppercase rounded"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal (Guarantees execution without browser window.confirm blocks) */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1C1A] border-2 border-red-500/80 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 border-b border-[#33332F] pb-3">
              <div className="p-2 bg-red-950 border border-red-500/50 rounded-full text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-red-400 uppercase tracking-wide">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs text-gray-200 whitespace-pre-line leading-relaxed font-mono bg-[#121210] p-3 rounded border border-[#2C2C28]">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-[#282824] hover:bg-[#383832] text-gray-300 font-bold text-xs rounded transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded shadow-lg transition-colors cursor-pointer"
              >
                {confirmModal.confirmBtnText || 'Sí, Borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
