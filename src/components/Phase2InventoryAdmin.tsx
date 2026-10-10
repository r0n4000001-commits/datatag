import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Product, PrintedLabel, Warehouse, SubWarehouse, CategoryItem, SpeciesItem, PRODUCT_CONDITIONS } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';
import { CategoryManagerModal } from './CategoryManagerModal';
import { SpeciesManagerModal } from './SpeciesManagerModal';
import { generateZplCode } from '../utils/zplGenerator';
import { formatProductCode, handleProductCodeInputMask, generateNextProductCode } from '../utils/productAndLotUtils';
import { getCategoryBadgeClass, getCategoryBadgeStyle } from '../utils/categoryUtils';
import { getSpeciesBadgeClass, getSpeciesBadgeStyle, inferProductSpeciesLegend } from '../utils/speciesUtils';
import { ConfirmDialog, ConfirmDialogState } from './ConfirmDialog';
import { ErrorBoundary } from './ErrorBoundary';
import {
  Package,
  Plus,
  Search,
  Filter,
  BarChart3,
  History,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  Trash2,
  Edit2,
  X,
  Layers,
  Scale,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  Box,
  TrendingDown,
  TrendingUp,
  Tag,
  Sliders,
  Snowflake,
  Warehouse as WarehouseIcon,
  FolderTree,
  Dna,
  Globe,
  ShieldCheck,
  Grid,
  Check,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Database,
} from 'lucide-react';

function formatSafeWeight(val: any, decimals = 2): string {
  const num = Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
}

