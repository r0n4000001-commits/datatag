import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Product, Warehouse, ProductConditionFlag, PRODUCT_CONDITIONS, PrintedLabel } from '../types';
import { generateZplCode } from '../utils/zplGenerator';
import { generateCompactBarcodePayload } from '../utils/barcodeFormat';
import { getNextLabelFolio } from '../utils/labelFolio';
import { getDailyLotCode } from '../utils/productAndLotUtils';
import { getCategoryBadgeClass, getCategoryBadgeStyle } from '../utils/categoryUtils';
import {
  inferProductSpeciesLegend,
  getSpeciesBadgeClass,
  getSpeciesBadgeStyle,
} from '../utils/speciesUtils';
import { BarcodeRenderer } from './BarcodeRenderer';
import { SimulatedLabelCanvas } from './SimulatedLabelCanvas';
import { TorreyScaleWidget } from './TorreyScaleWidget';
import { ProductFlagModal } from './ProductFlagModal';
import { ConditionExpirationModal } from './ConditionExpirationModal';
import { SpeciesCatalogModal } from './SpeciesCatalogModal';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Calendar,
  Layers,
  Scale,
  Sparkles,
  Wifi,
  FileCode,
  Tag,
  PlusCircle,
  Search,
  Snowflake,
  Sun,
  Sliders,
  X,
  PackageCheck,
  ArrowRight,
  Zap,
  AlertCircle,
  ShieldAlert,
  Laptop,
  RotateCcw,
  MapPin,
  CalendarClock,
  Clock,
  Dna,
  Save,
  Barcode,
} from 'lucide-react';

interface Props {
  onOpenFormatEditor?: () => void;
}

export const Phase1LabelCreation: React.FC<Props> = ({ onOpenFormatEditor }) => {
  const {
    products,
    labels,
    subWarehouses,
    categories: categoryCatalog,
    printerConfig,
    localPrinterConfig,
    labelFormatConfig,
    updateLabelFormatConfig,
    saveLabelDesignPermanently,
    systemUsers,
    activeUser,
    addPrintedLabel,
    checkPrinterConnection,
    conditionExpirationConfig,
    calculateExpirationDate,
    speciesList,
    addSpecies,
    updateSpecies,
    deleteSpecies,
    updateProduct,
    tares,
    assignTareToProduct,
  } = useInventory();

  // Modal for species and tares catalog
  const [isSpeciesModalOpen, setIsSpeciesModalOpen] = useState(false);
  const [speciesModalTab, setSpeciesModalTab] = useState<'species' | 'tares'>('species');
  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState('Todos');

  // Packaging Tare Selection & Discount State
  const [selectedTareId, setSelectedTareId] = useState<string | null>(null);
  const [isAssigningTareToProd, setIsAssigningTareToProd] = useState<boolean>(false);
  const [tareAssignSuccess, setTareAssignSuccess] = useState<boolean>(false);

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ''
  );

  // Active reprint label override (when user clicks "Reimprimir Última Etiqueta Registrada")
  const [reprintLabelOverride, setReprintLabelOverride] = useState<PrintedLabel | null>(null);
  const [isReprinting, setIsReprinting] = useState<boolean>(false);
  // Immutable label snapshot currently being sent to print dialog (guarantees paper matches database 100%)
  const [currentlyPrintingLabel, setCurrentlyPrintingLabel] = useState<PrintedLabel | null>(null);

  // Form inputs
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  // 1. Almacén Destino
  const [warehouse, setWarehouse] = useState<Warehouse>(selectedProduct?.warehouse || 'Congelado');

  // Sub-warehouses for selected warehouse
  const availableSubWarehouses = useMemo(
    () => subWarehouses.filter((s) => s.parentWarehouse === warehouse),
    [subWarehouses, warehouse]
  );

  const [selectedSubWarehouse, setSelectedSubWarehouse] = useState<string>(() => {
    const matching = subWarehouses.filter((s) => s.parentWarehouse === (selectedProduct?.warehouse || 'Congelado'));
    return matching[0]?.name || '';
  });

  // 2. Fecha de Expiración y Lote (El lote corresponde a la fecha del día en formato DDMMAA, ej: 040926)
  const [lot, setLot] = useState<string>(() => getDailyLotCode());

  // Cada día el lote corresponde a la fecha del día actual
  useEffect(() => {
    const syncDailyLot = () => {
      const todayCode = getDailyLotCode();
      setLot((prev) => {
        // If not set, or if it is a 6-digit lot matching a previous day's date, update to today's date
        if (!prev || (/^\d{6}$/.test(prev) && prev !== todayCode)) {
          return todayCode;
        }
        return prev;
      });
    };
    syncDailyLot();
    const interval = setInterval(syncDailyLot, 60000);
    return () => clearInterval(interval);
  }, []);

  const [hasExpiration, setHasExpiration] = useState<boolean>(true);
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    return calculateExpirationDate('A', new Date());
  });
  const [isExpirationModalOpen, setIsExpirationModalOpen] = useState(false);

  // 2.5 Domicilio / Destino / Planta
  const [domicilio, setDomicilio] = useState<string>(() => labelFormatConfig.addressText || 'DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000');
  const [domicilioSavedFeedback, setDomicilioSavedFeedback] = useState<boolean>(false);

  // Synchronize domicilio whenever labelFormatConfig.addressText is updated from Firestore or editor
  useEffect(() => {
    if (labelFormatConfig.addressText && !reprintLabelOverride) {
      setDomicilio(labelFormatConfig.addressText);
    }
  }, [labelFormatConfig.addressText, reprintLabelOverride]);

  const handleSaveDomicilioToDefault = async () => {
    updateLabelFormatConfig({ addressText: domicilio });
    await saveLabelDesignPermanently({ ...labelFormatConfig, addressText: domicilio });
    setDomicilioSavedFeedback(true);
    setTimeout(() => setDomicilioSavedFeedback(false), 3000);
  };

  // Leyenda de Especie / Identificador (%100 CERDO, %100 RES, %100 POLLO, etc.)
  // Configurada individualmente por artículo y ajustable al vuelo en la estación de pesaje
  const [selectedSpeciesOverride, setSelectedSpeciesOverride] = useState<string | null>(null);
  const [isSavingSpeciesToProduct, setIsSavingSpeciesToProduct] = useState(false);
  const [speciesSaveSuccess, setSpeciesSaveSuccess] = useState(false);

  const activeSpecies = useMemo(() => {
    if (reprintLabelOverride?.speciesLegend) {
      return reprintLabelOverride.speciesLegend;
    }
    if (selectedSpeciesOverride) {
      return selectedSpeciesOverride;
    }
    return inferProductSpeciesLegend(selectedProduct, speciesList);
  }, [reprintLabelOverride, selectedSpeciesOverride, selectedProduct, speciesList]);

  const handleSaveSpeciesToProduct = (speciesToSave: string) => {
    if (!selectedProduct) return;
    setIsSavingSpeciesToProduct(true);
    updateProduct({
      ...selectedProduct,
      speciesLegend: speciesToSave,
    });
    setSpeciesSaveSuccess(true);
    setTimeout(() => {
      setIsSavingSpeciesToProduct(false);
      setSpeciesSaveSuccess(false);
    }, 2500);
  };

  // 3. Báscula Torrey
  const [weight, setWeight] = useState<number>(0.0);
  const latestScaleWeightRef = useRef<number>(0.0);
  const [minWeight, setMinWeight] = useState<number>(() => {
    const saved = localStorage.getItem('torrey_min_weight');
    return saved ? parseFloat(saved) : 0.50;
  });

  const handleMinWeightChange = (newMin: number) => {
    setMinWeight(newMin);
    localStorage.setItem('torrey_min_weight', String(newMin));
  };

  const handleCaptureScaleWeightNow = () => {
    const val = latestScaleWeightRef.current;
    if (val > 0) {
      setWeight(val);
      setStatusMessage(`Peso ${val.toFixed(2)} KG capturado manualmente de la báscula Torrey.`);
    } else {
      setStatusMessage('⚠️ La báscula no registra un peso activo mayor a 0.00 KG.');
    }
  };

  // Synchronize assigned tare whenever selected product changes
  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.tareId) {
        setSelectedTareId(selectedProduct.tareId);
      } else if (selectedProduct.tareNumber !== undefined) {
        const found = tares.find((t) => t.tareNumber === selectedProduct.tareNumber);
        setSelectedTareId(found ? found.id : null);
      } else {
        setSelectedTareId(null);
      }
    }
  }, [selectedProduct, tares]);

  // Active tare item
  const activeTare = useMemo(() => {
    if (!selectedTareId) return null;
    return tares.find((t) => t.id === selectedTareId) || null;
  }, [selectedTareId, tares]);

  // Amount in KG to deduct
  const tareWeight = activeTare ? Number(activeTare.weight) || 0 : 0;

  // Net weight = max(0, grossWeight - tareWeight)
  // 'weight' stores the gross reading directly from the Torrey scale
  const netWeight = useMemo(() => {
    if (weight <= 0) return 0;
    return Math.max(0, parseFloat((weight - tareWeight).toFixed(2)));
  }, [weight, tareWeight]);

  // Action to assign currently chosen tare permanently to the selected product
  const handleAssignCurrentTareToProduct = () => {
    if (!selectedProduct) return;
    setIsAssigningTareToProd(true);
    if (selectedTareId) {
      assignTareToProduct(selectedProduct.id, selectedTareId);
    } else {
      assignTareToProduct(selectedProduct.id, null);
    }
    setTareAssignSuccess(true);
    setTimeout(() => {
      setIsAssigningTareToProd(false);
      setTareAssignSuccess(false);
    }, 2500);
  };

  // 4. Copias y búsqueda
  const [copies, setCopies] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Flag modal state
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [pendingPrintTarget, setPendingPrintTarget] = useState<'zebra' | 'local'>('local');
  const [selectedConditionFlag, setSelectedConditionFlag] = useState<ProductConditionFlag>('A');

  // Print error modal state
  const [showPrintErrorModal, setShowPrintErrorModal] = useState(false);
  const [printErrorMessage, setPrintErrorMessage] = useState('');

  // UI state
  const [showZplCode, setShowZplCode] = useState(false);
  const [labelaryImageUrl, setLabelaryImageUrl] = useState<string | null>(null);
  const [isLoadingLabelary, setIsLoadingLabelary] = useState(false);
  const [copiedZpl, setCopiedZpl] = useState(false);
  const [showWeightWarningModal, setShowWeightWarningModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);

  // Print execution state
  const [printStatus, setPrintStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Watchdog: Si printStatus se queda en 'sending' por más de 5 segundos, recuperar automáticamente a 'idle'
  useEffect(() => {
    if (printStatus === 'sending') {
      const timer = setTimeout(() => {
        setPrintStatus((current) => {
          if (current === 'sending') {
            console.warn('Watchdog: printStatus permaneció en sending por 5s, restableciendo a idle');
            setStatusMessage('⚠️ La solicitud de impresión finalizó. El botón ha sido reactivado para continuar operando.');
            return 'idle';
          }
          return current;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [printStatus]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Species filter options
  const speciesOptions = useMemo(() => {
    const legends = speciesList.map((s) => s.legend);
    return ['Todos', ...Array.from(new Set(legends))];
  }, [speciesList]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.code.toLowerCase().includes(searchFilter.toLowerCase());
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const resolvedProdSpecies = p.speciesLegend || inferProductSpeciesLegend(p, speciesList);
      const matchSpecies =
        selectedSpeciesFilter === 'Todos' || resolvedProdSpecies === selectedSpeciesFilter;
      return matchSearch && matchCat && matchSpecies;
    });
  }, [products, searchFilter, selectedCategory, selectedSpeciesFilter, speciesList]);

  // Handle product selection change
  const handleProductSelect = (p: Product) => {
    setReprintLabelOverride(null);
    setSelectedProductId(p.id);
    setSelectedSpeciesOverride(null);
    if (p.warehouse) {
      setWarehouse(p.warehouse);
    }
  };

  // Folio único consecutivo para la siguiente caja a imprimir (Garantiza trazabilidad 1 a 1 por caja)
  const [currentFolioId, setCurrentFolioId] = useState<string>(() => getNextLabelFolio(labels));

  // Mantener el folio actualizado si se registran nuevas etiquetas en la base de datos
  useEffect(() => {
    if (labels && labels.some((l) => l.id.toUpperCase() === currentFolioId.toUpperCase())) {
      setCurrentFolioId(getNextLabelFolio(labels, currentFolioId));
    }
  }, [labels, currentFolioId]);

  const activeLabelId = reprintLabelOverride ? reprintLabelOverride.id : currentFolioId;
  const currentTimestamp = useMemo(() => new Date().toISOString(), []);

  const { zpl, payload } = useMemo(() => {
    if (!selectedProduct) return { zpl: '', payload: '' };
    const activeLot = reprintLabelOverride ? reprintLabelOverride.lot : lot;
    const activeWeight = reprintLabelOverride ? reprintLabelOverride.weight : netWeight;
    const activeWarehouse = reprintLabelOverride ? reprintLabelOverride.warehouse : warehouse;
    const activeFlag = reprintLabelOverride ? (reprintLabelOverride.conditionFlag || 'A') : selectedConditionFlag;
    const activeExpDate = reprintLabelOverride ? reprintLabelOverride.expirationDate : (hasExpiration ? expirationDate : undefined);
    const activeAddress = reprintLabelOverride ? reprintLabelOverride.domicilio : domicilio;
    const activeTs = reprintLabelOverride ? reprintLabelOverride.printTimestamp : new Date().toISOString();

    return generateZplCode(
      {
        id: activeLabelId,
        product: selectedProduct,
        lot: activeLot,
        weight: activeWeight,
        grossWeight: reprintLabelOverride ? (reprintLabelOverride.grossWeight || reprintLabelOverride.weight) : weight,
        tareWeight: reprintLabelOverride ? reprintLabelOverride.tareWeight : (tareWeight > 0 ? tareWeight : undefined),
        tareNumber: reprintLabelOverride ? reprintLabelOverride.tareNumber : activeTare?.tareNumber,
        unit: selectedProduct.unit,
        warehouse: activeWarehouse,
        conditionFlag: activeFlag,
        expirationDate: activeExpDate,
        domicilio: activeAddress,
        speciesLegend: activeSpecies,
        timestamp: activeTs,
      },
      printerConfig,
      labelFormatConfig
    );
  }, [selectedProduct, lot, netWeight, weight, tareWeight, activeTare, warehouse, selectedConditionFlag, hasExpiration, expirationDate, domicilio, activeSpecies, printerConfig, labelFormatConfig, currentFolioId, reprintLabelOverride]);

  // Auto-generate lot helper: Establece el lote con la fecha del día (DDMMAA, ej. 040926)
  const handleGenerateDailyLot = () => {
    setReprintLabelOverride(null);
    const todayLot = getDailyLotCode();
    setLot(todayLot);
  };

  // Copy ZPL code to clipboard
  const handleCopyZpl = () => {
    navigator.clipboard.writeText(zpl);
    setCopiedZpl(true);
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  // Fetch real Zebra render from Labelary API proxy
  const handleFetchLabelaryPreview = async () => {
    setIsLoadingLabelary(true);
    try {
      const res = await fetch('/api/zebra/labelary-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zpl,
          width: labelFormatConfig.widthInches || printerConfig.widthInches || 4,
          height: labelFormatConfig.heightInches || printerConfig.heightInches || 3,
          dpmm: (labelFormatConfig.dpi || printerConfig.dpi) === 300 ? 12 : 8,
        }),
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setLabelaryImageUrl(data.imageUrl);
      } else {
        alert(data.error || 'No se pudo generar la imagen de vista previa Labelary.');
      }
    } catch (err: any) {
      alert('Error conectando con el servicio de vista previa: ' + err.message);
    } finally {
      setIsLoadingLabelary(false);
    }
  };

  // Validation before sending print job
  const validateBeforePrint = (activeRawWeight: number = weight): boolean => {
    if (!selectedProduct) {
      setPrintStatus('error');
      setStatusMessage('⚠️ Por favor seleccione o ingrese un código de producto válido.');
      return false;
    }

    if (!activeRawWeight || activeRawWeight <= 0 || isNaN(activeRawWeight)) {
      setPrintStatus('error');
      setStatusMessage('⚠️ ADVERTENCIA: No hay peso en la báscula para generar la etiqueta.');
      setShowWeightWarningModal(true);
      return false;
    }

    const calculatedNet = Math.max(0, parseFloat((activeRawWeight - tareWeight).toFixed(2)));

    if (calculatedNet <= 0) {
      setPrintStatus('error');
      setStatusMessage(
        `⚠️ ADVERTENCIA: La tara de empaque descontada (${tareWeight.toFixed(2)} KG) es mayor o igual al peso bruto de la báscula (${activeRawWeight.toFixed(2)} KG). El peso neto resultante es 0.00 KG.`
      );
      setShowWeightWarningModal(true);
      return false;
    }

    if (minWeight > 0 && calculatedNet < minWeight) {
      setPrintStatus('error');
      setStatusMessage(
        `⚠️ ADVERTENCIA: El peso neto final (${calculatedNet.toFixed(2)} KG tras descontar tara de ${tareWeight.toFixed(2)} KG) es inferior al peso mínimo requerido (${minWeight.toFixed(2)} KG). No se permite imprimir.`
      );
      setShowWeightWarningModal(true);
      return false;
    }

    return true;
  };

  // Determine the most recently registered label in inventory
  const lastRegisteredLabel = useMemo(() => {
    if (!labels || labels.length === 0) return null;
    return [...labels].sort((a, b) => new Date(b.printTimestamp).getTime() - new Date(a.printTimestamp).getTime())[0];
  }, [labels]);

  // Open flag modal & preview dialog to confirm re-printing the last registered label
  const handleReprintLastLabel = () => {
    if (!lastRegisteredLabel) return;

    const targetProduct = products.find(
      (p) => p.id === lastRegisteredLabel.productId || p.code === lastRegisteredLabel.productCode
    ) || {
      id: lastRegisteredLabel.productId,
      code: lastRegisteredLabel.productCode,
      name: lastRegisteredLabel.productName,
      category: lastRegisteredLabel.category,
      unit: lastRegisteredLabel.unit || 'KG',
    };

    setReprintLabelOverride(lastRegisteredLabel);
    setIsReprinting(true);
    setSelectedProductId(targetProduct.id);
    setWeight(lastRegisteredLabel.weight);
    setLot(lastRegisteredLabel.lot);
    setWarehouse(lastRegisteredLabel.warehouse);
    setSelectedConditionFlag(lastRegisteredLabel.conditionFlag || 'A');
    if (lastRegisteredLabel.expirationDate) {
      setHasExpiration(true);
      setExpirationDate(lastRegisteredLabel.expirationDate);
    }
    setPendingPrintTarget('local');
    setShowFlagModal(true);
  };

  // Open flag modal before printing a new label to Local Printer
  const handlePrintToLocalPrinter = () => {
    setReprintLabelOverride(null);
    setIsReprinting(false);
    // Capture weight from scale at exact moment of pressing print
    const activeWeight = latestScaleWeightRef.current > 0 ? latestScaleWeightRef.current : weight;
    if (activeWeight > 0 && activeWeight !== weight) {
      setWeight(activeWeight);
    }
    if (!validateBeforePrint(activeWeight)) return;
    setPendingPrintTarget('local');
    setShowFlagModal(true);
  };

  // Confirm flag selection and execute print immediately
  const handleConfirmFlagAndPrint = (conditionFlag: ProductConditionFlag) => {
    if (isReprinting && reprintLabelOverride) {
      const activeFlag = reprintLabelOverride.conditionFlag || 'A';
      setSelectedConditionFlag(activeFlag);
      setShowFlagModal(false);
      executeReprint(activeFlag);
    } else {
      setSelectedConditionFlag(conditionFlag);
      // Auto calculate expiration date for confirmed condition flag: Print Date + configured days
      const calculatedExpDate = calculateExpirationDate(conditionFlag, new Date());
      setExpirationDate(calculatedExpDate);
      setShowFlagModal(false);
      executePrintToLocalPrinter(conditionFlag, calculatedExpDate);
    }
  };

  // Execute re-printing of 1 copy of the last registered label using selected condition flag
  const executeReprint = async (conditionFlag: ProductConditionFlag) => {
    if (!reprintLabelOverride) return;
    const activeLabel = reprintLabelOverride;
    const targetProduct: Product = products.find(
      (p) => p.id === activeLabel.productId || p.code === activeLabel.productCode
    ) || {
      id: activeLabel.productId,
      code: activeLabel.productCode,
      name: activeLabel.productName,
      category: activeLabel.category,
      unit: (activeLabel.unit as any) || 'KG',
      warehouse: 'Congelado',
      reorderPoint: 0,
      barcodeType: 'QRCode',
    };

    setPrintStatus('sending');

    const printerDisplayName = localPrinterConfig.printerName || 'Impresora Local';
    setStatusMessage(`🔄 Reimprimiendo 1 copia de etiqueta [${activeLabel.id}] con Bandera [${conditionFlag}] en [${printerDisplayName}]...`);

    try {
      // 1. Web Serial Direct USB
      if (localPrinterConfig.connectionType === 'web_serial' && 'serial' in navigator) {
        try {
          const { zpl: printZpl } = generateZplCode(
            {
              id: activeLabel.id,
              product: targetProduct,
              lot: activeLabel.lot,
              weight: activeLabel.weight,
              unit: activeLabel.unit || 'KG',
              warehouse: activeLabel.warehouse,
              conditionFlag,
              expirationDate: activeLabel.expirationDate,
              domicilio: activeLabel.domicilio,
              speciesLegend: activeLabel.speciesLegend,
              timestamp: activeLabel.printTimestamp,
            },
            printerConfig,
            labelFormatConfig
          );

          const portsPromise = (navigator as any).serial.getPorts();
          const timeoutPromise = new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado buscando puertos USB/Serie')), 3000)
          );
          const ports = await Promise.race([portsPromise, timeoutPromise]);

          if (ports && ports.length > 0) {
            const port = ports[0];
            await port.open({ baudRate: 9600 });
            const writer = port.writable.getWriter();
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(printZpl));
            writer.releaseLock();
            await port.close();

            setPrintStatus('success');
            setStatusMessage(`✅ [USB/Serie Directo] Reimpresión de 1 copia enviada correctamente para etiqueta [${activeLabel.id}].`);
            setIsReprinting(false);
            setTimeout(() => {
              setPrintStatus((s) => (s === 'success' ? 'idle' : s));
            }, 3000);
            return;
          }
        } catch (serialErr: any) {
          console.warn('Fallo Web Serial en reimpresión:', serialErr);
        }
      }

      // 2. Direct Browser System Driver Print (Local Printer, 1 copy)
      setCurrentlyPrintingLabel(activeLabel);
      setTimeout(() => {
        const prevTitle = document.title;
        try {
          document.title = `${printerDisplayName}_Reimpresion_${activeLabel.id}`;
          window.print();
          setPrintStatus('success');
          setStatusMessage(`✅ Diálogo de impresión abierto: Reimprimiendo 1 copia de etiqueta registrada [${activeLabel.id}].`);
          setTimeout(() => {
            setPrintStatus((s) => (s === 'success' ? 'idle' : s));
          }, 3000);
        } catch (err) {
          console.warn('Error al invocar window.print():', err);
          setPrintStatus('error');
          setStatusMessage('Error al abrir la ventana de impresión local para reimpresión.');
          setTimeout(() => {
            setPrintStatus((s) => (s === 'error' ? 'idle' : s));
          }, 4000);
        } finally {
          document.title = prevTitle;
          setIsReprinting(false);
          setTimeout(() => {
            setCurrentlyPrintingLabel(null);
          }, 1500);
        }
      }, 50);
    } catch (err: any) {
      console.error('Error en executeReprint:', err);
      setPrintStatus('error');
      setStatusMessage(`⚠️ Error en reimpresión: ${err.message || 'Error inesperado'}`);
      setIsReprinting(false);
      setTimeout(() => {
        setPrintStatus((s) => (s === 'error' ? 'idle' : s));
      }, 4000);
    }
  };

  // Print label to local system printer with selected condition flag
  const executePrintToLocalPrinter = async (
    conditionFlag: ProductConditionFlag = selectedConditionFlag,
    computedExpirationDate?: string
  ) => {
    if (!selectedProduct) {
      setPrintStatus('error');
      setStatusMessage('⚠️ Por favor seleccione un producto antes de imprimir.');
      return;
    }

    setPrintStatus('sending');

    try {
      const targetFolioId = reprintLabelOverride ? reprintLabelOverride.id : currentFolioId;
      const printTimestampNow = reprintLabelOverride ? reprintLabelOverride.printTimestamp : new Date().toISOString();

      // Calculate expiration date at the moment of printing: Print Date + configured days for the selected condition
      const finalExpirationDate = hasExpiration
        ? (computedExpirationDate || calculateExpirationDate(conditionFlag, new Date()) || expirationDate)
        : undefined;

      const printerDisplayName = localPrinterConfig.printerName || 'Impresora Local Predeterminada';

      // Check if Web Serial direct print is enabled
      if (localPrinterConfig.connectionType === 'web_serial' && 'serial' in navigator) {
        try {
          setStatusMessage(`Enviando ZPL directo por USB/Serie a ${localPrinterConfig.printerName || 'Dispositivo USB'}...`);
          const { zpl: printZpl } = generateZplCode(
            {
              id: targetFolioId,
              product: selectedProduct,
              lot,
              weight: netWeight,
              grossWeight: weight,
              tareWeight: tareWeight > 0 ? tareWeight : undefined,
              tareNumber: activeTare?.tareNumber,
              unit: selectedProduct.unit,
              warehouse,
              conditionFlag,
              expirationDate: finalExpirationDate,
              domicilio,
              speciesLegend: activeSpecies,
              timestamp: printTimestampNow,
            },
            printerConfig,
            labelFormatConfig
          );

          const portsPromise = (navigator as any).serial.getPorts();
          const timeoutPromise = new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado buscando puertos USB/Serie')), 3000)
          );
          const ports = await Promise.race([portsPromise, timeoutPromise]);

          if (ports && ports.length > 0) {
            const port = ports[0];
            await port.open({ baudRate: 9600 });
            const writer = port.writable.getWriter();
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(printZpl));
            writer.releaseLock();
            await port.close();

            const newLabel = addPrintedLabel({
              id: targetFolioId,
              productId: selectedProduct.id,
              productCode: selectedProduct.code,
              productName: selectedProduct.name,
              category: selectedProduct.category,
              lot,
              weight: netWeight,
              grossWeight: weight,
              tareWeight: tareWeight > 0 ? tareWeight : undefined,
              tareId: activeTare?.id,
              tareNumber: activeTare?.tareNumber,
              tareName: activeTare?.name,
              unit: selectedProduct.unit,
              warehouse,
              subWarehouse: selectedSubWarehouse,
              conditionFlag,
              expirationDate: finalExpirationDate,
              domicilio,
              speciesLegend: activeSpecies,
              barcodePayload: payload,
              printedBy: activeUser ? `${activeUser.name} (${activeUser.employeeNumber})` : 'Operador Estación',
              employeeNumber: activeUser?.employeeNumber,
              printerIp: `USB/Serie: ${localPrinterConfig.printerName}`,
              status: 'printed',
              copies,
            });

            // Advance to next unique sequential folio for the next box
            if (!reprintLabelOverride) {
              const nextFolio = getNextLabelFolio([...labels, newLabel], targetFolioId);
              setCurrentFolioId(nextFolio);
              try {
                localStorage.setItem('last_label_folio', targetFolioId);
              } catch (e) {}
            }

            setPrintStatus('success');
            setStatusMessage(
              `✅ Sistema: Etiqueta [${newLabel.id}] con Bandera [${conditionFlag}] (Neto: ${netWeight.toFixed(2)} KG${tareWeight > 0 ? ` | Bruto: ${weight.toFixed(2)} KG - Tara #${activeTare?.tareNumber}: ${tareWeight.toFixed(2)} KG` : ''}) enviada vía USB/Serie a [${localPrinterConfig.printerName}] e ingresada al inventario.`
            );
            setTimeout(() => {
              setPrintStatus((s) => (s === 'success' ? 'idle' : s));
            }, 3000);
            return;
          } else {
            throw new Error('No hay puertos USB/Serie vinculados o activos en este momento.');
          }
        } catch (err: any) {
          console.warn('Fallo en impresión USB direct:', err);
          const errMsg = `Fallo de comunicación por puerto USB/Serie: ${err.message || 'Sin respuesta del dispositivo o desconectada'}`;
          setPrintStatus('error');
          setStatusMessage(`⚠️ ADVERTENCIA DEL SISTEMA: ${errMsg}. INGRESO A INVENTARIO BLOQUEADO.`);
          setPrintErrorMessage(errMsg);
          setShowPrintErrorModal(true);
          setTimeout(() => {
            setPrintStatus((s) => (s === 'error' ? 'idle' : s));
          }, 4000);
          return;
        }
      }

      // Standard local printer window trigger
      setStatusMessage(`Enviando trabajo de impresión a [${printerDisplayName}]...`);

      const newLabel = addPrintedLabel({
        id: targetFolioId,
        productId: selectedProduct.id,
        productCode: selectedProduct.code,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        lot,
        weight: netWeight,
        grossWeight: weight,
        tareWeight: tareWeight > 0 ? tareWeight : undefined,
        tareId: activeTare?.id,
        tareNumber: activeTare?.tareNumber,
        tareName: activeTare?.name,
        unit: selectedProduct.unit,
        warehouse,
        subWarehouse: selectedSubWarehouse,
        conditionFlag,
        expirationDate: finalExpirationDate,
        domicilio,
        speciesLegend: activeSpecies,
        barcodePayload: payload,
        printedBy: activeUser ? `${activeUser.name} (${activeUser.employeeNumber})` : 'Operador Estación',
        employeeNumber: activeUser?.employeeNumber,
        printerIp: `Local: ${printerDisplayName}`,
        status: 'printed',
        copies,
      });

      // Freeze this EXACT label for the printable DOM canvas so paper and database match 100%
      setCurrentlyPrintingLabel(newLabel);

      setPrintStatus('success');
      setStatusMessage(
        `✅ Sistema: Etiqueta [${newLabel.id}] con Bandera [${conditionFlag}] (Neto: ${netWeight.toFixed(2)} KG${tareWeight > 0 ? ` | Bruto: ${weight.toFixed(2)} KG - Tara #${activeTare?.tareNumber}: ${tareWeight.toFixed(2)} KG` : ''}) procesada en [${printerDisplayName}] e ingresada a Almacén ${warehouse.toUpperCase()}.`
      );

      // Auto-reset printStatus to idle after 3 seconds so the operator can immediately weigh and print the next box!
      setTimeout(() => {
        setPrintStatus((s) => (s === 'success' ? 'idle' : s));
      }, 3000);

      // Trigger print popup with guaranteed frozen label snapshot
      setTimeout(() => {
        const prevTitle = document.title;
        try {
          document.title = `${printerDisplayName}_Etiqueta_${newLabel.id}_${selectedProduct.code}`;
          window.print();
        } catch (printErr: any) {
          console.warn('Error al invocar window.print():', printErr);
        } finally {
          document.title = prevTitle;
          // Advance to next unique sequential folio ONLY after printing has been called!
          if (!reprintLabelOverride) {
            const nextFolio = getNextLabelFolio([...labels, newLabel], targetFolioId);
            setCurrentFolioId(nextFolio);
            try {
              localStorage.setItem('last_label_folio', targetFolioId);
            } catch (e) {}
          }
          // Clear frozen label after print dialog closes
          setTimeout(() => {
            setCurrentlyPrintingLabel(null);
          }, 1500);
        }
      }, 50);
    } catch (err: any) {
      console.error('Error general en executePrintToLocalPrinter:', err);
      setPrintStatus('error');
      setStatusMessage(`⚠️ Error al procesar etiqueta: ${err.message || 'Error inesperado'}`);
      setTimeout(() => {
        setPrintStatus((s) => (s === 'error' ? 'idle' : s));
      }, 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Intro Banner */}
      <div className="bg-[#141414] text-white p-4 sm:p-5 border border-[#141414] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-[#141414] text-[10px] font-mono font-extrabold px-2 py-0.5 uppercase tracking-wider">
              FLUJO DE IMPRESIÓN
            </span>
            <h2 className="text-lg font-mono font-bold text-white uppercase tracking-tight">
              Creación y Generación de Etiquetas ZPL
            </h2>
          </div>
          <p className="text-[#A0A09C] text-xs max-w-2xl font-mono">
            Establezca el Almacén, Fecha de Expiración, Lectura de Báscula y Código de Producto en orden para habilitar la impresión.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#242422] p-2.5 border border-[#3A3A36] shrink-0 font-mono">
          <Laptop className="w-4 h-4 text-emerald-400" />
          <div className="text-xs">
            <p className="text-[#A0A09C] text-[10px] uppercase">
              Operador Activo: <strong className="text-amber-300">{activeUser ? `${activeUser.name} (${activeUser.employeeNumber})` : 'Sin Asignar'}</strong>
            </p>
            <p className="font-bold text-amber-400">{localPrinterConfig.printerName || 'Sistema / USB'} ({localPrinterConfig.paperWidthMm}x{localPrinterConfig.paperHeightMm}mm)</p>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sequential Parameter Steps (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* PASO 1: ALMACÉN DESTINO */}
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#141414] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h3 className="font-mono font-black text-[#141414] text-xs uppercase tracking-wider">
                  PASO 1: ALMACÉN DESTINO (PNC)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-900 bg-cyan-100 px-2 py-0.5 border border-cyan-400 uppercase flex items-center gap-1">
                <Snowflake className="w-3 h-3 text-cyan-600" />
                Congelado
              </span>
            </div>

            <div className="py-2.5 px-3.5 bg-cyan-950 text-cyan-200 border-2 border-cyan-500 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-cyan-900/60 rounded border border-cyan-400/40 text-cyan-300">
                  <Snowflake className="w-5 h-5 text-cyan-400 shrink-0" />
                </div>
                <div>
                  <span className="text-sm font-extrabold block leading-tight">Almacén Congelado</span>
                  <span className="text-[10px] text-cyan-300/80 font-mono">Almacén único exclusivo para Producto No Conforme (PNC)</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-cyan-900 text-cyan-100 px-2.5 py-1 border border-cyan-600 uppercase">
                Congelado
              </span>
            </div>

            {/* Selector de Sub-Almacén */}
            <div className="pt-2 border-t border-[#141414]/10 space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-[#141414] uppercase flex items-center justify-between">
                <span>Sub-Almacén / Cámara Frigorífica de Destino:</span>
                <span className="text-[10px] text-[#666] font-normal">({availableSubWarehouses.length} cámaras configuradas en Congelado)</span>
              </label>
              <select
                value={selectedSubWarehouse}
                onChange={(e) => setSelectedSubWarehouse(e.target.value)}
                className="w-full bg-white border border-[#141414] px-2.5 py-2 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
              >
                {availableSubWarehouses.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
                {availableSubWarehouses.length === 0 && (
                  <option value="">General Congelado</option>
                )}
              </select>
            </div>
          </div>

          {/* PASO 2: FECHA DE EXPIRACIÓN Y LOTE */}
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#141414] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h3 className="font-mono font-black text-[#141414] text-xs uppercase tracking-wider">
                  PASO 2: FECHA DE EXPIRACIÓN Y LOTE
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#666]">
                {hasExpiration ? `Vence: ${expirationDate}` : 'Sin expiración'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Número de Lote */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414]">
                    Número de Lote (DDMMAA) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDailyLot}
                    className="text-[10px] font-mono font-bold text-[#141414] underline flex items-center gap-1 hover:text-amber-700 cursor-pointer"
                    title="Restablecer al lote del día actual (DDMMAA)"
                  >
                    <Calendar className="w-3 h-3 text-amber-600" /> Fecha del Día ({getDailyLotCode()})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={lot}
                    onChange={(e) => setLot(e.target.value)}
                    placeholder={`ej. ${getDailyLotCode()}`}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-[#141414] font-mono text-xs font-bold text-[#141414] focus:outline-hidden"
                  />
                  {lot === getDailyLotCode() && (
                    <span className="absolute right-2 top-1.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-xs border border-emerald-300">
                      Lote de Hoy
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-[#666] mt-1">
                  Lote configurado con la fecha de hoy: <strong className="text-black">{getDailyLotCode()}</strong> (DDMMAA)
                </p>
              </div>

              {/* Fecha de Expiración */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs font-mono font-bold text-[#141414] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasExpiration}
                    onChange={(e) => setHasExpiration(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#141414]"
                  />
                  <span>Incluir Fecha de Caducidad</span>
                </label>

                {hasExpiration && (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-white border border-[#141414] text-xs font-mono font-bold text-[#141414] focus:outline-hidden"
                      />
                      <Calendar className="w-3.5 h-3.5 text-[#888] absolute left-2.5 top-2" />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono bg-amber-50 p-1.5 border border-amber-300/80 rounded-xs">
                      <span className="text-amber-950 font-bold flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          Auto: +{conditionExpirationConfig[selectedConditionFlag]?.days ?? 360}d para [{selectedConditionFlag}]
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpirationDate(calculateExpirationDate(selectedConditionFlag, new Date()))}
                          className="text-amber-900 hover:text-black underline font-bold cursor-pointer"
                          title="Recalcular fecha de caducidad según la fecha de hoy más los días del estado seleccionado"
                        >
                          Recalcular
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsExpirationModalOpen(true)}
                          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                          title="Abrir ventana de configuración de caducidades"
                        >
                          Configurar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Campo Domicilio de Planta / Destino */}
            <div className="pt-2 border-t border-[#141414]/15 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  <span>Domicilio / Planta en Etiqueta</span>
                </label>
                <div className="flex items-center gap-2">
                  {domicilioSavedFeedback ? (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> ¡Guardado en diseño!
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveDomicilioToDefault}
                      className="text-[10px] font-mono text-amber-800 hover:text-black font-bold underline cursor-pointer"
                      title="Guardar este domicilio permanentemente en el diseño de etiqueta predeterminado"
                    >
                      Guardar como predeterminado
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDomicilio(labelFormatConfig.addressText || 'DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000')}
                    className="text-[10px] font-mono text-gray-500 hover:text-black underline cursor-pointer"
                  >
                    Restablecer
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder="ej. DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000"
                className="w-full px-3 py-1.5 bg-white border border-[#141414] font-mono text-xs font-bold text-[#141414] focus:outline-hidden"
              />
              <p className="text-[9px] font-mono text-[#666]">
                Este texto se estampa en la parte inferior de la etiqueta térmica física y en el código ZPL.
              </p>
            </div>
          </div>

          {/* PASO 3: BÁSCULA TORREY (LECTURA DE PESO) */}
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#141414] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <h3 className="font-mono font-black text-[#141414] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>PASO 3: LECTURA BÁSCULA TORREY</span>
                </h3>
              </div>

              {/* Status Indicator Badge */}
              <span
                className={`text-[10px] font-mono font-black px-2 py-0.5 border uppercase ${
                  weight <= 0
                    ? 'bg-amber-200 text-amber-950 border-amber-600 animate-pulse'
                    : netWeight <= 0
                    ? 'bg-rose-200 text-rose-950 border-rose-600 animate-pulse font-black'
                    : netWeight < minWeight
                    ? 'bg-rose-200 text-rose-950 border-rose-600 animate-pulse font-black'
                    : 'bg-emerald-200 text-emerald-950 border-emerald-600'
                }`}
              >
                {weight <= 0
                  ? '⚠️ BÁSCULA EN 0.00 KG (ESPERANDO COM)'
                  : netWeight <= 0
                  ? `⛔ TARA EXCEDE O IGUALA PESO (${netWeight.toFixed(2)} KG)`
                  : netWeight < minWeight
                  ? `⛔ PESO NETO INFERIOR AL MÍNIMO (${netWeight.toFixed(2)} / MÍN ${minWeight.toFixed(2)} KG)`
                  : `PESO NETO OK: ${netWeight.toFixed(2)} ${selectedProduct?.unit || 'KG'}${tareWeight > 0 ? ` (Tara -${tareWeight.toFixed(2)} KG)` : ''}`}
              </span>
            </div>

            {/* Torrey Scale Widget */}
            <TorreyScaleWidget
              currentWeight={weight}
              minWeight={minWeight}
              onMinWeightChange={handleMinWeightChange}
              onWeightReceived={(w) => setWeight(w)}
              onLatestReading={(r) => {
                latestScaleWeightRef.current = r.weight;
              }}
            />

            {/* ASIGNACIÓN Y DESCUENTO DE TARA DE EMPAQUE */}
            <div className="bg-amber-50/90 border border-amber-300 p-3 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-xs font-mono font-extrabold uppercase text-amber-950">
                    Tara de Empaque (-KG a descontar del peso total)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tareAssignSuccess ? (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> ¡Tara guardada en producto!
                    </span>
                  ) : (
                    selectedProduct && (
                      <button
                        type="button"
                        onClick={handleAssignCurrentTareToProduct}
                        disabled={isAssigningTareToProd}
                        className="text-[10px] font-mono text-amber-900 hover:text-black font-bold underline cursor-pointer"
                        title={`Guardar esta tara como predeterminada para el producto ${selectedProduct.code} (${selectedProduct.name})`}
                      >
                        {isAssigningTareToProd ? 'Guardando...' : 'Fijar tara a este SKU'}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSpeciesModalTab('tares');
                      setIsSpeciesModalOpen(true);
                    }}
                    className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 text-[10px] font-mono font-bold uppercase rounded-xs cursor-pointer flex items-center gap-1"
                    title="Abrir Catálogo de Taras para agregar o modificar empaques"
                  >
                    <Sliders className="w-3 h-3" />
                    Catálogo Taras
                  </button>
                </div>
              </div>

              {/* Selector de Taras */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-8">
                  <label className="block text-[10px] font-mono font-bold text-amber-950 uppercase mb-0.5">
                    Seleccionar Tara de la Lista:
                  </label>
                  <select
                    value={selectedTareId || ''}
                    onChange={(e) => setSelectedTareId(e.target.value || null)}
                    className="w-full bg-white border border-[#141414] px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  >
                    <option value="">0 — Sin Tara (Descuento 0.00 KG)</option>
                    {tares.map((t) => (
                      <option key={t.id} value={t.id}>
                        Tara #{t.tareNumber}: {t.code} — {t.name} (-{t.weight.toFixed(2)} {t.unit || 'KG'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4 flex items-center gap-1.5 justify-start sm:justify-end pt-1 sm:pt-4">
                  {selectedTareId ? (
                    <button
                      type="button"
                      onClick={() => setSelectedTareId(null)}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-rose-800 hover:bg-rose-100 border border-rose-300 bg-white cursor-pointer w-full text-center"
                    >
                      Quitar Tara (0.00 KG)
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-gray-500 italic">
                      Pesaje neto = bruto
                    </span>
                  )}
                </div>
              </div>

              {/* Taras rápidas pills */}
              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-amber-200/60">
                <span className="text-[9px] font-mono font-bold text-amber-900 uppercase">Taras Rápidas:</span>
                <button
                  type="button"
                  onClick={() => setSelectedTareId(null)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                    !selectedTareId ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-gray-700 hover:bg-amber-100 border-gray-300'
                  }`}
                >
                  Sin Tara
                </button>
                {tares.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTareId(t.id)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                      selectedTareId === t.id
                        ? 'bg-amber-500 text-black border-black font-black'
                        : 'bg-white text-amber-950 hover:bg-amber-100 border-amber-300'
                    }`}
                  >
                    #{t.tareNumber} {t.code} (-{t.weight.toFixed(2)} KG)
                  </button>
                ))}
              </div>

              {/* Panel de Cálculo de Peso Bruto vs Tara vs Peso Neto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono">
                {/* 1. Peso Bruto Báscula */}
                <div className="bg-white border-2 border-gray-400 p-2 text-center">
                  <span className="block text-[9px] font-bold text-gray-600 uppercase tracking-tight">
                    Peso Bruto (Báscula)
                  </span>
                  <span className="text-base font-black text-gray-900">
                    {weight.toFixed(2)} <span className="text-xs font-normal text-gray-600">KG</span>
                  </span>
                </div>

                {/* 2. Menos Tara */}
                <div className="bg-rose-50 border-2 border-rose-300 p-2 text-center">
                  <span className="block text-[9px] font-bold text-rose-800 uppercase tracking-tight">
                    - Tara {activeTare ? `(#${activeTare.tareNumber} ${activeTare.code})` : ''}
                  </span>
                  <span className="text-base font-black text-rose-700">
                    -{tareWeight.toFixed(2)} <span className="text-xs font-normal text-rose-600">KG</span>
                  </span>
                </div>

                {/* 3. Peso Neto Final (El que se imprime en etiqueta) */}
                <div className="bg-emerald-100 border-2 border-emerald-600 p-2 text-center shadow-xs">
                  <span className="block text-[9px] font-black text-emerald-950 uppercase tracking-tight flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    = Peso Neto (Etiqueta)
                  </span>
                  <span className="text-lg font-black text-emerald-950">
                    {netWeight.toFixed(2)} <span className="text-xs font-bold text-emerald-800">{selectedProduct?.unit || 'KG'}</span>
                  </span>
                </div>
              </div>
            </div>

            {weight <= 0 && (
              <p className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 p-2 border border-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>La báscula está en 0.00 KG. Conecte el puerto COM de la báscula Torrey para transmitir el peso real. Se requiere un peso mayor a 0.00 KG para imprimir.</span>
              </p>
            )}

            {weight > 0 && netWeight <= 0 && (
              <p className="text-[10px] font-mono font-bold text-rose-800 bg-rose-100 p-2 border border-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>
                  Bloqueo de Impresión: La tara seleccionada (-{tareWeight.toFixed(2)} KG) es mayor o igual al peso de la báscula ({weight.toFixed(2)} KG), resultando en peso neto de 0.00 KG.
                </span>
              </p>
            )}

            {weight > 0 && netWeight > 0 && netWeight < minWeight && (
              <p className="text-[10px] font-mono font-bold text-rose-800 bg-rose-100 p-2 border border-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>
                  Bloqueo de Impresión: El peso neto final ({netWeight.toFixed(2)} KG) tras descontar la tara ({tareWeight.toFixed(2)} KG) es inferior al peso mínimo requerido ({minWeight.toFixed(2)} KG).
                </span>
              </p>
            )}
          </div>

          {/* PASO 4: CÓDIGO DE PRODUCTO Y SELECCIÓN */}
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#141414] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <h3 className="font-mono font-black text-[#141414] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#141414]" />
                  <span>PASO 4: CÓDIGO DE PRODUCTO</span>
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#141414] bg-emerald-200 px-2 py-0.5 border border-[#141414]/30">
                PROD SELECCIONADO: {selectedProduct?.code}
              </span>
            </div>

            {/* Selected Product Highlight Card */}
            {selectedProduct && (
              <div className="bg-white p-3 border-2 border-[#141414] space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-white bg-[#141414] px-2 py-0.5">
                    {selectedProduct.code}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      const matchingCat = categoryCatalog.find((c) => c.name === selectedProduct.category);
                      const badgeCls = getCategoryBadgeClass(matchingCat?.color);
                      const badgeSty = getCategoryBadgeStyle(matchingCat?.color);
                      return (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 border rounded-xs ${badgeCls}`}
                          style={badgeSty}
                        >
                          Cat: {selectedProduct.category}
                        </span>
                      );
                    })()}

                    {(() => {
                      const currentSpeciesItem = speciesList.find((s) => s.legend === activeSpecies);
                      const spBadgeCls = getSpeciesBadgeClass(currentSpeciesItem?.badgeColor);
                      const spBadgeSty = getSpeciesBadgeStyle(currentSpeciesItem?.badgeColor);
                      return (
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 border rounded-xs flex items-center gap-1 ${spBadgeCls}`}
                          style={spBadgeSty}
                          title="Especie activa para impresión en esta etiqueta"
                        >
                          <Tag className="w-3 h-3" />
                          {activeSpecies}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-[#141414] text-sm font-mono">
                    {selectedProduct?.name || 'Seleccione un producto'}
                  </p>
                  <p className="text-[11px] text-[#666] font-mono">
                    Unidad de Medida: <strong>{selectedProduct?.unit || 'KG'}</strong> | Simbología: <strong>{selectedProduct?.barcodeType || 'QRCode'}</strong>
                  </p>
                </div>

                {/* Interactive Species Switcher & Catalog Link */}
                <div className="pt-2 border-t border-[#141414]/15 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-[#333] flex items-center gap-1">
                      <span>Especie para la etiqueta:</span>
                      <strong className="text-amber-950 bg-amber-200 px-1.5 py-0.2 border border-amber-400">
                        {activeSpecies}
                      </strong>
                    </span>

                    {selectedProduct && selectedProduct.speciesLegend !== activeSpecies && (
                      <button
                        type="button"
                        onClick={() => handleSaveSpeciesToProduct(activeSpecies)}
                        disabled={isSavingSpeciesToProduct}
                        className="text-[10px] font-mono font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Guardar esta especie en el catálogo permanente de este producto"
                      >
                        {speciesSaveSuccess ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-200" /> ¡Guardada en Catálogo!
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3 h-3" /> Asignar permanentemente al producto
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Quick Species Badges */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {speciesList.map((sp) => {
                      const isCurrent = activeSpecies.toUpperCase() === sp.legend.toUpperCase();
                      const spBadgeCls = getSpeciesBadgeClass(sp.badgeColor);
                      const spBadgeSty = getSpeciesBadgeStyle(sp.badgeColor);
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setSelectedSpeciesOverride(sp.legend)}
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded-xs transition-all cursor-pointer ${
                            isCurrent
                              ? 'ring-2 ring-[#141414] font-black scale-105 shadow-xs'
                              : 'opacity-65 hover:opacity-100 hover:scale-102'
                          } ${spBadgeCls}`}
                          style={spBadgeSty}
                          title={`Cambiar especie de esta etiqueta a: ${sp.name} (${sp.legend})`}
                        >
                          {sp.legend}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ingresar o buscar código / nombre..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#141414] text-xs font-mono font-bold focus:outline-hidden text-[#141414]"
                />
                <Search className="w-3.5 h-3.5 text-[#A0A09C] absolute left-2.5 top-2.5" />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-2 bg-white border border-[#141414] text-xs font-mono font-bold text-[#141414] focus:outline-hidden"
                title="Filtrar por Categoría"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    Cat: {cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedSpeciesFilter}
                onChange={(e) => setSelectedSpeciesFilter(e.target.value)}
                className="py-1.5 px-2 bg-white border border-[#141414] text-xs font-mono font-bold text-amber-900 focus:outline-hidden"
                title="Filtrar por Especie / Origen"
              >
                {speciesOptions.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp === 'Todos' ? 'Especie: Todas' : sp}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsSpeciesModalOpen(true)}
                className="px-2 py-1.5 bg-[#222220] hover:bg-rose-600 text-rose-300 hover:text-white border border-[#141414] text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title="Administrar catálogo de especies y leyendas de etiquetado"
              >
                <Dna className="w-3.5 h-3.5 text-rose-400" />
                <span>+ Especie</span>
              </button>
            </div>

            {/* Products grid / scroll list */}
            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 border border-[#141414]/30 p-1.5 bg-white">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductSelect(p)}
                    className={`p-2 cursor-pointer transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-amber-300/50 border-[#141414] font-bold shadow-xs'
                        : 'bg-white hover:bg-[#F0EFEA] border-[#D4D3D0]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-[#141414] bg-[#E4E3E0] px-1.5 py-0.5 border border-[#141414]/20">
                          {p.code}
                        </span>
                        <h4 className="font-bold text-[#141414] text-xs">{p.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(() => {
                          const matchingCat = categoryCatalog.find((c) => c.name === p.category);
                          const badgeCls = getCategoryBadgeClass(matchingCat?.color);
                          const badgeSty = getCategoryBadgeStyle(matchingCat?.color);
                          return (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 border rounded-xs ${badgeCls}`}
                              style={badgeSty}
                            >
                              {p.category}
                            </span>
                          );
                        })()}
                        {(() => {
                          const pSpecies = p.speciesLegend || inferProductSpeciesLegend(p, speciesList);
                          const spItem = speciesList.find((s) => s.legend === pSpecies);
                          const spBadgeCls = getSpeciesBadgeClass(spItem?.badgeColor);
                          const spBadgeSty = getSpeciesBadgeStyle(spItem?.badgeColor);
                          return (
                            <span className="text-[11px] text-[#555] font-mono flex items-center gap-1 flex-wrap">
                              <span>Unidad: <strong>{p.unit}</strong></span>
                              <span>|</span>
                              <span>Especie:</span>
                              <span className={`text-[9px] font-bold px-1 py-0.2 border rounded-xs ${spBadgeCls}`} style={spBadgeSty}>
                                {pSpecies}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isSelected ? (
                        <span className="text-[10px] font-mono font-black text-emerald-950 bg-emerald-300 px-2 py-0.5 border border-emerald-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-800" /> SELECCIONADO
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#666] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                          Seleccionar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="p-4 text-center text-[#888] font-mono text-xs">
                  Sin productos para este código o filtro.
                </div>
              )}
            </div>

            {/* Copies selector */}
            <div className="flex items-center justify-between pt-2 border-t border-[#141414]/10">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414]">
                  Cantidad de Copias a Imprimir (^PQ)
                </label>
                <p className="text-[10px] font-mono text-[#666]">Número de etiquetas idénticas</p>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 border border-[#141414]">
                <button
                  type="button"
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                  className="w-7 h-7 bg-[#E4E3E0] hover:bg-[#D4D3D0] border border-[#141414] text-[#141414] font-bold text-xs flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-[#141414] text-xs font-mono">{copies}</span>
                <button
                  type="button"
                  onClick={() => setCopies((c) => c + 1)}
                  className="w-7 h-7 bg-[#E4E3E0] hover:bg-[#D4D3D0] border border-[#141414] text-[#141414] font-bold text-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Action Buttons & Visual Label Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Buttons: Print to Local Printer, Zebra IP or Simulate */}
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-3 no-print" translate="no">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#141414]" />
                <h3 className="font-mono font-bold text-[#141414] text-xs uppercase tracking-wider">
                  Acciones de Impresión
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-300 text-[#141414] px-2 py-0.5 border border-[#141414]">
                {copies} {copies === 1 ? 'COPIA' : 'COPIAS'}
              </span>
            </div>

            <div className="space-y-2">
              {/* Indicador de Folio Consecutivo de Caja (Trazabilidad 1:1) */}
              <div className="bg-white border-2 border-[#141414] p-2.5 flex items-center justify-between shadow-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-mono font-bold text-[#141414] uppercase">
                      Folio de Control / Trazabilidad:
                    </span>
                    {reprintLabelOverride ? (
                      <span className="text-[9px] font-mono font-extrabold bg-amber-400 text-[#141414] px-1.5 py-0.2 border border-black uppercase">
                        Reimpresión
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 border border-emerald-400 uppercase">
                        Consecutivo 1:1
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-base font-black text-blue-900 tracking-tight">
                      {activeLabelId}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {reprintLabelOverride
                        ? 'Caja ya registrada'
                        : 'Siguiente caja física (incremento automático por caja)'}
                    </span>
                  </div>
                </div>
                {!reprintLabelOverride && (
                  <button
                    type="button"
                    onClick={() => {
                      const val = prompt(
                        'Ingrese el número de folio consecutivo inicial deseado (ej. LBL-73613 o 73613):',
                        currentFolioId
                      );
                      if (val && val.trim()) {
                        const clean = val.trim().toUpperCase();
                        const match = clean.match(/^LBL-?(\d+)$/i);
                        const formatted = match ? `LBL-${match[1]}` : (/^\d+$/.test(clean) ? `LBL-${clean}` : clean);
                        setCurrentFolioId(formatted);
                        try {
                          localStorage.setItem('last_label_folio', formatted);
                        } catch (e) {}
                      }
                    }}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-400 text-[10px] font-mono font-bold text-[#141414] flex items-center gap-1 cursor-pointer shrink-0"
                    title="Calibrar número de folio para sincronizar con rollo físico de etiquetas"
                  >
                    <Sliders className="w-3 h-3 text-gray-700" />
                    Ajustar Folio
                  </button>
                )}
              </div>

              {/* Primary Print Button (Local System / USB) */}
              <button
                type="button"
                onClick={handlePrintToLocalPrinter}
                disabled={printStatus === 'sending' || !selectedProduct}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#141414] transition-all flex flex-col items-center justify-center gap-0.5 shadow-md disabled:opacity-50 group cursor-pointer"
                title={`Imprimir con ${localPrinterConfig.printerName || 'Impresora Local del Sistema'}`}
              >
                <div className="flex items-center gap-2">
                  {printStatus === 'sending' ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  ) : (
                    <Printer className="w-4 h-4 text-emerald-200" />
                  )}
                  <span className="text-sm font-black">
                    Imprimir Etiqueta ({copies} {copies === 1 ? 'copia' : 'copias'})
                  </span>
                </div>
                <span className="text-[10px] text-emerald-200 font-normal">
                  Dispositivo: {localPrinterConfig.printerName || 'Predeterminada del Sistema'} ({localPrinterConfig.paperWidthMm}x{localPrinterConfig.paperHeightMm} mm)
                </span>
              </button>

              {/* Secondary Button: Reimprimir Última Etiqueta Registrada */}
              <button
                type="button"
                onClick={handleReprintLastLabel}
                disabled={printStatus === 'sending' || !lastRegisteredLabel}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#141414] transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm disabled:opacity-40 cursor-pointer"
                title="Reimprimir 1 copia de la última etiqueta registrada en el sistema por error de etiquetadora o desconexión"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className={`w-4 h-4 text-[#141414] ${printStatus === 'sending' ? 'animate-spin' : ''}`} />
                  <span className="font-black text-xs">
                    🔄 REIMPRIMIR ÚLTIMA ETIQUETA REGISTRADA (1 COPIA)
                  </span>
                </div>
                {lastRegisteredLabel ? (
                  <span className="text-[10px] text-[#141414] font-mono font-bold">
                    [{lastRegisteredLabel.id}] {lastRegisteredLabel.productCode} - {lastRegisteredLabel.productName} ({lastRegisteredLabel.weight} {lastRegisteredLabel.unit}) | Lote: {lastRegisteredLabel.lot}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#666] font-normal">
                    (No hay etiquetas registradas recientemente)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowKioskModal(true)}
                className="w-full text-[10px] font-mono font-bold text-amber-800 hover:text-amber-900 underline flex items-center justify-center gap-1 pt-1 cursor-pointer"
              >
                <span>⚡ ¿Cómo omitir la ventana de selección de impresora e imprimir directo?</span>
              </button>
            </div>

            {/* Feedback Alert Banner */}
            {printStatus !== 'idle' && (
              <div
                className={`p-3 border-2 text-xs font-mono ${
                  printStatus === 'success'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-600'
                    : printStatus === 'error'
                    ? 'bg-amber-100 text-amber-950 border-amber-600'
                    : 'bg-blue-100 text-blue-950 border-blue-600'
                }`}
              >
                <div className="flex items-start gap-2">
                  {printStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />}
                  {printStatus === 'error' && <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />}
                  {printStatus === 'sending' && <RefreshCw className="w-5 h-5 text-blue-700 animate-spin shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-extrabold text-xs uppercase mb-0.5">
                      {printStatus === 'success'
                        ? 'Operación Exitosa'
                        : printStatus === 'error'
                        ? 'Error / Advertencia de Impresión'
                        : 'Enviando Datos a Impresora...'}
                    </p>
                    <p className="leading-normal font-bold">{statusMessage}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Label Preview Card */}
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#141414]/20 pb-2 gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#141414]" />
                <div>
                  <h3 className="font-mono font-bold text-[#141414] text-xs uppercase tracking-wider">
                    Vista Previa Formato Zebra
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-800 font-bold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Diseño: {labelFormatConfig.presetName || 'Personalizado'} ({labelFormatConfig.widthInches}" × {labelFormatConfig.heightInches}")</span>
                  </div>
                </div>
              </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {onOpenFormatEditor && (
                    <button
                      onClick={onOpenFormatEditor}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-[#141414] bg-amber-300 hover:bg-amber-400 border border-[#141414] flex items-center gap-1 cursor-pointer"
                      title="Editar medidas, logos y formato de etiqueta ZPL"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Diseñar Formato</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowZplCode(!showZplCode)}
                    className="px-2 py-1 text-[10px] font-mono font-bold text-[#141414] bg-white border border-[#141414] flex items-center gap-1 hover:bg-[#E4E3E0] cursor-pointer"
                  >
                    <FileCode className="w-3 h-3" />
                    {showZplCode ? 'Ocultar ZPL' : 'Código ZPL'}
                  </button>
                </div>
            </div>

            {/* Visual Simulated Thermal Label */}
            {!showZplCode ? (
              <div className="space-y-3">
                {labelaryImageUrl ? (
                  <div className="bg-white p-3 border border-[#141414] text-center space-y-2">
                    <p className="text-[10px] font-mono font-bold text-[#141414] uppercase">
                      Render Real Labelary API (Zebra 203 DPI)
                    </p>
                    <img
                      src={labelaryImageUrl}
                      alt="Labelary Zebra Render"
                      className="mx-auto max-h-64 border border-[#141414]"
                    />
                    <button
                      onClick={() => setLabelaryImageUrl(null)}
                      className="text-[11px] font-mono text-[#141414] underline font-bold"
                    >
                      Volver a vista previa interactiva
                    </button>
                  </div>
                ) : (
                  <div id="thermal-label-preview-container" className="bg-[#D4D3D0] p-3 border-2 border-[#141414] shadow-md flex justify-center">
                    <SimulatedLabelCanvas
                      labelFormatConfig={labelFormatConfig}
                      product={selectedProduct}
                      lot={reprintLabelOverride ? reprintLabelOverride.lot : lot}
                      weight={reprintLabelOverride ? reprintLabelOverride.weight : netWeight}
                      unit={reprintLabelOverride ? (reprintLabelOverride.unit || 'KG') : (selectedProduct?.unit || 'KG')}
                      warehouse={reprintLabelOverride ? reprintLabelOverride.warehouse : warehouse}
                      conditionFlag={reprintLabelOverride ? (reprintLabelOverride.conditionFlag || 'A') : selectedConditionFlag}
                      expirationDate={reprintLabelOverride ? reprintLabelOverride.expirationDate : (hasExpiration ? expirationDate : undefined)}
                      domicilio={reprintLabelOverride ? reprintLabelOverride.domicilio : domicilio}
                      speciesLegend={activeSpecies}
                      timestamp={reprintLabelOverride ? reprintLabelOverride.printTimestamp : currentTimestamp}
                      labelId={activeLabelId}
                    />
                  </div>
                )}

                {!labelaryImageUrl && (
                  <button
                    onClick={handleFetchLabelaryPreview}
                    disabled={isLoadingLabelary}
                    className="w-full py-1.5 bg-white hover:bg-[#E4E3E0] text-[#141414] text-xs font-mono font-bold border border-[#141414] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoadingLabelary ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    Renderizar con Labelary API
                  </button>
                )}
              </div>
            ) : (
              /* ZPL Code Viewer */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#141414]">
                    Salida ZPL II Raw
                  </span>
                  <button
                    onClick={handleCopyZpl}
                    className="px-2 py-0.5 bg-[#141414] text-white text-[10px] font-mono font-bold hover:bg-[#282828] flex items-center gap-1"
                  >
                    {copiedZpl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedZpl ? 'Copiado' : 'Copiar ZPL'}
                  </button>
                </div>
                <pre className="bg-[#141414] text-emerald-400 p-3 text-[11px] font-mono overflow-x-auto max-h-64 border border-[#141414] leading-relaxed">
                  {zpl}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WEIGHT WARNING MODAL DIALOG */}
      {showWeightWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/80 p-4 font-mono notranslate">
          <div className="bg-[#F8F7F4] border-4 border-rose-600 w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-[#141414]/20 pb-3">
              <div className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-rose-950 text-sm uppercase">
                  {weight <= 0 ? 'Advertencia: Sin Peso en Báscula' : 'Bloqueo: Peso Inferior al Mínimo'}
                </h3>
                <p className="text-[11px] text-[#555]">
                  Báscula Torrey 0EQB100
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-300 p-3 text-xs space-y-2 text-rose-950">
              <p className="font-bold">
                {weight <= 0
                  ? '⚠️ No hay peso registrado en la báscula para generar la etiqueta.'
                  : `⚠️ El peso registrado (${weight.toFixed(2)} KG) es menor al peso mínimo configurado (${minWeight.toFixed(2)} KG).`}
              </p>
              <p className="text-[11px] text-rose-900 leading-relaxed">
                {weight <= 0
                  ? 'Por favor conecte la báscula Torrey mediante puerto COM/USB y coloque el producto sobre la plataforma para transmitir el peso real antes de presionar Imprimir.'
                  : `Para poder imprimir la etiqueta debe colocar al menos ${minWeight.toFixed(2)} KG sobre la báscula o reducir la restricción de Peso Mínimo Requerido en la báscula.`}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowWeightWarningModal(false)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#141414] shadow-sm cursor-pointer"
              >
                Entendido / Ajustar Peso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KIOSK / DIRECT PRINTING HELP MODAL */}
      {showKioskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/80 p-4 font-mono notranslate">
          <div className="bg-[#F8F7F4] border-4 border-amber-500 w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-amber-950 text-sm uppercase">
                    Guía: Impresión Directa sin Diálogo
                  </h3>
                  <p className="text-[10px] text-[#555]">
                    Omitir ventana emergente de selección de impresora en navegadores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKioskModal(false)}
                className="text-[#141414] hover:text-rose-600 font-bold text-lg cursor-pointer px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#141414]">
              <div className="bg-amber-100/70 border border-amber-300 p-3 space-y-1">
                <p className="font-bold text-amber-950 uppercase">
                  📌 ¿Por qué los navegadores muestran este cuadro?
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Por seguridad, todos los navegadores web (Chrome, Edge) interrumpen la pantalla con la ventana de vista previa antes de mandar trabajo a cualquier impresora local de Windows.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-black uppercase text-xs text-emerald-900 border-b border-emerald-300 pb-0.5">
                  MÉTODO 1: Impresión por IP / Red (Recomendado para Zebra)
                </p>
                <p className="text-[11px] text-[#333] leading-relaxed">
                  Si su impresora Zebra (o ZDesigner GK420d) está en red con dirección IP (ej. <code>192.168.1.100</code>), configure la IP en los ajustes. Al presionar <strong>Imprimir en Zebra IP</strong>, el código ZPL se envía de forma 100% silenciosa a la impresora <strong>sin abrir la ventana emergente</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-black uppercase text-xs text-amber-900 border-b border-amber-300 pb-0.5">
                  MÉTODO 2: Activar Modo Kiosk en Google Chrome / Edge
                </p>
                <p className="text-[11px] text-[#333] leading-relaxed">
                  Si usa impresora conectada por cable USB y desea que el botón local imprima directamente en 1 segundo:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] font-bold text-[#222]">
                  <li>Cierre el navegador Google Chrome.</li>
                  <li>Dé clic derecho sobre el acceso directo de Chrome en su escritorio y seleccione <strong>Propiedades</strong>.</li>
                  <li>
                    En el campo <strong>Destino</strong> (Target), agregue un espacio y la instrucción:
                    <br />
                    <code className="bg-black text-amber-300 px-2 py-1 text-[10px] block my-1 font-mono">
                      --kiosk-printing
                    </code>
                  </li>
                  <li>
                    Asegúrese de establecer su impresora Zebra <strong>ZDesigner GK420d</strong> como la <strong>Impresora Predeterminada en Windows</strong>.
                  </li>
                  <li>¡Listo! Al presionar imprimir en la app, la etiqueta saldrá al instante sin cuadro de diálogo.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#141414]/20">
              <button
                type="button"
                onClick={() => setShowKioskModal(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#141414] shadow-sm cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATIC SYSTEM ERROR / HARDWARE WARNING MODAL */}
      {showPrintErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#f0eee6] border-2 border-rose-800 max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-700 text-white border border-[#141414]">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-sm uppercase text-rose-950 tracking-wide">
                    ⚠️ Advertencia del Sistema: Falla de Impresora
                  </h3>
                  <p className="text-[10px] text-rose-800 font-mono">
                    Detección automática: Impresora desconectada, inalcanzable o sin papel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintErrorModal(false)}
                className="text-[#141414] hover:text-rose-600 font-bold text-lg cursor-pointer px-2"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-300 p-3.5 space-y-2">
              <p className="font-mono font-bold text-xs text-rose-950 uppercase border-b border-rose-200 pb-1 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>Detalle del Diagnóstico del Sistema:</span>
              </p>
              <p className="text-xs font-mono text-rose-900 leading-relaxed bg-white/80 p-2 border border-rose-200">
                {printErrorMessage || 'No se pudo establecer comunicación con el dispositivo de impresión.'}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 p-3 space-y-1">
              <p className="font-mono font-bold text-xs text-emerald-950 uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>🛡️ Inventario Protegido Automáticamente</span>
              </p>
              <p className="text-[11px] font-sans text-emerald-900 leading-relaxed">
                El sistema <strong>no registró ningún ingreso en el inventario</strong>. Se previno la creación de registros huérfanos sin etiqueta física.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowPrintErrorModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#141414] shadow-sm cursor-pointer"
              >
                Entendido / Corregir Impresora y Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CONDITION FLAG SELECTION MODAL */}
      <ProductFlagModal
        isOpen={showFlagModal}
        onClose={() => {
          setShowFlagModal(false);
          setIsReprinting(false);
          setPrintStatus((s) => (s === 'sending' ? 'idle' : s));
        }}
        onConfirm={handleConfirmFlagAndPrint}
        productName={reprintLabelOverride ? reprintLabelOverride.productName : selectedProduct?.name}
        productCode={reprintLabelOverride ? reprintLabelOverride.productCode : selectedProduct?.code}
        weight={reprintLabelOverride ? reprintLabelOverride.weight : netWeight}
        unit={reprintLabelOverride ? (reprintLabelOverride.unit || 'KG') : (selectedProduct?.unit || 'KG')}
        lot={reprintLabelOverride ? reprintLabelOverride.lot : lot}
        isReprint={isReprinting}
        initialConditionFlag={reprintLabelOverride ? (reprintLabelOverride.conditionFlag || 'A') : selectedConditionFlag}
        printTargetName={localPrinterConfig.printerName || 'Impresora Local del Sistema'}
      />

      <ConditionExpirationModal
        isOpen={isExpirationModalOpen}
        onClose={() => {
          setIsExpirationModalOpen(false);
          // Refresh expiration date when modal closes
          setExpirationDate(calculateExpirationDate(selectedConditionFlag, new Date()));
        }}
      />

      {/* SPECIES / ORIGIN AND TARES CATALOG MODAL */}
      <SpeciesCatalogModal
        isOpen={isSpeciesModalOpen}
        onClose={() => setIsSpeciesModalOpen(false)}
        initialTab={speciesModalTab}
        speciesList={speciesList}
        products={products}
        labels={[]}
        onAddSpecies={addSpecies}
        onUpdateSpecies={updateSpecies}
        onDeleteSpecies={deleteSpecies}
      />

      {/* Dedicated Printable Area for Local Printer (USB/Windows Driver) */}
      {(currentlyPrintingLabel || selectedProduct) && (
        <div className="hidden print:block font-mono">
          <SimulatedLabelCanvas
            labelFormatConfig={labelFormatConfig}
            product={
              currentlyPrintingLabel
                ? (products.find((p) => p.id === currentlyPrintingLabel.productId || p.code === currentlyPrintingLabel.productCode) || selectedProduct)
                : selectedProduct
            }
            lot={currentlyPrintingLabel ? currentlyPrintingLabel.lot : (reprintLabelOverride ? reprintLabelOverride.lot : lot)}
            weight={currentlyPrintingLabel ? currentlyPrintingLabel.weight : (reprintLabelOverride ? reprintLabelOverride.weight : netWeight)}
            unit={currentlyPrintingLabel ? (currentlyPrintingLabel.unit || 'KG') : (reprintLabelOverride ? (reprintLabelOverride.unit || 'KG') : (selectedProduct?.unit || 'KG'))}
            warehouse={currentlyPrintingLabel ? currentlyPrintingLabel.warehouse : (reprintLabelOverride ? reprintLabelOverride.warehouse : warehouse)}
            conditionFlag={currentlyPrintingLabel ? (currentlyPrintingLabel.conditionFlag || 'A') : (reprintLabelOverride ? (reprintLabelOverride.conditionFlag || 'A') : selectedConditionFlag)}
            expirationDate={currentlyPrintingLabel ? currentlyPrintingLabel.expirationDate : (reprintLabelOverride ? reprintLabelOverride.expirationDate : (hasExpiration ? expirationDate : undefined))}
            domicilio={currentlyPrintingLabel ? currentlyPrintingLabel.domicilio : (reprintLabelOverride ? reprintLabelOverride.domicilio : domicilio)}
            speciesLegend={currentlyPrintingLabel ? currentlyPrintingLabel.speciesLegend : activeSpecies}
            timestamp={currentlyPrintingLabel ? currentlyPrintingLabel.printTimestamp : (reprintLabelOverride ? reprintLabelOverride.printTimestamp : currentTimestamp)}
            labelId={currentlyPrintingLabel ? currentlyPrintingLabel.id : activeLabelId}
          />
        </div>
      )}
    </div>
  );
};