function formatSafeDate(val: any): string {
  if (!val) return 'N/A';
  const d = new Date(val);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

const Phase2InventoryAdminContent: React.FC = () => {
  const {
    products,
    labels,
    discharges,
    subWarehouses,
    categories: categoryCatalog,
    speciesList,
    printerConfig,
    labelFormatConfig,
    addProduct,
    updateProduct,
    deleteProduct,
    addSubWarehouse,
    updateSubWarehouse,
    deleteSubWarehouse,
    addCategory,
    updateCategory,
    deleteCategory,
    addSpecies,
    updateSpecies,
    deleteSpecies,
    tares,
    assignTareToProduct,
    addPrintedLabel,
    deletePrintedLabel,
    updatePrintedLabelId,
  } = useInventory();

  // In-app confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Transient toast notification for CRUD operations
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active sub-tab under Producto No Conforme
  const [subTab, setSubTab] = useState<'stock' | 'history' | 'catalog' | 'subwarehouses' | 'categories' | 'species' | 'reports'>('stock');

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'discharged'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | 'Congelado'>('all');

  // Expanded products state for linear view
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleExpandProduct = (key: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Product Add/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states for Product Modal
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('Carnes');
  const [prodUnit, setProdUnit] = useState<Product['unit']>('KG');
  const [prodReorder, setProdReorder] = useState(20);
  const [prodDesc, setProdDesc] = useState('');
  const [prodWeight, setProdWeight] = useState(10.0);
  const [prodBarcode, setProdBarcode] = useState<Product['barcodeType']>('QRCode');
  const [prodWarehouse, setProdWarehouse] = useState<Warehouse>('Congelado');
  const [prodSubWarehouse, setProdSubWarehouse] = useState('');
  const [prodSpeciesLegend, setProdSpeciesLegend] = useState('%100 CERDO');
  const [prodTareId, setProdTareId] = useState('');

  // Sub-Warehouse Add/Edit Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubWarehouse | null>(null);
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subParent, setSubParent] = useState<Warehouse>('Congelado');
  const [subDesc, setSubDesc] = useState('');
  const [subCap, setSubCap] = useState<number>(10000);

  // Category Add/Edit Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catSearchTerm, setCatSearchTerm] = useState('');

  // Species Add/Edit Modal
  const [isSpeciesModalOpen, setIsSpeciesModalOpen] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<SpeciesItem | null>(null);
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Open modal for new product (5 dígitos, ej. 12-345)
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProdCode(generateNextProductCode(products.map((p) => p.code)));
    setProdName('');
    setProdCat(categoryCatalog[0]?.name || 'Carnes');
    setProdUnit('KG');
    setProdReorder(20);
    setProdDesc('');
    setProdWeight(15.0);
    setProdBarcode('QRCode');
    setProdWarehouse('Congelado');
    const defaultSubs = subWarehouses.filter((s) => s.parentWarehouse === 'Congelado');
    setProdSubWarehouse(defaultSubs[0]?.name || '');
    const initialCat = categoryCatalog[0]?.name || 'Carnes';
    setProdSpeciesLegend(inferProductSpeciesLegend({ category: initialCat }, speciesList));
    setProdTareId('');
    setIsProductModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setProdCode(formatProductCode(p.code));
    setProdName(p.name);
    setProdCat(p.category);
    setProdUnit(p.unit);
    setProdReorder(p.reorderPoint);
    setProdDesc(p.description || '');
    setProdWeight(p.defaultWeight || 10.0);
    setProdBarcode(p.barcodeType || 'QRCode');
    setProdWarehouse(p.warehouse || 'Congelado');
    setProdSubWarehouse(p.subWarehouse || '');
    setProdSpeciesLegend(p.speciesLegend || inferProductSpeciesLegend(p, speciesList));
    const matchingTare = tares.find((t) => t.id === p.tareId || (p.tareNumber !== undefined && t.tareNumber === p.tareNumber));
    setProdTareId(matchingTare ? matchingTare.id : '');
    setIsProductModalOpen(true);
  };

  // Save product form
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCode || !prodName) return;

    // F05: Reject negative or zero base weight
    const numWeight = Number(prodWeight);
    if (isNaN(numWeight) || numWeight <= 0) {
      showToast(
        `Rechazado: El peso base debe ser mayor a 0.00 KG (no se permiten valores negativos como ${prodWeight} ni cero).`,
        'error'
      );
      return;
    }

    const finalCode = formatProductCode(prodCode);
    if (!finalCode || !/^\d{2}-\d{3}$/.test(finalCode)) {
      showToast('Rechazado: Formato de SKU inválido. Debe tener 5 dígitos (ej. 12-345 o 99-101).', 'error');
      return;
    }

    // F02: Reject duplicate product code (e.g. 99-101)
    const isDuplicate = products.some(
      (p) =>
        (!editingProduct || p.id !== editingProduct.id) &&
        p.code.trim().toUpperCase() === finalCode.trim().toUpperCase()
    );

    if (isDuplicate) {
      showToast(
        `Rechazado: El código de producto "${finalCode}" ya existe en el catálogo. Ingrese un código único.`,
        'error'
      );
      return;
    }

    const selectedTare = tares.find((t) => t.id === prodTareId);

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        code: finalCode,
        name: prodName,
        category: prodCat,
        unit: prodUnit,
        reorderPoint: Number(prodReorder),
        description: prodDesc,
        defaultWeight: numWeight,
        barcodeType: prodBarcode,
        warehouse: prodWarehouse,
        subWarehouse: prodSubWarehouse || undefined,
        speciesLegend: prodSpeciesLegend.trim() || undefined,
        tareId: selectedTare?.id,
        tareNumber: selectedTare?.tareNumber,
        tareWeight: selectedTare?.weight,
      });
      showToast(`Producto "${prodName}" actualizado correctamente.`);
    } else {
      addProduct({
        code: finalCode,
        name: prodName,
        category: prodCat,
        unit: prodUnit,
        reorderPoint: Number(prodReorder),
        description: prodDesc,
        defaultWeight: numWeight,
        barcodeType: prodBarcode,
        warehouse: prodWarehouse,
        subWarehouse: prodSubWarehouse || undefined,
        speciesLegend: prodSpeciesLegend.trim() || undefined,
        tareId: selectedTare?.id,
        tareNumber: selectedTare?.tareNumber,
        tareWeight: selectedTare?.weight,
      });
      showToast(`Producto "${prodName}" agregado al catálogo exitosamente.`);
    }

    setIsProductModalOpen(false);
  };

  // Sub-Warehouse Modal Handlers
  const handleOpenAddSubModal = () => {
    setEditingSub(null);
    setSubCode(`SUB-${Math.floor(100 + Math.random() * 900)}`);
    setSubName('');
    setSubParent('Congelado');
    setSubDesc('');
    setSubCap(10000);
    setIsSubModalOpen(true);
  };

  const handleOpenEditSubModal = (s: SubWarehouse) => {
    setEditingSub(s);
    setSubCode(s.code);
    setSubName(s.name);
    setSubParent(s.parentWarehouse);
    setSubDesc(s.description || '');
    setSubCap(s.capacityKg || 10000);
    setIsSubModalOpen(true);
  };

  const handleSaveSubWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode || !subName) return;

    if (editingSub) {
      updateSubWarehouse({
        ...editingSub,
        code: subCode,
        name: subName,
        parentWarehouse: subParent,
        description: subDesc,
        capacityKg: Number(subCap),
      });
      showToast(`Sub-almacén "${subName}" actualizado correctamente.`);
    } else {
      addSubWarehouse({
        code: subCode,
        name: subName,
        parentWarehouse: subParent,
        description: subDesc,
        capacityKg: Number(subCap),
      });
      showToast(`Sub-almacén "${subName}" creado exitosamente.`);
    }

    setIsSubModalOpen(false);
  };

  // Category Modal Handlers
  const handleOpenAddCatModal = () => {
    setEditingCat(null);
    setIsCatModalOpen(true);
  };

  const handleOpenEditCatModal = (c: CategoryItem) => {
    setEditingCat(c);
    setIsCatModalOpen(true);
  };

  const handleSaveCategoryModal = (
    data: { code: string; name: string; description: string; color: string },
    oldName?: string
  ) => {
    if (editingCat) {
      updateCategory(
        {
          ...editingCat,
          code: data.code,
          name: data.name,
          description: data.description,
          color: data.color,
        },
        oldName
      );
      showToast(`Categoría "${data.name}" actualizada correctamente.`);
      if (prodCat === oldName) {
        setProdCat(data.name);
      }
    } else {
      const created = addCategory({
        code: data.code,
        name: data.name,
        description: data.description,
        color: data.color,
      });
      showToast(`Categoría "${data.name}" creada exitosamente.`);
      setProdCat(created.name);
    }
  };

  // Species Modal Handlers
  const handleOpenAddSpeciesModal = () => {
    setEditingSpecies(null);
    setIsSpeciesModalOpen(true);
  };

  const handleOpenEditSpeciesModal = (s: SpeciesItem) => {
    setEditingSpecies(s);
    setIsSpeciesModalOpen(true);
  };

  const handleSaveSpeciesModal = (
    data: {
      code: string;
      name: string;
      legend: string;
      origin: string;
      description: string;
      badgeColor: string;
    },
    oldLegend?: string
  ) => {
    if (editingSpecies) {
      updateSpecies(
        {
          ...editingSpecies,
          code: data.code,
          name: data.name,
          legend: data.legend,
          origin: data.origin,
          description: data.description,
          badgeColor: data.badgeColor,
        },
        oldLegend
      );
      showToast(`Especie/Origen "${data.name}" actualizada correctamente.`);
      if (prodSpeciesLegend === oldLegend) {
        setProdSpeciesLegend(data.legend);
      }
    } else {
      const created = addSpecies({
        code: data.code,
        name: data.name,
        legend: data.legend,
        origin: data.origin,
        description: data.description,
        badgeColor: data.badgeColor,
      });
      showToast(`Especie/Origen "${data.name}" creada exitosamente.`);
      setProdSpeciesLegend(created.legend);
    }
  };

  // Filtered Labels (Historial e Inventario)
  const filteredLabels = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (labels || []).filter((lbl) => {
      if (!lbl) return false;
      const matchSearch =
        !q ||
        (lbl.productName || '').toLowerCase().includes(q) ||
        (lbl.productCode || '').toLowerCase().includes(q) ||
        (lbl.lot || '').toLowerCase().includes(q) ||
        (lbl.id || '').toLowerCase().includes(q);

      const matchCat = selectedCatFilter === 'Todos' || lbl.category === selectedCatFilter;

      let matchStatus = true;
      if (statusFilter === 'available') matchStatus = !lbl.isDischarged;
      if (statusFilter === 'discharged') matchStatus = Boolean(lbl.isDischarged);

      const matchWarehouse = warehouseFilter === 'all' || lbl.warehouse === warehouseFilter;

      return matchSearch && matchCat && matchStatus && matchWarehouse;
    });
  }, [labels, searchTerm, selectedCatFilter, statusFilter, warehouseFilter]);

  // Active Inventory Stock calculation grouped by product & warehouse
  const stockByProduct = useMemo(() => {
    const map: Record<
      string,
      {
        productCode: string;
        productName: string;
        category: string;
        unit: string;
        warehouse: Warehouse;
        totalWeight: number;
        labelCount: number;
        availableLabels: PrintedLabel[];
      }
    > = {};

    (labels || []).forEach((lbl) => {
      if (!lbl || lbl.isDischarged) return;
      if (warehouseFilter !== 'all' && lbl.warehouse !== warehouseFilter) {
        return;
      }

      const safeCode = lbl.productCode || 'S/C';
      const safeWh = lbl.warehouse || 'Congelado';
      const key = `${safeCode}-${safeWh}`;
      if (!map[key]) {
        map[key] = {
          productCode: safeCode,
          productName: lbl.productName || 'Producto PNC',
          category: lbl.category || 'Carnes',
          unit: lbl.unit || 'KG',
          warehouse: safeWh,
          totalWeight: 0,
          labelCount: 0,
          availableLabels: [],
        };
      }
      const rawW = Number(lbl.weight);
      const safeW = isNaN(rawW) ? 0 : rawW;
      map[key].totalWeight += safeW;
      map[key].labelCount += 1;
      map[key].availableLabels.push(lbl);
    });

    return Object.values(map);
  }, [labels, warehouseFilter]);

  const expandAllProducts = () => {
    const newMap: Record<string, boolean> = {};
    stockByProduct.forEach((p) => {
      newMap[`${p.productCode}-${p.warehouse}`] = true;
    });
    setExpandedProducts(newMap);
  };

  const collapseAllProducts = () => {
    setExpandedProducts({});
  };

  // Summary Metrics
  const totalLabelsPrinted = (labels || []).length;
  const activeStockWeight = (labels || [])
    .filter((l) => l && !l.isDischarged)
    .reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);

  const frozenStockWeight = (labels || [])
    .filter((l) => l && !l.isDischarged && l.warehouse === 'Congelado')
    .reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);

  const totalDischarges = (discharges || []).length;
  const dischargedWeight = (discharges || []).reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);

  // Reprint label to Zebra
  const handleReprintLabel = async (lbl: PrintedLabel) => {
    const prod = products.find((p) => p.code === lbl.productCode);
    if (!prod) return;

    const { zpl } = generateZplCode(
      {
        id: lbl.id,
        product: prod,
        lot: lbl.lot,
        weight: lbl.weight,
        unit: lbl.unit,
        warehouse: lbl.warehouse,
        conditionFlag: lbl.conditionFlag || 'A',
        expirationDate: lbl.expirationDate,
        domicilio: lbl.domicilio,
        speciesLegend: lbl.speciesLegend,
        timestamp: lbl.printTimestamp,
      },
      printerConfig,
      labelFormatConfig
    );

    try {
      const res = await fetch('/api/zebra/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: printerConfig.ip,
          port: printerConfig.port,
          zpl,
          copies: 1,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Reimpresión enviada con éxito a ${printerConfig.ip}:${printerConfig.port}`);
      } else {
        alert(`Error al reimprimir: ${data.error || 'Impresora offline'}`);
      }
    } catch (err: any) {
      alert(`Error de conexión: ${err.message}`);
    }
  };

  // Export history report to CSV
  const handleExportCSV = () => {
    const headers = ['ID Etiqueta', 'Código', 'Producto', 'Categoría', 'Almacén', 'Especie', 'Lote', 'Peso Neto', 'Peso Bruto', 'Tara Descontada', 'Unidad', 'F. Caducidad', 'Fecha Impresión', 'Estado'];
    const rows = filteredLabels.map((l) => [
      l.id,
      l.productCode,
      `"${l.productName}"`,
      l.category,
      l.warehouse,
      l.speciesLegend || 'N/A',
      l.lot,
      l.weight,
      l.grossWeight || l.weight,
      l.tareWeight ? `-${l.tareWeight}` : '0.00',
      l.unit,
      l.expirationDate || 'N/A',
      new Date(l.printTimestamp).toLocaleString('es-ES'),
      l.isDischarged ? 'Salida Registrada' : 'En Stock Activo',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Inventario_Zebra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Executive Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
        <div className="bg-[#F8F7F4] p-3 border border-[#141414] flex items-center gap-2.5">
          <div className="p-2 bg-cyan-950 text-cyan-300 border border-cyan-700 shrink-0">
            <Snowflake className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#666] uppercase tracking-wider">Almacén Congelado (PNC)</p>
            <h3 className="text-lg font-extrabold text-cyan-950">{formatSafeWeight(frozenStockWeight, 1)} KG</h3>
            <p className="text-[9px] text-[#888]">Cámara de Frío (-18°C)</p>
          </div>
        </div>

        <div className="bg-[#F8F7F4] p-3 border border-[#141414] flex items-center gap-2.5">
          <div className="p-2 bg-emerald-400 text-[#141414] border border-[#141414] shrink-0">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#666] uppercase tracking-wider">Total Stock Activo</p>
            <h3 className="text-lg font-extrabold text-emerald-800">{formatSafeWeight(activeStockWeight, 1)} KG</h3>
            <p className="text-[9px] text-[#888]">Exclusivo Congelado PNC</p>
          </div>
        </div>

        <div className="bg-[#F8F7F4] p-3 border border-[#141414] flex items-center gap-2.5">
          <div className="p-2 bg-amber-400 text-[#141414] border border-[#141414] shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#666] uppercase tracking-wider">Etiquetas ZPL</p>
            <h3 className="text-lg font-extrabold text-[#141414]">{totalLabelsPrinted}</h3>
            <p className="text-[9px] text-[#888]">Total impresas</p>
          </div>
        </div>

        <div className="bg-[#F8F7F4] p-3 border border-[#141414] flex items-center gap-2.5">
          <div className="p-2 bg-blue-300 text-[#141414] border border-[#141414] shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-[#666] uppercase tracking-wider">Salidas Reg.</p>
            <h3 className="text-lg font-extrabold text-[#141414]">{totalDischarges}</h3>
            <p className="text-[9px] text-[#888]">{formatSafeWeight(dischargedWeight, 1)} KG Salidos</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-[#F8F7F4] border border-[#141414] p-1.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 font-mono">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap gap-1 w-full md:w-auto">
          <button
            onClick={() => setSubTab('stock')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'stock'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Stock Activo</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'history'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Historial Etiquetas</span>
          </button>

          <button
            onClick={() => setSubTab('catalog')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'catalog'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Productos</span>
          </button>

          <button
            onClick={() => setSubTab('subwarehouses')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'subwarehouses'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <WarehouseIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Sub-Almacenes</span>
          </button>

          <button
            onClick={() => setSubTab('categories')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'categories'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Categorías</span>
          </button>

          <button
            onClick={() => setSubTab('species')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'species'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <Dna className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Especie / Origen</span>
          </button>

          <button
            onClick={() => setSubTab('reports')}
            className={`flex items-center justify-start gap-2 px-2.5 py-1.5 font-bold text-[11px] sm:text-xs uppercase transition-all border text-left ${
              subTab === 'reports'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">Reportes</span>
          </button>
        </div>

        {/* Global Warehouse Indicator */}
        <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-[#141414] text-[11px]">
          <span className="text-[#666] font-bold text-[10px] uppercase flex items-center gap-1">
            <WarehouseIcon className="w-3 h-3 text-[#141414]" /> Almacén PNC:
          </span>
          <span className="px-2 py-0.5 font-bold border text-xs bg-cyan-950 text-cyan-200 border-cyan-500 flex items-center gap-1">
            <Snowflake className="w-3 h-3 text-cyan-400" /> Congelado
          </span>
        </div>
      </div>

      {/* SUB-TAB 1: Inventario Activo por Lotes */}
      {subTab === 'stock' && (
        <div className="space-y-3 font-mono">
          <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#141414]/20 pb-2">
              <div>
                <h3 className="font-mono font-bold text-sm text-[#141414] uppercase flex items-center gap-2">
                  <span>Stock Disponible en Almacén</span>
                  {warehouseFilter !== 'all' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 border bg-cyan-100 text-cyan-900 border-cyan-400">
                      ❄️ ALMACÉN CONGELADO
                    </span>
                  )}
                </h3>
                <p className="text-[11px] font-mono text-[#666]">
                  Resumen de materia disponible generado por etiquetas ZPL activas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllProducts}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#141414] border border-[#141414] text-[10px] font-bold uppercase transition-colors"
                >
                  Expandir Todo
                </button>
                <button
                  onClick={collapseAllProducts}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#141414] border border-[#141414] text-[10px] font-bold uppercase transition-colors"
                >
                  Colapsar Todo
                </button>
              </div>
            </div>

            {/* Linear List of Stock items by Product */}
            <div className="space-y-2">
              {stockByProduct.map((item) => {
                const key = `${item.productCode}-${item.warehouse}`;
                const isExpanded = !!expandedProducts[key];

                return (
                  <div key={key} className="border-2 border-[#141414] bg-white transition-all shadow-xs">
                    {/* Main Product Row - Clickable to toggle details */}
                    <div
                      onClick={() => toggleExpandProduct(key)}
                      className={`p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isExpanded ? 'bg-amber-50/80 border-b-2 border-[#141414]' : 'hover:bg-amber-50/40'
                      }`}
                    >
                      {/* Product Header Info */}
                      <div className="flex items-center gap-3 min-w-[260px] flex-1">
                        <button
                          type="button"
                          className="p-1 bg-[#141414] text-amber-400 border border-[#141414] shrink-0"
                          title={isExpanded ? 'Ocultar cajas' : 'Ver cajas'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-[#141414] bg-amber-300 px-2 py-0.5 border border-[#141414]">
                              {item.productCode}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 border uppercase bg-cyan-100 text-cyan-900 border-cyan-400">
                              ❄️ Congelado
                            </span>
                            {(() => {
                              const matchingCat = categoryCatalog.find((c) => c.name === item.category);
                              const badgeCls = getCategoryBadgeClass(matchingCat?.color);
                              const badgeSty = getCategoryBadgeStyle(matchingCat?.color);
                              return (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 border rounded-xs ${badgeCls}`}
                                  style={badgeSty}
                                >
                                  {item.category}
                                </span>
                              );
                            })()}
                          </div>
                          <h4 className="font-bold text-sm text-[#141414] uppercase tracking-wide">
                            {item.productName}
                          </h4>
                        </div>
                      </div>

                      {/* Right Metrics: Total Boxes & Total Weight in KG */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-[#666] block uppercase">Cajas</span>
                          <span className="font-mono font-black text-xs text-[#141414] bg-gray-100 px-2.5 py-1 border border-gray-300 inline-block">
                            📦 {item.labelCount} {item.labelCount === 1 ? 'caja' : 'cajas'}
                          </span>
                        </div>

                        <div className="text-right bg-emerald-950 text-emerald-300 px-3 py-1.5 border border-emerald-600 min-w-[130px]">
                          <span className="text-[9px] font-bold text-emerald-400 block uppercase tracking-wider">Total Acumulado</span>
                          <span className="text-lg font-black leading-none block">
                            {formatSafeWeight(item.totalWeight, 2)} <span className="text-xs">{item.unit || 'KG'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Boxes Details View */}
                    {isExpanded && (
                      <div className="bg-[#F8F7F4] p-3 sm:p-4 border-t-2 border-[#141414] space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono text-[#555] border-b border-[#141414]/20 pb-2">
                          <span className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-amber-600" />
                            <span>
                              Cajas que conforman el total ({item.availableLabels.length} etiquetadas)
                            </span>
                          </span>
                          <span className="text-[11px] font-mono text-[#666]">
                            Detalle de cada pieza en inventario
                          </span>
                        </div>

                        {/* Detailed Table of Boxes */}
                        <div className="overflow-x-auto border border-[#141414] bg-white">
                          <table className="w-full text-left font-mono text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#141414] text-white text-[11px] uppercase border-b border-[#141414]">
                                <th className="p-2 border-r border-[#333]">#</th>
                                <th className="p-2 border-r border-[#333]">ID Etiqueta</th>
                                <th className="p-2 border-r border-[#333]">Bandera / Estado</th>
                                <th className="p-2 border-r border-[#333]">Lote</th>
                                <th className="p-2 border-r border-[#333]">Sub-Almacén</th>
                                <th className="p-2 border-r border-[#333]">F. Caducidad</th>
                                <th className="p-2 border-r border-[#333]">Fecha Impresión</th>
                                <th className="p-2 text-right">Peso Neto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {item.availableLabels.map((lbl, idx) => (
                                <tr key={lbl.id} className="hover:bg-amber-50/50 transition-colors text-[11px]">
                                  <td className="p-2 border-r border-gray-200 text-[#888] font-bold text-center">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2 border-r border-gray-200 font-bold text-[#141414]">
                                    <div>{lbl.id}</div>
                                    {lbl.speciesLegend && (
                                      <span className="text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded-xs inline-block mt-0.5">
                                        {lbl.speciesLegend}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 border-r border-gray-200">
                                    {lbl.conditionFlag && PRODUCT_CONDITIONS[lbl.conditionFlag] ? (
                                      <span className={`px-1.5 py-0.5 text-[10px] font-black border rounded uppercase inline-block whitespace-nowrap ${PRODUCT_CONDITIONS[lbl.conditionFlag].color}`}>
                                        {PRODUCT_CONDITIONS[lbl.conditionFlag].emoji} [{PRODUCT_CONDITIONS[lbl.conditionFlag].code}] {PRODUCT_CONDITIONS[lbl.conditionFlag].shortLabel}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 text-[10px] font-black border rounded uppercase inline-block whitespace-nowrap bg-emerald-100 text-emerald-950 border-emerald-400">
                                        🟢 [A] APTO
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 border-r border-gray-200">
                                    <span className="font-bold text-[#141414] bg-amber-300 px-1.5 py-0.5 border border-[#141414]/20">
                                      {lbl.lot}
                                    </span>
                                  </td>
                                  <td className="p-2 border-r border-gray-200 text-[#555]">
                                    {lbl.subWarehouse || 'General'}
                                  </td>
                                  <td className="p-2 border-r border-gray-200 text-[#555]">
                                    {lbl.expirationDate || 'N/A'}
                                  </td>
                                  <td className="p-2 border-r border-gray-200 text-[#666]">
                                    {formatSafeDate(lbl.printTimestamp)}
                                  </td>
                                  <td className="p-2 text-right font-black text-[#141414] bg-emerald-50">
                                    {formatSafeWeight(lbl.weight, 2)} {lbl.unit || 'KG'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {stockByProduct.length === 0 && (
                <div className="p-8 text-center bg-white border-2 border-dashed border-[#141414] space-y-1 font-mono">
                  <Box className="w-8 h-8 text-[#888] mx-auto" />
                  <p className="font-bold text-[#141414] text-xs uppercase">Sin stock activo en almacén</p>
                  <p className="text-[11px] text-[#666]">
                    Genere e imprima etiquetas desde la Fase 1 para ingresar productos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Historial de Etiquetas Impresas */}
      {subTab === 'history' && (
        <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141414]/20 pb-2">
            <div>
              <h3 className="font-bold text-sm text-[#141414] uppercase">Historial de Etiquetas ZPL</h3>
              <p className="text-[11px] text-[#666]">Registro completo de impresiones con estado de inventario</p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-[#282828] transition-colors flex items-center gap-1 border border-[#141414]"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filtrar etiqueta, producto, lote o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#141414] text-xs text-[#141414] outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-[#888] absolute left-2.5 top-2.5" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-[#141414] text-xs font-bold text-[#141414] outline-hidden"
            >
              <option value="all">Todos los Estados</option>
              <option value="available">En Stock Activo</option>
              <option value="discharged">Salida Registrada</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[#141414] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-white text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-2 border-r border-[#333]">ID Etiqueta</th>
                  <th className="p-2 border-r border-[#333]">Producto / Código</th>
                  <th className="p-2 border-r border-[#333]">Almacén</th>
                  <th className="p-2 border-r border-[#333]">Bandera</th>
                  <th className="p-2 border-r border-[#333]">Lote</th>
                  <th className="p-2 border-r border-[#333]">Peso</th>
                  <th className="p-2 border-r border-[#333]">Fecha Impresión</th>
                  <th className="p-2 border-r border-[#333]">Estado</th>
                  <th className="p-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/20">
                {filteredLabels.map((l) => (
                  <tr key={l.id} className="hover:bg-[#F0EFEA] transition-colors">
                    <td className="p-2 font-bold text-[#141414]">
                      <div>{l.id}</div>
                      {l.speciesLegend && (
                        <span className="text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded-xs inline-block mt-0.5">
                          {l.speciesLegend}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className="font-bold text-[#141414] block">{l.productName}</span>
                      <span className="text-[10px] text-[#666]">{l.productCode}</span>
                    </td>
                    <td className="p-2">
                      <span className="font-bold px-1.5 py-0.5 text-[10px] uppercase border bg-cyan-100 text-cyan-900 border-cyan-400">
                        ❄️ Congelado
                      </span>
                    </td>
                    <td className="p-2">
                      {l.conditionFlag && PRODUCT_CONDITIONS[l.conditionFlag] ? (
                        <span className={`px-1.5 py-0.5 text-[10px] font-black border rounded uppercase inline-block whitespace-nowrap ${PRODUCT_CONDITIONS[l.conditionFlag].color}`}>
                          {PRODUCT_CONDITIONS[l.conditionFlag].emoji} [{PRODUCT_CONDITIONS[l.conditionFlag].code}] {PRODUCT_CONDITIONS[l.conditionFlag].shortLabel}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-black border rounded uppercase inline-block whitespace-nowrap bg-emerald-100 text-emerald-950 border-emerald-400">
                          🟢 [A] APTO
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className="font-bold text-[#141414] bg-amber-300 px-1 border border-[#141414]/20">
                        {l.lot}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-[#141414]">
                      <div>
                        <span>{formatSafeWeight(l.weight, 2)} {l.unit || 'KG'}</span>
                        {l.tareWeight && l.tareWeight > 0 ? (
                          <span className="block text-[9px] text-amber-900 font-normal">
                            Bruto: {formatSafeWeight(l.grossWeight || (l.weight + l.tareWeight))} | Tara: -{formatSafeWeight(l.tareWeight)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2 text-[10px] text-[#555]">
                      {formatSafeDate(l.printTimestamp)}
                    </td>
                    <td className="p-2">
                      {l.isDischarged ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-400">
                          <CheckCircle2 className="w-3 h-3" /> Salida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-950 border border-emerald-400">
                          <Box className="w-3 h-3" /> En Stock
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            const val = prompt('Ingrese el nuevo folio LBL físico para esta caja:', l.id);
                            if (val && val.trim() && val.trim().toUpperCase() !== l.id.toUpperCase()) {
                              updatePrintedLabelId(l.id, val.trim())
                                .then(() => showToast(`Folio actualizado a ${val.trim()}`))
                                .catch((err: any) => showToast(err.message, 'error'));
                            }
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Corregir o sincronizar folio LBL con la etiqueta física"
                        >
                          <Sliders className="w-3 h-3 text-amber-700" />
                          Folio LBL
                        </button>
                        <button
                          onClick={() => handleReprintLabel(l)}
                          className="px-2 py-1 bg-[#E4E3E0] hover:bg-[#D4D3D0] text-[#141414] border border-[#141414] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Reimprimir en Zebra"
                        >
                          <Printer className="w-3 h-3" /> Reimprimir
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              title: 'Eliminar Etiqueta',
                              message: `¿Está seguro de eliminar del historial la etiqueta "${l.id}" (${l.productName} - ${l.weight} ${l.unit})?`,
                              confirmText: 'Sí, Eliminar Etiqueta',
                              danger: true,
                              onConfirm: () => {
                                deletePrintedLabel(l.id);
                                showToast(`Etiqueta ${l.id} eliminada.`);
                              },
                            });
                          }}
                          className="p-1 bg-white hover:bg-red-100 text-red-700 border border-red-300 text-[10px] font-bold inline-flex items-center cursor-pointer"
                          title="Eliminar Etiqueta del Historial"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLabels.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[#888] text-xs font-mono">
                      Sin registros de etiquetas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Catálogo de Productos */}
      {subTab === 'catalog' && (
        <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141414]/20 pb-2">
            <div>
              <h3 className="font-bold text-sm text-[#141414] uppercase">Catálogo General de Productos</h3>
              <p className="text-[11px] text-[#666]">Administra productos, almacenes predeterminados y parámetros de código de barras</p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-[#282828] transition-colors flex items-center gap-1 border border-[#141414]"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" /> Nuevo Producto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-[#141414] p-3 space-y-2 relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-[#141414] bg-[#E4E3E0] px-1.5 py-0.5 border border-[#141414]/30">
                        {p.code}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase border bg-cyan-100 text-cyan-900 border-cyan-400">
                        ❄️ Congelado
                      </span>
                      {(() => {
                        const matchingCat = categoryCatalog.find((c) => c.name === p.category);
                        const badgeCls = getCategoryBadgeClass(matchingCat?.color);
                        const badgeSty = getCategoryBadgeStyle(matchingCat?.color);
                        return (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-xs ${badgeCls}`}
                            style={badgeSty}
                          >
                            {p.category}
                          </span>
                        );
                      })()}
                    </div>
                    <h4 className="font-bold text-[#141414] text-xs mt-1">{p.name}</h4>
                    <p className="text-[10px] text-[#666] italic">{p.description || 'Sin descripción adicional'}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1 hover:bg-[#E4E3E0] border border-[#141414]/20 text-[#141414]"
                      title="Editar Producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          title: 'Eliminar Producto',
                          message: `¿Está seguro de eliminar el producto "${p.name}" (${p.code}) del catálogo?`,
                          confirmText: 'Sí, Eliminar Producto',
                          danger: true,
                          onConfirm: () => {
                            deleteProduct(p.id);
                            showToast(`Producto "${p.name}" eliminado del catálogo.`);
                          },
                        });
                      }}
                      className="p-1 hover:bg-red-200 border border-red-400 text-red-900 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#141414]/20 pt-2 text-[10px] space-y-0.5 text-[#444]">
                  <p>Unidad: <span className="font-bold text-[#141414]">{p.unit}</span></p>
                  <div className="flex items-center gap-1.5">
                    <span>Especie / Origen:</span>
                    {(() => {
                      const spText = p.speciesLegend || inferProductSpeciesLegend(p, speciesList);
                      const spItem = speciesList.find((s) => s.legend === spText);
                      const spBadgeCls = getSpeciesBadgeClass(spItem?.badgeColor);
                      const spBadgeSty = getSpeciesBadgeStyle(spItem?.badgeColor);
                      return (
                        <span
                          className={`font-bold px-1.5 py-0.2 border rounded-xs ${spBadgeCls}`}
                          style={spBadgeSty}
                        >
                          {spText}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Tara Empaque:</span>
                    {(() => {
                      const tItem = tares.find((t) => t.id === p.tareId || (p.tareNumber !== undefined && t.tareNumber === p.tareNumber));
                      if (!tItem) {
                        return <span className="text-[10px] text-gray-500 italic">Sin tara (0.00 KG)</span>;
                      }
                      return (
                        <span className="font-bold text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-950 border border-amber-400 rounded-xs flex items-center gap-1">
                          <Scale className="w-2.5 h-2.5 text-amber-700" />
                          Tara #{tItem.tareNumber}: -{tItem.weight.toFixed(2)} KG ({tItem.code})
                        </span>
                      );
                    })()}
                  </div>
                  <p>Peso Base: <span className="font-bold text-[#141414]">{p.defaultWeight || 'N/A'}</span></p>
                  <p>Almacén Predeterminado: <span className="font-bold text-[#141414]">{p.warehouse || 'Congelado'}</span></p>
                  <p>Simbología: <span className="font-bold text-[#141414]">{p.barcodeType}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: Catálogo de Sub-Almacenes */}
      {subTab === 'subwarehouses' && (
        <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141414]/20 pb-3">
            <div>
              <h3 className="font-black text-sm text-[#141414] uppercase flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-cyan-600" />
                Catálogo de Sub-Almacenes y Cámaras Frigoríficas
              </h3>
              <p className="text-[11px] text-[#666]">
                Cámaras frigoríficas y antecámaras asignadas a Almacén Congelado ❄️ (PNC)
              </p>
            </div>

            <button
              onClick={handleOpenAddSubModal}
              className="px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-[#282828] transition-colors flex items-center gap-1.5 border border-[#141414]"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Nuevo Sub-Almacén
            </button>
          </div>

          {/* Resumen Estadístico Sub-Almacenes */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div className="bg-white p-2.5 border border-[#141414]">
              <p className="text-[10px] text-[#666] uppercase font-bold">Total Sub-Almacenes</p>
              <p className="text-base font-black text-[#141414]">{subWarehouses.length}</p>
            </div>
            <div className="bg-cyan-50 p-2.5 border border-cyan-300">
              <p className="text-[10px] text-cyan-900 uppercase font-bold flex items-center gap-1">
                <Snowflake className="w-3 h-3 text-cyan-600" /> En Congelado PNC
              </p>
              <p className="text-base font-black text-cyan-950">
                {subWarehouses.filter((s) => s.parentWarehouse === 'Congelado').length}
              </p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414]">
              <p className="text-[10px] text-[#666] uppercase font-bold">Capacidad Instalada</p>
              <p className="text-base font-black text-[#141414]">
                {subWarehouses.reduce((acc, s) => acc + (s.capacityKg || 0), 0).toLocaleString()} KG
              </p>
            </div>
          </div>

          {/* Cards Grid Sub-Almacenes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subWarehouses
              .filter((s) => warehouseFilter === 'all' || s.parentWarehouse === warehouseFilter)
              .map((s) => {
                const labelsInSub = (labels || []).filter((l) => l && !l.isDischarged && l.subWarehouse === s.name);
                const stockKg = labelsInSub.reduce((acc, l) => acc + (Number(l.weight) || 0), 0);

                return (
                  <div
                    key={s.id}
                    className="bg-white border-2 border-[#141414] p-3.5 space-y-2.5 relative shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-1.5 py-0.5">
                            {s.code}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase border bg-cyan-100 text-cyan-900 border-cyan-400">
                            ❄️ Congelado
                          </span>
                        </div>
                        <h4 className="font-extrabold text-[#141414] text-xs">{s.name}</h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSubModal(s)}
                          className="p-1 hover:bg-[#E4E3E0] border border-[#141414] text-[#141414]"
                          title="Editar Sub-Almacén"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              title: 'Eliminar Sub-Almacén',
                              message: `¿Está seguro de eliminar el sub-almacén "${s.name}" (${s.code})?`,
                              confirmText: 'Sí, Eliminar Sub-Almacén',
                              danger: true,
                              onConfirm: () => {
                                deleteSubWarehouse(s.id);
                                showToast(`Sub-almacén "${s.name}" eliminado.`);
                              },
                            });
                          }}
                          className="p-1 hover:bg-red-200 border border-red-400 text-red-900 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#555] line-clamp-2">{s.description || 'Sin descripción'}</p>

                    <div className="border-t border-[#141414]/15 pt-2 text-[10px] space-y-1 text-[#333]">
                      <div className="flex justify-between font-bold">
                        <span>Capacidad Máxima:</span>
                        <span className="text-[#141414]">{(s.capacityKg || 0).toLocaleString()} KG</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Lotes en Stock:</span>
                        <span className="text-amber-700">{labelsInSub.length} cajas ({formatSafeWeight(stockKg, 1)} KG)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SUB-TAB: Catálogo de Categorías */}
      {subTab === 'categories' && (
        <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141414]/20 pb-3">
            <div>
              <h3 className="font-black text-sm text-[#141414] uppercase flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-600" />
                Catálogo de Categorías y Colores Distintivos
              </h3>
              <p className="text-[11px] text-[#666]">
                Clasificación por familias para etiquetado, codificación, filtrado y reportes de almacén
              </p>
            </div>

            <button
              onClick={handleOpenAddCatModal}
              className="px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-black transition-colors flex items-center gap-1.5 border border-[#141414] shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Nueva Categoría
            </button>
          </div>

          {/* Resumen Categorías */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Total Categorías</p>
              <p className="text-base font-black text-[#141414]">{categoryCatalog.length}</p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Productos Registrados</p>
              <p className="text-base font-black text-[#141414]">{products.length} SKU</p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Etiquetas Generadas</p>
              <p className="text-base font-black text-blue-700">{labels.length}</p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Colores Asignados</p>
              <p className="text-base font-black text-emerald-700">
                {categoryCatalog.filter((c) => c.color).length} / {categoryCatalog.length}
              </p>
            </div>
          </div>

          {/* Search bar for categories */}
          <div className="bg-white p-2.5 border border-[#141414] flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              value={catSearchTerm}
              onChange={(e) => setCatSearchTerm(e.target.value)}
              placeholder="Buscar por código, nombre de categoría o descripción..."
              className="w-full text-xs font-mono font-medium outline-hidden bg-transparent"
            />
            {catSearchTerm && (
              <button
                type="button"
                onClick={() => setCatSearchTerm('')}
                className="text-xs text-gray-400 hover:text-black font-bold px-1.5"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Cards Grid Categorías */}
          {(() => {
            const filteredCats = categoryCatalog.filter(
              (c) =>
                c.name.toLowerCase().includes(catSearchTerm.toLowerCase()) ||
                c.code.toLowerCase().includes(catSearchTerm.toLowerCase()) ||
                (c.description || '').toLowerCase().includes(catSearchTerm.toLowerCase())
            );

            if (filteredCats.length === 0) {
              return (
                <div className="bg-white border-2 border-dashed border-[#141414]/30 p-8 text-center space-y-2">
                  <FolderTree className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-[#141414]">No se encontraron categorías</p>
                  <p className="text-[11px] text-[#666]">
                    {catSearchTerm ? 'Intente con otro término de búsqueda' : 'Cree su primera categoría para comenzar'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCats.map((c) => {
                  const prodCount = products.filter((p) => p.category === c.name).length;
                  const labelCount = labels.filter((l) => l.category === c.name).length;
                  const badgeCls = getCategoryBadgeClass(c.color);
                  const badgeSty = getCategoryBadgeStyle(c.color);

                  return (
                    <div
                      key={c.id}
                      className="bg-white border-2 border-[#141414] p-3.5 space-y-2.5 relative shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-1.5 py-0.5">
                                {c.code}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 border rounded-xs uppercase tracking-wide shadow-2xs ${badgeCls}`}
                                style={badgeSty}
                              >
                                {c.name}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-[#141414] text-xs">{c.name}</h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditCatModal(c)}
                              className="p-1.5 hover:bg-[#E4E3E0] border border-[#141414] text-[#141414] transition-colors cursor-pointer"
                              title="Editar Categoría y Color"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Eliminar Categoría',
                                  message: `¿Está seguro de eliminar la categoría "${c.name}" (${c.code})? ${
                                    prodCount > 0
                                      ? `Atención: Existen ${prodCount} productos asociados a esta categoría.`
                                      : ''
                                  }`,
                                  confirmText: 'Sí, Eliminar Categoría',
                                  danger: true,
                                  onConfirm: () => {
                                    deleteCategory(c.id);
                                    showToast(`Categoría "${c.name}" eliminada.`);
                                  },
                                });
                              }}
                              className="p-1.5 hover:bg-red-200 border border-red-400 text-red-900 cursor-pointer transition-colors"
                              title="Eliminar Categoría"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-[#555] line-clamp-2 italic">
                          {c.description || 'Sin descripción asignada'}
                        </p>
                      </div>

                      <div className="border-t border-[#141414]/15 pt-2 text-[10px] space-y-1 text-[#333]">
                        <div className="flex justify-between font-bold">
                          <span>Productos en catálogo:</span>
                          <span className="text-[#141414] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                            {prodCount} SKU
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Etiquetas impresas:</span>
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                            {labelCount} etiquetas
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB: Catálogo de Especies y Origen */}
      {subTab === 'species' && (
        <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141414]/20 pb-3">
            <div>
              <h3 className="font-black text-sm text-[#141414] uppercase flex items-center gap-2">
                <Dna className="w-4 h-4 text-rose-600" />
                Catálogo de Especie / Origen de Producto
              </h3>
              <p className="text-[11px] text-[#666]">
                Gestión de especies, leyendas de rotulación para etiquetas Zebra y país / certificación de origen
              </p>
            </div>

            <button
              onClick={handleOpenAddSpeciesModal}
              className="px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-black transition-colors flex items-center gap-1.5 border border-[#141414] shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Nueva Especie / Origen
            </button>
          </div>

          {/* Resumen Especies */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Total Especies</p>
              <p className="text-base font-black text-[#141414]">{speciesList.length}</p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Origen Nacional / TIF</p>
              <p className="text-base font-black text-emerald-700">
                {speciesList.filter((s) => (s.origin || '').toLowerCase().includes('nacional')).length}
              </p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Origen Importado</p>
              <p className="text-base font-black text-blue-700">
                {speciesList.filter((s) => (s.origin || '').toLowerCase().includes('importado')).length}
              </p>
            </div>
            <div className="bg-white p-2.5 border border-[#141414] shadow-xs">
              <p className="text-[10px] text-[#666] uppercase font-bold">Productos con Leyenda</p>
              <p className="text-base font-black text-amber-700">
                {products.filter((p) => p.speciesLegend).length} / {products.length}
              </p>
            </div>
          </div>

          {/* Search bar for species */}
          <div className="bg-white p-2.5 border border-[#141414] flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              value={speciesSearchTerm}
              onChange={(e) => setSpeciesSearchTerm(e.target.value)}
              placeholder="Buscar por código (ESP-01), nombre, leyenda (%100 CERDO), país u origen..."
              className="w-full text-xs font-mono font-medium outline-hidden bg-transparent"
            />
            {speciesSearchTerm && (
              <button
                type="button"
                onClick={() => setSpeciesSearchTerm('')}
                className="text-xs text-gray-400 hover:text-black font-bold px-1.5"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Cards Grid Species */}
          {(() => {
            const filteredSpecies = speciesList.filter(
              (s) =>
                s.name.toLowerCase().includes(speciesSearchTerm.toLowerCase()) ||
                s.code.toLowerCase().includes(speciesSearchTerm.toLowerCase()) ||
                s.legend.toLowerCase().includes(speciesSearchTerm.toLowerCase()) ||
                (s.origin || '').toLowerCase().includes(speciesSearchTerm.toLowerCase()) ||
                (s.description || '').toLowerCase().includes(speciesSearchTerm.toLowerCase())
            );

            if (filteredSpecies.length === 0) {
              return (
                <div className="bg-white border-2 border-dashed border-[#141414]/30 p-8 text-center space-y-2">
                  <Dna className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-[#141414]">No se encontraron especies / orígenes</p>
                  <p className="text-[11px] text-[#666]">
                    {speciesSearchTerm ? 'Intente con otro término de búsqueda' : 'Cree su primera especie/origen para comenzar'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSpecies.map((s) => {
                  const linkedProducts = products.filter((p) => p.speciesLegend === s.legend);
                  const prodCount = linkedProducts.length;
                  const labelCount = labels.filter((l) => l.speciesLegend === s.legend).length;
                  const badgeCls = getSpeciesBadgeClass(s.badgeColor);
                  const badgeSty = getSpeciesBadgeStyle(s.badgeColor);

                  return (
                    <div
                      key={s.id}
                      className="bg-white border-2 border-[#141414] p-3.5 space-y-2.5 relative shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Top Code & Action Buttons */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-1.5 py-0.5">
                                {s.code}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 border rounded-xs uppercase tracking-wide shadow-2xs ${badgeCls}`}
                                style={badgeSty}
                              >
                                {s.name}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-[#141414] text-xs">{s.name}</h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditSpeciesModal(s)}
                              className="p-1.5 hover:bg-[#E4E3E0] border border-[#141414] text-[#141414] transition-colors cursor-pointer"
                              title="Editar Especie / Origen"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Eliminar Especie / Origen',
                                  message: `¿Está seguro de eliminar la especie "${s.name}" (${s.code}) con leyenda "${s.legend}"? ${
                                    prodCount > 0
                                      ? `Atención: Existen ${prodCount} productos asociados a esta leyenda.`
                                      : ''
                                  }`,
                                  confirmText: 'Sí, Eliminar Especie',
                                  danger: true,
                                  onConfirm: () => {
                                    deleteSpecies(s.id);
                                    showToast(`Especie "${s.name}" eliminada.`);
                                  },
                                });
                              }}
                              className="p-1.5 hover:bg-red-200 border border-red-400 text-red-900 cursor-pointer transition-colors"
                              title="Eliminar Especie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Zebra Label Box Preview */}
                        <div className="bg-amber-50/70 border border-amber-300 p-2 text-xs flex items-center justify-between gap-2">
                          <span className="text-[10px] text-amber-900 font-bold uppercase flex items-center gap-1">
                            <Tag className="w-3 h-3 text-amber-700" />
                            Leyenda Zebra:
                          </span>
                          <span className="bg-[#141414] text-amber-300 px-2 py-0.5 font-mono font-black text-xs uppercase border border-amber-500 tracking-wider">
                            {s.legend}
                          </span>
                        </div>

                        {/* Origin tag */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#444]">
                          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-[#141414]">{s.origin || 'Nacional'}</span>
                        </div>

                        <p className="text-[11px] text-[#555] line-clamp-2 italic">
                          {s.description || 'Sin descripción o notas asignadas'}
                        </p>
                      </div>

                      <div className="border-t border-[#141414]/15 pt-2 text-[10px] space-y-1 text-[#333]">
                        <div className="flex justify-between font-bold">
                          <span>Productos asociados:</span>
                          <span className="text-[#141414] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                            {prodCount} SKU
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Etiquetas impresas:</span>
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                            {labelCount} etiquetas
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 4: Reportes y Estadísticas */}
      {subTab === 'reports' && (
        <div className="space-y-4 font-mono">
          <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-4">
            <div className="border-b border-[#141414]/20 pb-2">
              <h3 className="font-bold text-sm text-[#141414] uppercase">Reporte Ejecutivo ZPL</h3>
              <p className="text-[11px] text-[#666]">Análisis de producción de etiquetas y rotación de productos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Report Card 1: Production by Category */}
              <div className="bg-white p-3 border border-[#141414] space-y-2">
                <h4 className="font-bold text-[#141414] text-xs flex items-center gap-1.5 uppercase">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  Producción de Etiquetas por Categoría
                </h4>
                <div className="space-y-2">
                  {categories.filter(c => c !== 'Todos').map((cat) => {
                    const count = labels.filter((l) => l.category === cat).length;
                    const percent = labels.length ? Math.round((count / labels.length) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-[#141414]">
                          <span>{cat}</span>
                          <span>{count} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-[#E4E3E0] border border-[#141414]/30 overflow-hidden">
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Report Card 2: Discharge Reasons */}
              <div className="bg-white p-3 border border-[#141414] space-y-2">
                <h4 className="font-bold text-[#141414] text-xs flex items-center gap-1.5 uppercase">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  Salidas de Inventario por Motivo
                </h4>
                <div className="space-y-2">
                  {['Despacho Producción', 'Venta', 'Transferencia', 'Merma / Vencimiento'].map((reason) => {
                    const count = discharges.filter((d) => d.reason === reason).length;
                    const percent = discharges.length ? Math.round((count / discharges.length) * 100) : 0;
                    return (
                      <div key={reason} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-[#141414]">
                          <span>{reason}</span>
                          <span>{count} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-[#E4E3E0] border border-[#141414]/30 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/70 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white border-2 border-[#141414] w-full max-w-lg overflow-hidden font-mono text-[#141414]">
            <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase">
                {editingProduct ? 'Editar Producto SKU' : 'Crear Nuevo Producto SKU'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 hover:bg-[#282828] text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-[#141414] uppercase">Código SKU (5 Dígitos) *</label>
                    <button
                      type="button"
                      onClick={() => setProdCode(generateNextProductCode(products.map((p) => p.code)))}
                      className="text-[10px] font-mono text-amber-800 underline font-bold"
                    >
                      Generar 12-345
                    </button>
                  </div>
                  <input
                    type="text"
                    value={prodCode}
                    onChange={(e) => setProdCode(handleProductCodeInputMask(e.target.value))}
                    required
                    placeholder="12-345"
                    maxLength={6}
                    className="w-full px-2.5 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden font-mono"
                  />
                  <p className="text-[9px] text-[#666] font-mono mt-0.5">Formato requerido: 5 dígitos (ej. 12-345)</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-[#141414] uppercase">Categoría *</label>
                    <button
                      type="button"
                      onClick={handleOpenAddCatModal}
                      className="text-[10px] font-mono text-amber-900 underline font-bold flex items-center gap-0.5 hover:text-black cursor-pointer"
                      title="Crear nueva categoría y asignar color"
                    >
                      <Plus className="w-3 h-3" /> + Nueva
                    </button>
                  </div>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden"
                  >
                    {categoryCatalog.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Nombre Producto *</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                  placeholder="ej. Carne de Res Molida 80/20"
                  className="w-full px-2.5 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Unidad</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden"
                  >
                    <option value="KG">KG</option>
                    <option value="LB">LB</option>
                    <option value="CAJA">CAJA</option>
                    <option value="PZA">PZA</option>
                    <option value="L">L</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Peso Base (Mayor a 0 KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={prodWeight}
                    onChange={(e) => setProdWeight(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Almacén Principal (PNC)</label>
                  <div className="w-full px-2 py-1.5 bg-[#E4E3E0] border border-[#141414] font-bold text-xs text-[#141414] flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-700" />
                    <span>❄️ Congelado (Exclusivo PNC)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Sub-Almacén / Cámara</label>
                  <select
                    value={prodSubWarehouse}
                    onChange={(e) => setProdSubWarehouse(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden"
                  >
                    <option value="">-- Seleccionar --</option>
                    {subWarehouses
                      .filter((s) => s.parentWarehouse === prodWarehouse)
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Leyenda de Especie individual por artículo vinculada al catálogo de Especies */}
              <div className="space-y-1.5 p-2.5 bg-[#F0EFEA] border border-[#141414]/25">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-[#141414] uppercase flex items-center gap-1">
                    <Dna className="w-3.5 h-3.5 text-rose-600" />
                    Leyenda de Especie / Origen *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductModalOpen(false);
                      handleOpenAddSpeciesModal();
                    }}
                    className="text-[9px] text-amber-800 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> + Nueva Especie
                  </button>
                </div>

                <div className="flex gap-2">
                  <select
                    value={prodSpeciesLegend}
                    onChange={(e) => setProdSpeciesLegend(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-white border border-[#141414] font-bold text-xs outline-hidden"
                  >
                    <option value="">-- Seleccionar de Catálogo --</option>
                    {speciesList.map((sp) => (
                      <option key={sp.id} value={sp.legend}>
                        {sp.name} ({sp.legend})
                      </option>
                    ))}
                    <option value="CUSTOM">Otro / Texto Libre...</option>
                  </select>

                  <input
                    type="text"
                    value={prodSpeciesLegend}
                    onChange={(e) => setProdSpeciesLegend(e.target.value.toUpperCase())}
                    placeholder="ej. %100 CERDO, %100 RES..."
                    className="w-1/2 px-2.5 py-1.5 bg-white border border-[#141414] font-bold outline-hidden uppercase text-xs"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[9px] text-[#555] font-bold">Desde Catálogo:</span>
                  {speciesList.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setProdSpeciesLegend(sp.legend)}
                      className={`text-[9px] px-1.5 py-0.5 border cursor-pointer transition-colors ${
                        prodSpeciesLegend.trim().toUpperCase() === sp.legend.toUpperCase()
                          ? 'bg-amber-400 font-black border-black text-black'
                          : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                      title={`${sp.name} - ${sp.origin || 'Nacional'}`}
                    >
                      {sp.legend}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setProdSpeciesLegend('')}
                    className="text-[9px] px-1.5 py-0.5 border border-dashed border-gray-400 text-gray-500 hover:text-black"
                  >
                    Sin leyenda
                  </button>
                </div>
                <p className="text-[9px] text-[#666] leading-tight">
                  Se asigna de forma fija a este artículo. En el módulo de etiquetado se cargará automáticamente sin requerir configuración manual.
                </p>
              </div>

              {/* Asignación de Tara de Empaque Predeterminada */}
              <div className="space-y-1.5 p-2.5 bg-amber-50/80 border border-amber-300">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-[#141414] uppercase flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-amber-700" />
                    Tara de Empaque Predeterminada (Descuento de Peso en Báscula)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-amber-950 bg-amber-200 px-1.5 py-0.5 border border-amber-400">
                    {prodTareId ? `-${(tares.find((t) => t.id === prodTareId)?.weight || 0).toFixed(2)} KG` : 'Sin tara (0.00 KG)'}
                  </span>
                </div>

                <select
                  value={prodTareId}
                  onChange={(e) => setProdTareId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-bold text-xs outline-hidden"
                >
                  <option value="">-- Sin Tara Predeterminada (Descuento 0.00 KG) --</option>
                  {tares.map((t) => (
                    <option key={t.id} value={t.id}>
                      Tara #{t.tareNumber}: {t.code} — {t.name} (-{t.weight.toFixed(2)} {t.unit || 'KG'})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-[#666] leading-tight">
                  Al pesar este producto en la estación Torrey, el sistema descontará automáticamente los kilogramos de esta tara del peso total para generar la etiqueta con el peso neto.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Simbología de Código</label>
                <select
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-[#F8F7F4] border border-[#141414] font-bold outline-hidden"
                >
                  <option value="QRCode">QR Code (2D Matriz Estandarizada)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#141414]/20">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 font-bold text-[#141414] border border-transparent hover:border-[#141414]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#141414] text-white font-bold uppercase hover:bg-[#282828]"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear/Editar Sub-Almacén */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-mono">
          <div className="bg-[#F8F7F4] border-2 border-[#141414] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-[#141414] text-white p-3 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase flex items-center gap-1.5">
                <WarehouseIcon className="w-4 h-4 text-cyan-400" />
                {editingSub ? 'Editar Sub-Almacén' : 'Nuevo Sub-Almacén / Cámara'}
              </h3>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="p-1 hover:bg-[#282828] text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubWarehouse} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Código *</label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-bold outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Almacén Padre *</label>
                  <div className="w-full px-2.5 py-1.5 bg-[#E4E3E0] border border-[#141414] font-bold text-xs text-[#141414] flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-700" />
                    <span>❄️ Congelado (Exclusivo PNC)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Nombre Sub-Almacén / Cámara *</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                  placeholder="ej. Cámara 1 - Congelados Principales"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Descripción / Pasillo / Rejilla</label>
                <textarea
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  rows={2}
                  placeholder="Detalles de temperatura, estantería o zona de carga..."
                  className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-medium outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">Capacidad Máxima Estimada (KG)</label>
                <input
                  type="number"
                  value={subCap}
                  onChange={(e) => setSubCap(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#141414] font-bold outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#141414]/20">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-3 py-1.5 font-bold text-[#141414] border border-transparent hover:border-[#141414]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#141414] text-white font-bold uppercase hover:bg-[#282828]"
                >
                  Guardar Sub-Almacén
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear/Editar Categoría con Selector y Asignación de Color */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categoryToEdit={editingCat}
        existingCategories={categoryCatalog}
        productCount={products.filter((p) => p.category === editingCat?.name).length}
        labelCount={labels.filter((l) => l.category === editingCat?.name).length}
        onSave={handleSaveCategoryModal}
      />

      {/* MODAL: Crear/Editar Especie y Origen */}
      <SpeciesManagerModal
        isOpen={isSpeciesModalOpen}
        onClose={() => setIsSpeciesModalOpen(false)}
        speciesToEdit={editingSpecies}
        existingSpecies={speciesList}
        productCount={products.filter((p) => p.speciesLegend === editingSpecies?.legend).length}
        labelCount={labels.filter((l) => l.speciesLegend === editingSpecies?.legend).length}
        onSave={handleSaveSpeciesModal}
      />

      {/* In-App Confirmation Modal */}
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {/* Transient Action Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xs border-2 shadow-xl font-mono text-xs font-bold flex items-center gap-2 ${
              toastMessage.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-500'
                : 'bg-[#141414] text-white border-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const Phase2InventoryAdmin: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Error al cargar Fase 2: Administración de Inventario">
      <Phase2InventoryAdminContent />
    </ErrorBoundary>
  );
};
