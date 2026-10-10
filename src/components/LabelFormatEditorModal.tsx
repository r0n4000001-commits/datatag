import React, { useState, useMemo } from 'react';
import {
  X,
  Sliders,
  Ruler,
  Maximize2,
  Barcode,
  QrCode,
  Building2,
  MapPin,
  Eye,
  RotateCcw,
  Printer,
  Copy,
  Sparkles,
  Layers,
  FileCode,
  Image as ImageIcon,
  Scale,
  Calendar,
  Move,
  Tag,
  Type,
  Thermometer,
  Save,
  Download,
  Upload,
  Check,
  Plus,
  Trash2,
  Bookmark,
  Minus,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { LabelFormatConfig, BarcodeType, Product, SavedLabelTemplate } from '../types';
import { LABEL_FORMAT_PRESETS } from '../data/initialData';
import { generateZplCode } from '../utils/zplGenerator';
import { generateCompactBarcodePayload, explainBarcodePayload } from '../utils/barcodeFormat';
import { getDailyLotCode } from '../utils/productAndLotUtils';
import { compressLogoDataUrl } from '../utils/imageCompressor';
import { SimulatedLabelCanvas } from './SimulatedLabelCanvas';
import { ZebraFontSelector } from './ZebraFontSelector';
import { ConfirmDialog, ConfirmDialogState } from './ConfirmDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ElementKey =
  | 'medidas'
  | 'header'
  | 'dividerLine'
  | 'logo'
  | 'productName'
  | 'speciesLegend'
  | 'details'
  | 'lot'
  | 'weight'
  | 'expiration'
  | 'temperature'
  | 'barcode'
  | 'address'
  | 'footer';

export const LabelFormatEditorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    labelFormatConfig,
    updateLabelFormatConfig,
    resetLabelFormatConfig,
    savedLabelTemplates,
    saveLabelDesignPermanently,
    reloadLabelFormatFromCloud,
    isLabelConfigLoadedFromCloud,
    saveAsNewTemplate,
    deleteSavedTemplate,
    loadSavedTemplate,
    printerConfig,
    products,
  } = useInventory();

  // Local state for active element selected for editing
  const [activeElement, setActiveElement] = useState<ElementKey>('medidas');

  // Permanent Save status feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Modal / prompt for saving new template
  const [showNewTemplateModal, setShowNewTemplateModal] = useState<boolean>(false);
  const [templateNameInput, setTemplateNameInput] = useState<string>('');

  // Modal for import JSON
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  // File input ref for logo upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Aspect ratio lock for logo to prevent distortion
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);

  const handleLogoWidthChange = (newWidth: number) => {
    const curW = labelFormatConfig.logoWidth || 120;
    const curH = labelFormatConfig.logoHeight || 65;
    if (lockAspectRatio && curW > 0 && curH > 0) {
      const ratio = curW / curH;
      const newHeight = Math.max(15, Math.min(600, Math.round(newWidth / ratio)));
      updateLabelFormatConfig({ logoWidth: newWidth, logoHeight: newHeight });
    } else {
      updateLabelFormatConfig({ logoWidth: newWidth });
    }
  };

  const handleLogoHeightChange = (newHeight: number) => {
    const curW = labelFormatConfig.logoWidth || 120;
    const curH = labelFormatConfig.logoHeight || 65;
    if (lockAspectRatio && curW > 0 && curH > 0) {
      const ratio = curW / curH;
      const newWidth = Math.max(15, Math.min(800, Math.round(newHeight * ratio)));
      updateLabelFormatConfig({ logoWidth: newWidth, logoHeight: newHeight });
    } else {
      updateLabelFormatConfig({ logoHeight: newHeight });
    }
  };

  // Selected sample product for live preview
  const [selectedSampleProdId, setSelectedSampleProdId] = useState<string>(
    products[0]?.id || 'prod-1'
  );

  // Labelary preview state
  const [labelaryUrl, setLabelaryUrl] = useState<string | null>(null);
  const [isLoadingLabelary, setIsLoadingLabelary] = useState<boolean>(false);

  // Show ZPL drawer
  const [showZplDrawer, setShowZplDrawer] = useState<boolean>(false);
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);

  // Print test state
  const [isPrintingTest, setIsPrintingTest] = useState<boolean>(false);
  const [printTestResult, setPrintTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSavingAndClosing, setIsSavingAndClosing] = useState<boolean>(false);

  // Active sample product
  const sampleProduct: Product = useMemo(() => {
    return (
      products.find((p) => p.id === selectedSampleProdId) ||
      products[0] || {
        id: 'demo-1',
        code: '12-345',
        name: 'Carne de Res Molida Premium',
        category: 'Carnes',
        unit: 'KG',
        reorderPoint: 20,
        barcodeType: 'QRCode',
        warehouse: 'Congelado',
        defaultWeight: 25.0,
      }
    );
  }, [products, selectedSampleProdId]);

  // Generate dynamic sample ZPL
  const sampleLabelData = useMemo(() => {
    return {
      id: 'LBL-PREVIEW-01',
      product: sampleProduct,
      lot: getDailyLotCode(),
      weight: sampleProduct.defaultWeight || 25.0,
      unit: sampleProduct.unit || 'KG',
      warehouse: sampleProduct.warehouse || 'Congelado',
      expirationDate: '2026-12-31',
      domicilio: labelFormatConfig.addressText || 'DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000',
      speciesLegend: labelFormatConfig.speciesLegendText || '%100 CERDO',
      timestamp: new Date().toISOString(),
    };
  }, [sampleProduct, labelFormatConfig.addressText, labelFormatConfig.speciesLegendText]);

  const { zpl } = useMemo(() => {
    return generateZplCode(sampleLabelData, printerConfig, labelFormatConfig);
  }, [sampleLabelData, printerConfig, labelFormatConfig]);

  if (!isOpen) return null;

  // Handle Preset selection
  const handleSelectPreset = (preset: LabelFormatConfig) => {
    updateLabelFormatConfig(preset);
    setLabelaryUrl(null);
  };

  // Drag callback when user moves an element directly on canvas
  const handleElementMove = (key: string, newX: number, newY: number) => {
    switch (key) {
      case 'header':
        updateLabelFormatConfig({ headerX: newX, headerY: newY });
        break;
      case 'dividerLine':
        updateLabelFormatConfig({ dividerLineX: newX, dividerLineY: newY });
        break;
      case 'logo':
        updateLabelFormatConfig({ logoX: newX, logoY: newY });
        break;
      case 'productName':
        updateLabelFormatConfig({ productNameX: newX, productNameY: newY });
        break;
      case 'speciesLegend':
        updateLabelFormatConfig({ speciesLegendX: newX, speciesLegendY: newY });
        break;
      case 'details':
        updateLabelFormatConfig({ detailsX: newX, detailsY: newY });
        break;
      case 'lot':
        updateLabelFormatConfig({ lotX: newX, lotY: newY });
        break;
      case 'weight':
        updateLabelFormatConfig({ weightX: newX, weightY: newY });
        break;
      case 'expiration':
        updateLabelFormatConfig({ expirationX: newX, expirationY: newY });
        break;
      case 'temperature':
        updateLabelFormatConfig({ temperatureX: newX, temperatureY: newY });
        break;
      case 'barcode':
        updateLabelFormatConfig({ barcodePositionX: newX, barcodePositionY: newY });
        break;
      case 'address':
        updateLabelFormatConfig({ addressX: newX, addressY: newY });
        break;
      case 'footer':
        updateLabelFormatConfig({ footerX: newX, footerY: newY });
        break;
      default:
        break;
    }
  };

  // Fetch real Labelary Zebra render
  const handleFetchLabelary = async () => {
    setIsLoadingLabelary(true);
    setLabelaryUrl(null);
    try {
      const res = await fetch('/api/zebra/labelary-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zpl,
          width: labelFormatConfig.widthInches,
          height: labelFormatConfig.heightInches,
          dpmm: labelFormatConfig.dpi === 300 ? 12 : 8,
        }),
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setLabelaryUrl(data.imageUrl);
      } else {
        alert(data.error || 'No se pudo generar la vista previa de Labelary.');
      }
    } catch (err: any) {
      alert('Error al conectar con el motor Labelary: ' + err.message);
    } finally {
      setIsLoadingLabelary(false);
    }
  };

  // Send sample print to Zebra
  const handlePrintSample = async () => {
    setIsPrintingTest(true);
    setPrintTestResult(null);

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
        setPrintTestResult({
          success: true,
          message: '¡Etiqueta enviada a la impresora Zebra correctamente!',
        });
      } else {
        setPrintTestResult({
          success: false,
          message: data.error || 'Error al enviar la etiqueta a la impresora.',
        });
      }
    } catch (err: any) {
      setPrintTestResult({
        success: false,
        message: 'Error de comunicación: ' + err.message,
      });
    } finally {
      setIsPrintingTest(false);
    }
  };

  // Copy ZPL code
  const handleCopyZpl = () => {
    navigator.clipboard.writeText(zpl);
    setCopiedZpl(true);
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  const handleSaveAndClose = async () => {
    setIsSavingAndClosing(true);
    setSaveStatus('saving');
    setSaveFeedback('Guardando diseño en Firebase Firestore...');
    try {
      updateLabelFormatConfig(labelFormatConfig);
      const res = await saveLabelDesignPermanently(labelFormatConfig);
      setSaveStatus('saved');
      setSaveFeedback(res.message);
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (e) {
      console.warn('Save before close notice:', e);
    } finally {
      setIsSavingAndClosing(false);
      onClose();
    }
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateNameInput.trim()) return;
    await saveAsNewTemplate(templateNameInput.trim(), labelFormatConfig);
    setShowNewTemplateModal(false);
    setTemplateNameInput('');
    setSaveStatus('saved');
    setSaveFeedback('Plantilla guardada permanentemente en tus diseños');
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveFeedback('');
    }, 3500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(labelFormatConfig, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const safeName = (labelFormatConfig.presetName || 'etiqueta_zpl').toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadAnchor.setAttribute('download', `diseno_${safeName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = async () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.widthInches !== 'number') {
        throw new Error('El archivo JSON no contiene una estructura válida de diseño de etiqueta.');
      }
      const timestamped = {
        ...parsed,
        savedAt: Date.now(),
      };
      setSaveStatus('saving');
      setSaveFeedback('Importando formato y guardando como configuración inicial del sistema...');

      updateLabelFormatConfig(timestamped);
      const res = await saveLabelDesignPermanently(timestamped);

      // Register template in saved label templates
      const templateName = parsed.presetName || 'Formato Personalizado';
      await saveAsNewTemplate(templateName, timestamped);

      setShowImportModal(false);
      setImportJsonText('');
      setSaveStatus('saved');
      setSaveFeedback(`¡Formato "${templateName}" guardado y configurado como inicial al iniciar el programa!`);
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveFeedback('');
      }, 4500);
    } catch (err: any) {
      setSaveStatus('idle');
      setImportError(err.message || 'Error al procesar el archivo JSON.');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
        try {
          const testParse = JSON.parse(content);
          if (testParse && typeof testParse === 'object') {
            setImportError(null);
          }
        } catch {
          setImportError('El archivo seleccionado no es un JSON válido.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#E4E3E0] border-2 border-[#141414] shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col rounded-none overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between border-b border-[#2A2A28] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-400 text-[#141414] flex items-center justify-center font-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-white">
                  EDITOR Y DISEÑADOR DE FORMATO DE ETIQUETA ZPL
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600">
                  <Cloud className="w-2.5 h-2.5 text-amber-400" />
                  {isLabelConfigLoadedFromCloud ? 'Firebase: Respaldado' : 'Firebase: Sincronizando'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  <Check className="w-2.5 h-2.5 text-emerald-400" /> Auto-Guardado
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#A0A09C]">
                Las modificaciones en posición, logos y textos se guardan automáticamente en tu dispositivo y se respaldan en Firebase Firestore
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndClose}
              disabled={isSavingAndClosing}
              className="p-1 hover:bg-[#2A2A28] text-[#A0A09C] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              title="Guardar y cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector Bar */}
        <div className="bg-[#D4D3D0] border-b border-[#141414] px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[10px] uppercase text-[#555] mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Plantillas:
            </span>
            {LABEL_FORMAT_PRESETS.map((p, idx) => {
              const isSelected =
                labelFormatConfig.widthInches === p.widthInches &&
                labelFormatConfig.heightInches === p.heightInches &&
                labelFormatConfig.presetName === p.presetName;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 text-[11px] font-bold border transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#141414] text-amber-400 border-[#141414]'
                      : 'bg-white text-[#141414] border-[#141414] hover:bg-gray-100'
                  }`}
                >
                  {p.presetName}
                </button>
              );
            })}

            {/* User Custom Saved Templates */}
            {savedLabelTemplates && savedLabelTemplates.length > 0 && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-gray-400 flex-wrap">
                <span className="font-bold text-[10px] uppercase text-[#141414] flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-amber-700" /> Mis Diseños:
                </span>
                {savedLabelTemplates.map((t) => {
                  const isCurrent = labelFormatConfig.presetName === t.name;
                  return (
                    <div key={t.id} className="inline-flex items-center border border-[#141414] bg-white text-[11px]">
                      <button
                        onClick={() => loadSavedTemplate(t)}
                        className={`px-2 py-1 font-bold ${
                          isCurrent ? 'bg-amber-400 text-black' : 'hover:bg-amber-100 text-[#141414]'
                        }`}
                        title={`Cargar diseño guardado: ${t.name}`}
                      >
                        {t.name}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Eliminar Plantilla de Etiqueta',
                            message: `¿Está seguro de eliminar la plantilla guardada "${t.name}"?`,
                            confirmText: 'Sí, Eliminar Plantilla',
                            danger: true,
                            onConfirm: () => {
                              deleteSavedTemplate(t.id);
                            },
                          });
                        }}
                        className="px-1.5 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 border-l border-gray-300 cursor-pointer"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setShowNewTemplateModal(true)}
              className="text-[10px] font-bold text-gray-900 bg-amber-300 hover:bg-amber-200 border border-[#141414] px-2 py-1 flex items-center gap-1"
              title="Guardar la configuración actual como una plantilla nombrada"
            >
              <Plus className="w-3 h-3" /> Guardar como Plantilla
            </button>

            <button
              onClick={handleExportJson}
              className="text-[10px] font-bold text-gray-800 bg-white hover:bg-gray-100 border border-[#141414] px-2 py-1 flex items-center gap-1"
              title="Exportar archivo de diseño JSON para respaldo"
            >
              <Download className="w-3 h-3" /> Exportar
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="text-[10px] font-bold text-gray-800 bg-white hover:bg-gray-100 border border-[#141414] px-2 py-1 flex items-center gap-1"
              title="Importar diseño desde archivo o texto JSON"
            >
              <Upload className="w-3 h-3" /> Importar
            </button>

            <button
              onClick={() => {
                setConfirmDialog({
                  title: 'Restablecer Formato de Etiqueta',
                  message: '¿Está seguro de restablecer el diseño de etiqueta a la configuración predeterminada de fábrica?',
                  confirmText: 'Sí, Restablecer Diseño',
                  danger: true,
                  onConfirm: () => {
                    resetLabelFormatConfig();
                  },
                });
              }}
              className="text-[10px] font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 border border-[#141414] px-2 py-1 flex items-center gap-1 cursor-pointer"
              title="Restablecer formato predeterminado"
            >
              <RotateCcw className="w-3 h-3" /> Restablecer
            </button>
          </div>
        </div>

        {/* Main Body (Grid Split: Left Controls / Right Canvas Preview) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-[#141414]">
          {/* LEFT: Element Selection & Property Sliders (Col 6) */}
          <div className="lg:col-span-6 p-4 flex flex-col space-y-3 bg-[#E4E3E0] overflow-y-auto">
            <span className="font-mono text-[11px] font-bold uppercase text-[#555] flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-amber-600" /> Seleccionar Elemento a Personalizar:
            </span>

            {/* Element Selector Subtabs */}
            <div className="grid grid-cols-3 gap-1 font-mono text-[10px] border border-[#141414] bg-[#D4D3D0] p-1">
              <button
                onClick={() => setActiveElement('medidas')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'medidas'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Ruler className="w-3 h-3" /> 1. Medidas
              </button>
              <button
                onClick={() => setActiveElement('header')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'header'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-3 h-3" /> 2. Empresa
              </button>
              <button
                onClick={() => setActiveElement('dividerLine')}
                className={`py-1.5 px-2 font-bold flex items-center justify-between gap-1 transition-colors ${
                  activeElement === 'dividerLine'
                    ? 'bg-[#141414] text-amber-400 ring-2 ring-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Minus className="w-3 h-3 text-amber-500" /> 2b. Línea Divisoria
                </span>
                {labelFormatConfig.showDividerLine !== false && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Línea activa" />
                )}
              </button>
              <button
                onClick={() => setActiveElement('logo')}
                className={`py-1.5 px-2 font-bold flex items-center justify-between gap-1 transition-colors ${
                  activeElement === 'logo'
                    ? 'bg-[#141414] text-amber-400 ring-2 ring-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-amber-500" /> 3. Logo
                </span>
                {labelFormatConfig.showLogo && labelFormatConfig.logoUrl && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Logo activo" />
                )}
              </button>
              <button
                onClick={() => setActiveElement('productName')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'productName'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Tag className="w-3 h-3" /> 4. Producto
              </button>
              <button
                onClick={() => setActiveElement('speciesLegend')}
                className={`py-1.5 px-2 font-bold flex items-center justify-between transition-colors ${
                  activeElement === 'speciesLegend'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-500" /> 4b. Especie
                </span>
                {labelFormatConfig.showSpeciesLegend !== false && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Activo" />
                )}
              </button>
              <button
                onClick={() => setActiveElement('details')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'details'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Type className="w-3 h-3" /> 5. Código/Detalles
              </button>
              <button
                onClick={() => setActiveElement('lot')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'lot'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Layers className="w-3 h-3" /> 6. Lote
              </button>
              <button
                onClick={() => setActiveElement('weight')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'weight'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Scale className="w-3 h-3" /> 7. Peso
              </button>
              <button
                onClick={() => setActiveElement('expiration')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'expiration'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-3 h-3" /> 8. Caducidad
              </button>
              <button
                onClick={() => setActiveElement('temperature')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'temperature'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Thermometer className="w-3 h-3" /> 9. Temperatura
              </button>
              <button
                onClick={() => setActiveElement('barcode')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'barcode'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <QrCode className="w-3 h-3" /> 10. Código QR
              </button>
              <button
                onClick={() => setActiveElement('address')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'address'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <MapPin className="w-3 h-3" /> 11. Domicilio
              </button>
              <button
                onClick={() => setActiveElement('footer')}
                className={`py-1.5 px-2 font-bold flex items-center gap-1 transition-colors ${
                  activeElement === 'footer'
                    ? 'bg-[#141414] text-amber-400'
                    : 'bg-white text-[#141414] hover:bg-gray-100'
                }`}
              >
                <Type className="w-3 h-3" /> 12. Pie
              </button>
            </div>

            {/* ELEMENT CONTROLS CARD */}
            <div className="bg-white p-3 border border-[#141414] font-mono text-xs space-y-3">
              {/* 1. MEDIDAS */}
              {activeElement === 'medidas' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#141414] uppercase border-b border-gray-200 pb-1 flex items-center gap-1.5">
                    <Maximize2 className="w-4 h-4 text-amber-600" /> Dimensiones y Resolución
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Ancho (Pulgadas)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="8"
                        value={labelFormatConfig.widthInches}
                        onChange={(e) =>
                          updateLabelFormatConfig({ widthInches: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                      <span className="text-[9px] text-[#777]">
                        {(labelFormatConfig.widthInches * 25.4).toFixed(0)} mm
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Alto (Pulgadas)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="12"
                        value={labelFormatConfig.heightInches}
                        onChange={(e) =>
                          updateLabelFormatConfig({ heightInches: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                      <span className="text-[9px] text-[#777]">
                        {(labelFormatConfig.heightInches * 25.4).toFixed(0)} mm
                      </span>
                    </div>
                  </div>

                  {/* Quick Size Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-[#777]">Tamaños:</span>
                    {[
                      { w: 4, h: 4, label: '4" x 4"' },
                      { w: 4, h: 3, label: '4" x 3"' },
                      { w: 4, h: 2, label: '4" x 2"' },
                      { w: 4, h: 6, label: '4" x 6"' },
                      { w: 3, h: 2, label: '3" x 2"' },
                    ].map((sz) => (
                      <button
                        key={`${sz.w}x${sz.h}`}
                        type="button"
                        onClick={() =>
                          updateLabelFormatConfig({ widthInches: sz.w, heightInches: sz.h })
                        }
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded cursor-pointer transition-colors ${
                          labelFormatConfig.widthInches === sz.w && labelFormatConfig.heightInches === sz.h
                            ? 'bg-amber-100 text-amber-900 border-amber-600'
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        DPI
                      </label>
                      <select
                        value={labelFormatConfig.dpi}
                        onChange={(e) =>
                          updateLabelFormatConfig({
                            dpi: Number(e.target.value) as 203 | 300 | 600,
                          })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      >
                        <option value={203}>203 DPI</option>
                        <option value={300}>300 DPI</option>
                        <option value={600}>600 DPI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Densidad Térmica (MD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={labelFormatConfig.darkness}
                        onChange={(e) =>
                          updateLabelFormatConfig({ darkness: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Margen Global X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.offsetX}
                        onChange={(e) =>
                          updateLabelFormatConfig({ offsetX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Margen Global Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.offsetY}
                        onChange={(e) =>
                          updateLabelFormatConfig({ offsetY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HEADER */}
              {activeElement === 'header' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" /> Encabezado de Empresa
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showCompanyHeader}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showCompanyHeader: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Texto del Encabezado
                    </label>
                    <input
                      type="text"
                      value={labelFormatConfig.companyHeader}
                      onChange={(e) =>
                        updateLabelFormatConfig({ companyHeader: e.target.value })
                      }
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                    />
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.headerFont}
                    onChange={(font) => updateLabelFormatConfig({ headerFont: font })}
                    label="Fuente Zebra del Encabezado"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.headerFontSize}pt</span>
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="60"
                      value={labelFormatConfig.headerFontSize}
                      onChange={(e) =>
                        updateLabelFormatConfig({ headerFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.headerX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ headerX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.headerY ?? 20}
                        onChange={(e) =>
                          updateLabelFormatConfig({ headerY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2b. LÍNEA DIVISORIA HORIZONTAL (Configurable y Movible) */}
              {activeElement === 'dividerLine' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Minus className="w-4 h-4 text-amber-600" /> Línea Divisoria Horizontal
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showDividerLine !== false}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showDividerLine: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar Línea</span>
                    </label>
                  </div>

                  <p className="text-[11px] text-gray-600">
                    Elemento separador visual libre. Puedes arrastrar la línea directamente en el lienzo interactivo o especificar sus coordenadas en dots.
                  </p>

                  {/* Posiciones Rápidas */}
                  <div className="p-2.5 bg-gray-50 border border-[#141414] space-y-1.5">
                    <span className="block text-[10px] font-bold uppercase text-[#555]">
                      Posiciones Rápidas:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => updateLabelFormatConfig({ dividerLineX: 30, dividerLineY: 62 })}
                        className="py-1 px-2 bg-white hover:bg-amber-100 border border-gray-300 font-bold text-left"
                      >
                        📍 Bajo Encabezado (Y=62)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLabelFormatConfig({ dividerLineX: 30, dividerLineY: 125 })}
                        className="py-1 px-2 bg-white hover:bg-amber-100 border border-gray-300 font-bold text-left"
                      >
                        📍 Bajo Producto (Y=125)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLabelFormatConfig({ dividerLineX: 30, dividerLineY: 285 })}
                        className="py-1 px-2 bg-white hover:bg-amber-100 border border-gray-300 font-bold text-left"
                      >
                        📍 Sobre Código Barras (Y=285)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fullWidth = Math.round(labelFormatConfig.widthInches * labelFormatConfig.dpi) - ((labelFormatConfig.offsetX ?? 20) * 2);
                          updateLabelFormatConfig({ dividerLineX: 20, dividerLineWidth: fullWidth });
                        }}
                        className="py-1 px-2 bg-white hover:bg-amber-100 border border-gray-300 font-bold text-left"
                      >
                        ↔️ Ancho Completo
                      </button>
                    </div>
                  </div>

                  {/* Grosor de la Línea */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold uppercase text-[#555]">
                        Grosor de la Línea: <span className="text-amber-700 font-extrabold">{labelFormatConfig.dividerLineThickness ?? 2} dots</span>
                      </label>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {((labelFormatConfig.dividerLineThickness ?? 2) / (labelFormatConfig.dpi / 25.4)).toFixed(2)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={labelFormatConfig.dividerLineThickness ?? 2}
                      onChange={(e) =>
                        updateLabelFormatConfig({ dividerLineThickness: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 6, 8, 10].map((th) => (
                        <button
                          key={th}
                          type="button"
                          onClick={() => updateLabelFormatConfig({ dividerLineThickness: th })}
                          className={`flex-1 py-0.5 text-[9px] font-mono font-bold border ${
                            (labelFormatConfig.dividerLineThickness ?? 2) === th
                              ? 'bg-amber-400 text-black border-[#141414]'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {th}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Longitud / Ancho de la Línea */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold uppercase text-[#555]">
                        Longitud / Ancho de la Línea: <span className="text-amber-700 font-extrabold">{labelFormatConfig.dividerLineWidth ?? 750} dots</span>
                      </label>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {((labelFormatConfig.dividerLineWidth ?? 750) / (labelFormatConfig.dpi / 25.4)).toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max={Math.round(labelFormatConfig.widthInches * labelFormatConfig.dpi)}
                      value={labelFormatConfig.dividerLineWidth ?? 750}
                      onChange={(e) =>
                        updateLabelFormatConfig({ dividerLineWidth: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-gray-500 font-mono">50 dots</span>
                      <button
                        type="button"
                        onClick={() => {
                          const totalDots = Math.round(labelFormatConfig.widthInches * labelFormatConfig.dpi);
                          const margin = (labelFormatConfig.offsetX ?? 20);
                          const currentX = labelFormatConfig.dividerLineX ?? 30;
                          updateLabelFormatConfig({ dividerLineWidth: Math.max(50, totalDots - currentX - margin) });
                        }}
                        className="text-[10px] text-amber-800 underline font-bold hover:text-amber-900"
                      >
                        Ajustar al margen derecho
                      </button>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {Math.round(labelFormatConfig.widthInches * labelFormatConfig.dpi)} dots
                      </span>
                    </div>
                  </div>

                  {/* Posición X e Y */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.dividerLineX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ dividerLineX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.dividerLineY ?? 62}
                        onChange={(e) =>
                          updateLabelFormatConfig({ dividerLineY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Vista previa del trazo */}
                  <div className="p-3 bg-white border border-gray-300 rounded space-y-1">
                    <span className="text-[9px] font-bold uppercase text-gray-500">
                      Vista previa del trazo:
                    </span>
                    <div className="py-2 flex items-center justify-start overflow-hidden">
                      <div
                        style={{
                          height: `${Math.max(1, labelFormatConfig.dividerLineThickness ?? 2)}px`,
                          width: `${Math.min(100, Math.round(((labelFormatConfig.dividerLineWidth ?? 750) / (labelFormatConfig.widthInches * labelFormatConfig.dpi)) * 100))}%`,
                        }}
                        className="bg-black"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. LOGO DE EMPRESA */}
              {activeElement === 'logo' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" /> Logo de Empresa / Marca
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showLogo || false}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showLogo: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar Logo</span>
                    </label>
                  </div>

                  {/* Logo Preview & Upload */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-16 bg-white border border-gray-300 rounded flex items-center justify-center overflow-hidden p-1 shadow-inner">
                        {labelFormatConfig.logoUrl ? (
                          <img
                            src={labelFormatConfig.logoUrl}
                            alt="Logo preview"
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 font-sans text-center">Sin Logo</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = async (uploadEvent) => {
                                const rawResult = uploadEvent.target?.result as string;
                                try {
                                  // Preserve crisp resolution, clean vectors and PNG transparency
                                  const optimized = await compressLogoDataUrl(rawResult, 1200);

                                  // Read image natural dimensions to preserve perfect aspect ratio without distortion
                                  const img = new Image();
                                  img.onload = () => {
                                    const naturalW = img.naturalWidth || 130;
                                    const naturalH = img.naturalHeight || 65;
                                    const ratio = naturalW / Math.max(1, naturalH);

                                    // Scale proportionally to default preview size
                                    let newW = 140;
                                    let newH = Math.max(15, Math.round(newW / ratio));
                                    if (newH > 85) {
                                      newH = 85;
                                      newW = Math.max(15, Math.round(newH * ratio));
                                    }

                                    updateLabelFormatConfig({
                                      logoUrl: optimized,
                                      showLogo: true,
                                      logoWidth: newW,
                                      logoHeight: newH,
                                    });
                                  };
                                  img.onerror = () => {
                                    updateLabelFormatConfig({
                                      logoUrl: optimized,
                                      showLogo: true,
                                    });
                                  };
                                  img.src = optimized;
                                } catch {
                                  updateLabelFormatConfig({
                                    logoUrl: rawResult,
                                    showLogo: true,
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-1.5 px-2 bg-[#141414] text-white hover:bg-amber-600 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Subir Imagen de Logo
                        </button>
                        {labelFormatConfig.logoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLabelFormatConfig({ logoUrl: '', showLogo: false })
                            }
                            className="w-full py-1 px-2 bg-red-100 text-red-700 hover:bg-red-200 text-[10px] font-bold border border-red-300"
                          >
                            Eliminar Logo
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        O ingresar URL de Imagen
                      </label>
                      <input
                        type="text"
                        placeholder="https://ejemplo.com/logo.png"
                        value={labelFormatConfig.logoUrl || ''}
                        onChange={(e) =>
                          updateLabelFormatConfig({
                            logoUrl: e.target.value,
                            showLogo: Boolean(e.target.value),
                          })
                        }
                        className="w-full p-2 bg-white border border-[#141414] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Quick alignment presets */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Ubicación Rápida del Logo:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          updateLabelFormatConfig({
                            logoX: 620,
                            logoY: 15,
                            logoWidth: 130,
                            logoHeight: 65,
                            showLogo: true,
                          })
                        }
                        className="p-1.5 bg-white border border-[#141414] hover:bg-amber-100 font-bold text-left text-[#141414]"
                      >
                        ↗ Sup. Derecha (Cabecera)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLabelFormatConfig({
                            logoX: 25,
                            logoY: 15,
                            logoWidth: 130,
                            logoHeight: 65,
                            showLogo: true,
                          })
                        }
                        className="p-1.5 bg-white border border-[#141414] hover:bg-amber-100 font-bold text-left text-[#141414]"
                      >
                        ↖ Sup. Izquierda
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLabelFormatConfig({
                            logoX: 330,
                            logoY: 10,
                            logoWidth: 150,
                            logoHeight: 70,
                            showLogo: true,
                          })
                        }
                        className="p-1.5 bg-white border border-[#141414] hover:bg-amber-100 font-bold text-left text-[#141414]"
                      >
                        ⬆ Centro Superior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLabelFormatConfig({
                            logoX: 580,
                            logoY: 460,
                            logoWidth: 120,
                            logoHeight: 65,
                            showLogo: true,
                          })
                        }
                        className="p-1.5 bg-white border border-[#141414] hover:bg-amber-100 font-bold text-left text-[#141414]"
                      >
                        ↘ Inferior / Sello
                      </button>
                    </div>
                  </div>

                  {/* Size sliders and direct inputs */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-[#141414]">
                        Tamaño del Logo (Dots)
                      </span>
                      {/* Quick Scalers */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const curW = labelFormatConfig.logoWidth || 120;
                            const curH = labelFormatConfig.logoHeight || 65;
                            updateLabelFormatConfig({
                              logoWidth: Math.max(15, Math.round(curW * 0.75)),
                              logoHeight: Math.max(15, Math.round(curH * 0.75)),
                            });
                          }}
                          className="px-1.5 py-0.5 bg-white border border-[#141414] hover:bg-gray-200 text-[9px] font-bold font-mono"
                          title="Reducir 25%"
                        >
                          -25%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curW = labelFormatConfig.logoWidth || 120;
                            const curH = labelFormatConfig.logoHeight || 65;
                            updateLabelFormatConfig({
                              logoWidth: Math.min(800, Math.round(curW * 1.25)),
                              logoHeight: Math.min(600, Math.round(curH * 1.25)),
                            });
                          }}
                          className="px-1.5 py-0.5 bg-white border border-[#141414] hover:bg-gray-200 text-[9px] font-bold font-mono"
                          title="Aumentar 25%"
                        >
                          +25%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curW = labelFormatConfig.logoWidth || 120;
                            const curH = labelFormatConfig.logoHeight || 65;
                            updateLabelFormatConfig({
                              logoWidth: Math.min(800, Math.round(curW * 1.5)),
                              logoHeight: Math.min(600, Math.round(curH * 1.5)),
                            });
                          }}
                          className="px-2 py-0.5 bg-amber-500 text-[#141414] hover:bg-amber-400 text-[9px] font-black font-mono border border-[#141414]"
                          title="Aumentar 50% de tamaño"
                        >
                          +50% Tamaño
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const curW = labelFormatConfig.logoWidth || 120;
                            const curH = labelFormatConfig.logoHeight || 65;
                            updateLabelFormatConfig({
                              logoWidth: Math.min(800, Math.round(curW * 2.0)),
                              logoHeight: Math.min(600, Math.round(curH * 2.0)),
                            });
                          }}
                          className="px-1.5 py-0.5 bg-white border border-[#141414] hover:bg-gray-200 text-[9px] font-bold font-mono"
                          title="Duplicar tamaño (+100%)"
                        >
                          2X
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateLabelFormatConfig({
                              logoWidth: 130,
                              logoHeight: 65,
                            })
                          }
                          className="px-1.5 py-0.5 bg-gray-200 text-gray-700 hover:bg-gray-300 text-[9px] font-bold"
                          title="Restablecer tamaño predeterminado (130x65)"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Aspect ratio lock control */}
                    <div className="flex items-center justify-between bg-white px-2 py-1 border border-gray-200 rounded text-[10px]">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={lockAspectRatio}
                          onChange={(e) => setLockAspectRatio(e.target.checked)}
                          className="accent-amber-500 rounded"
                        />
                        <span>🔒 Mantener proporción original (sin distorsión)</span>
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {lockAspectRatio ? 'Escala Proporcional Activa' : 'Escala Libre'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#555]">
                            Ancho:
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="20"
                              max="800"
                              value={labelFormatConfig.logoWidth || 120}
                              onChange={(e) => handleLogoWidthChange(Number(e.target.value))}
                              className="w-16 p-0.5 text-right font-mono text-xs font-bold border border-gray-300 bg-white"
                            />
                            <span className="text-[10px] text-gray-500">px</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="600"
                          value={labelFormatConfig.logoWidth || 120}
                          onChange={(e) => handleLogoWidthChange(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#555]">
                            Alto:
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="20"
                              max="600"
                              value={labelFormatConfig.logoHeight || 65}
                              onChange={(e) => handleLogoHeightChange(Number(e.target.value))}
                              className="w-16 p-0.5 text-right font-mono text-xs font-bold border border-gray-300 bg-white"
                            />
                            <span className="text-[10px] text-gray-500">px</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="400"
                          value={labelFormatConfig.logoHeight || 65}
                          onChange={(e) => handleLogoHeightChange(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Position inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.logoX ?? 620}
                        onChange={(e) =>
                          updateLabelFormatConfig({ logoX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.logoY ?? 15}
                        onChange={(e) =>
                          updateLabelFormatConfig({ logoY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PRODUCT NAME */}
              {activeElement === 'productName' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#141414] uppercase border-b border-gray-200 pb-1 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-600" /> Nombre del Producto
                  </h3>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.productNameFont}
                    onChange={(font) => updateLabelFormatConfig({ productNameFont: font })}
                    label="Fuente Zebra del Producto"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.productNameFontSize}pt</span>
                    </label>
                    <input
                      type="range"
                      min="18"
                      max="70"
                      value={labelFormatConfig.productNameFontSize}
                      onChange={(e) =>
                        updateLabelFormatConfig({ productNameFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.productNameX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ productNameX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.productNameY ?? 60}
                        onChange={(e) =>
                          updateLabelFormatConfig({ productNameY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4b. LEYENDA DE ESPECIE / IDENTIFICADOR */}
              {activeElement === 'speciesLegend' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-600" /> Leyenda de Especie / Identificador
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showSpeciesLegend !== false}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showSpeciesLegend: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Texto de la Leyenda (%100 CERDO, %100 RES, etc.)
                    </label>
                    <input
                      type="text"
                      value={labelFormatConfig.speciesLegendText || ''}
                      onChange={(e) =>
                        updateLabelFormatConfig({ speciesLegendText: e.target.value })
                      }
                      placeholder="ej. %100 CERDO, %100 RES, %100 AVE..."
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold uppercase"
                    />
                    {/* Quick Suggestions Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className="text-[9px] text-[#777] font-bold">Rápidos:</span>
                      {['%100 CERDO', '%100 RES', '%100 POLLO', '%100 AVE', '%100 MIXTO', '%100 NATURAL'].map((txt) => (
                        <button
                          key={txt}
                          type="button"
                          onClick={() => updateLabelFormatConfig({ speciesLegendText: txt })}
                          className={`text-[9px] font-bold px-1.5 py-0.5 border cursor-pointer transition-colors ${
                            labelFormatConfig.speciesLegendText === txt
                              ? 'bg-amber-400 text-black border-black'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {txt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Estilo Visual en Etiqueta
                    </label>
                    <select
                      value={labelFormatConfig.speciesLegendStyle || 'badge'}
                      onChange={(e) =>
                        updateLabelFormatConfig({ speciesLegendStyle: e.target.value as any })
                      }
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                    >
                      <option value="badge">Invertido Negro (Badge Destacado)</option>
                      <option value="border">Recuadro con Borde (Caja)</option>
                      <option value="standard">Texto Simple (Sin Recuadro)</option>
                    </select>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.speciesLegendFont}
                    onChange={(font) => updateLabelFormatConfig({ speciesLegendFont: font })}
                    label="Fuente Zebra de la Leyenda"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.speciesLegendFontSize || 30}pt</span>
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="50"
                      value={labelFormatConfig.speciesLegendFontSize || 30}
                      onChange={(e) =>
                        updateLabelFormatConfig({ speciesLegendFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.speciesLegendX ?? 520}
                        onChange={(e) =>
                          updateLabelFormatConfig({ speciesLegendX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.speciesLegendY ?? 75}
                        onChange={(e) =>
                          updateLabelFormatConfig({ speciesLegendY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DETAILS */}
              {activeElement === 'details' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#141414] uppercase border-b border-gray-200 pb-1 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-600" /> Código & Almacén
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showCategory}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showCategory: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar Categoría</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showWarehouseBadge}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showWarehouseBadge: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar Almacén</span>
                    </label>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.detailsFont}
                    onChange={(font) => updateLabelFormatConfig({ detailsFont: font })}
                    label="Fuente Zebra de Código & Almacén"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.detailsFontSize || 24}pt</span>
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="40"
                      value={labelFormatConfig.detailsFontSize || 24}
                      onChange={(e) =>
                        updateLabelFormatConfig({ detailsFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.detailsX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ detailsX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.detailsY ?? 110}
                        onChange={(e) =>
                          updateLabelFormatConfig({ detailsY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. LOT */}
              {activeElement === 'lot' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" /> Número de Lote
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showLot}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showLot: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar</span>
                    </label>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.lotFont}
                    onChange={(font) => updateLabelFormatConfig({ lotFont: font })}
                    label="Fuente Zebra del Lote"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.lotFontSize || 26}pt</span>
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="40"
                      value={labelFormatConfig.lotFontSize || 26}
                      onChange={(e) =>
                        updateLabelFormatConfig({ lotFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.lotX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ lotX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.lotY ?? 150}
                        onChange={(e) =>
                          updateLabelFormatConfig({ lotY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. WEIGHT */}
              {activeElement === 'weight' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-600" /> Campo de Peso
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showWeight}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showWeight: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Estilo de Caja
                    </label>
                    <select
                      value={labelFormatConfig.weightBoxStyle}
                      onChange={(e) =>
                        updateLabelFormatConfig({ weightBoxStyle: e.target.value as any })
                      }
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                    >
                      <option value="highlight">Caja Invertida Negra</option>
                      <option value="border">Caja con Borde</option>
                      <option value="standard">Sin Caja (Texto Plano)</option>
                    </select>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.weightFont}
                    onChange={(font) => updateLabelFormatConfig({ weightFont: font })}
                    label="Fuente Zebra del Peso"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.weightFontSize}pt</span>
                    </label>
                    <input
                      type="range"
                      min="18"
                      max="60"
                      value={labelFormatConfig.weightFontSize}
                      onChange={(e) =>
                        updateLabelFormatConfig({ weightFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.weightX ?? 320}
                        onChange={(e) =>
                          updateLabelFormatConfig({ weightX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.weightY ?? 150}
                        onChange={(e) =>
                          updateLabelFormatConfig({ weightY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 7. EXPIRATION */}
              {activeElement === 'expiration' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" /> Fecha de Caducidad
                    </h3>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showExpirationDate}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showExpirationDate: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar</span>
                    </label>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.expirationFont}
                    onChange={(font) => updateLabelFormatConfig({ expirationFont: font })}
                    label="Fuente Zebra de Caducidad"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.expirationFontSize || 24}pt</span>
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="40"
                      value={labelFormatConfig.expirationFontSize || 24}
                      onChange={(e) =>
                        updateLabelFormatConfig({ expirationFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.expirationX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ expirationX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.expirationY ?? 190}
                        onChange={(e) =>
                          updateLabelFormatConfig({ expirationY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 8. TEMPERATURA DE CONSERVACIÓN */}
              {activeElement === 'temperature' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <h3 className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-cyan-600" /> Temperatura de Conservación
                    </h3>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showTemperature !== false}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showTemperature: e.target.checked })
                        }
                        className="accent-amber-500 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-bold text-[#141414]">Mostrar</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Texto de Temperatura / Leyenda
                    </label>
                    <input
                      type="text"
                      value={labelFormatConfig.temperatureText ?? 'MANTENER CONGELADO A -18°C'}
                      onChange={(e) =>
                        updateLabelFormatConfig({ temperatureText: e.target.value })
                      }
                      placeholder="ej. MANTENER CONGELADO A -18°C o MANTENER REFRIGERADO A -4°C"
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold font-mono"
                    />
                    <p className="text-[10px] text-[#777] mt-0.5">
                      Indica las condiciones térmicas requeridas para conservar el producto (ej. refrigeración o congelación).
                    </p>
                  </div>

                  {/* Presets rápidos */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-[#555]">
                      Textos Predeterminados Rápidos:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        { label: '❄️ MANTENER CONGELADO A -18°C', text: 'MANTENER CONGELADO A -18°C' },
                        { label: '🌡️ MANTENER REFRIGERADO A -4°C', text: 'MANTENER REFRIGERADO A -4°C' },
                        { label: '🧊 CONGELADO (-18°C O MENOS)', text: 'MANTENER CONGELADO (-18°C O MENOS)' },
                        { label: '🥗 REFRIGERADO (0°C A 4°C)', text: 'MANTENER REFRIGERADO (0°C A 4°C)' },
                        { label: '📦 LUGAR FRESCO Y SECO', text: 'CONSERVAR EN LUGAR FRESCO Y SECO' },
                        { label: '☀️ TEMPERATURA AMBIENTE', text: 'CONSERVAR A TEMPERATURA AMBIENTE' },
                      ].map((preset) => (
                        <button
                          key={preset.text}
                          type="button"
                          onClick={() => updateLabelFormatConfig({ temperatureText: preset.text })}
                          className={`px-2 py-1.5 text-left text-[10px] font-mono border transition-colors cursor-pointer rounded-xs ${
                            labelFormatConfig.temperatureText === preset.text
                              ? 'bg-[#141414] text-amber-400 font-bold border-[#141414]'
                              : 'bg-gray-50 hover:bg-gray-100 text-[#141414] border-gray-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.temperatureFont}
                    onChange={(font) => updateLabelFormatConfig({ temperatureFont: font })}
                    label="Fuente Zebra de Temperatura"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.temperatureFontSize || 20}pt</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="36"
                      value={labelFormatConfig.temperatureFontSize || 20}
                      onChange={(e) =>
                        updateLabelFormatConfig({ temperatureFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.temperatureX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ temperatureX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.temperatureY ?? 240}
                        onChange={(e) =>
                          updateLabelFormatConfig({ temperatureY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 9. BARCODE / QR CODE */}
              {activeElement === 'barcode' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#141414] uppercase border-b border-gray-200 pb-1 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" /> Código QR (Matriz 2D)
                  </h3>

                  {/* Symbology Info Badge: Only QR Code */}
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase text-emerald-950">
                          QR Code (Matriz 2D Estandarizada)
                        </div>
                        <div className="text-[10px] text-emerald-800">
                          Simbología estándar 2D omnidireccional para pistola lectora y escáner
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-700 text-white font-mono font-bold px-2 py-0.5 rounded-xs uppercase">
                      Activo
                    </span>
                  </div>

                  {/* QR Dimensions: Módulo / Escala de Celda */}
                  <div className="bg-amber-50/70 border-2 border-amber-400 p-3 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-amber-800" />
                        <span className="text-xs font-black uppercase text-amber-950">
                          Tamaño y Escala del Código QR
                        </span>
                      </div>
                      <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 font-mono font-bold uppercase">
                        Lectura Rápida
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-[#333]">
                          Módulo del QR (Dots por celda):
                        </label>
                        <span className="text-xs font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.2 border border-amber-300">
                          Módulo {labelFormatConfig.barcodeModuleWidth || 4} (~{Math.round(35 * (labelFormatConfig.barcodeModuleWidth || 4))} dots / ~{Math.round(35 * (labelFormatConfig.barcodeModuleWidth || 4) * 0.125)} mm)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        step="1"
                        value={labelFormatConfig.barcodeModuleWidth || 4}
                        onChange={(e) =>
                          updateLabelFormatConfig({ barcodeModuleWidth: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      {/* Presets for QR scale */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {[
                          { mod: 3, label: 'Módulo 3 (~105 dots / 13mm)' },
                          { mod: 4, label: 'Módulo 4 (~140 dots / 17mm ⭐)' },
                          { mod: 5, label: 'Módulo 5 (~175 dots / 22mm)' },
                          { mod: 6, label: 'Módulo 6 (~210 dots / 26mm)' },
                        ].map((preset) => (
                          <button
                            key={preset.mod}
                            type="button"
                            onClick={() => updateLabelFormatConfig({ barcodeModuleWidth: preset.mod })}
                            className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border cursor-pointer transition-colors ${
                              (labelFormatConfig.barcodeModuleWidth || 4) === preset.mod
                                ? 'bg-emerald-700 text-white border-emerald-900'
                                : 'bg-white text-gray-800 border-gray-300 hover:bg-emerald-50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-950 font-sans italic bg-amber-100/70 p-2 border border-amber-300 mt-2">
                        💡 <strong>Sugerencia de escaneo:</strong> El tamaño <strong>Módulo 4 o 5</strong> proporciona una ventana de captura instantánea de 360° para pistolas lectoras con cualquier orientación de la caja.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.barcodePositionX}
                        onChange={(e) =>
                          updateLabelFormatConfig({ barcodePositionX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.barcodePositionY}
                        onChange={(e) =>
                          updateLabelFormatConfig({ barcodePositionY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={labelFormatConfig.showBarcodeText}
                      onChange={(e) =>
                        updateLabelFormatConfig({ showBarcodeText: e.target.checked })
                      }
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-[#141414] text-[10px]">
                      Mostrar Folio Legible debajo del Código QR
                    </span>
                  </label>

                  {/* QR EXPLANATION LEGEND */}
                  <div className="bg-[#141414] text-white p-3 border border-[#141414] space-y-2 mt-2">
                    <div className="flex items-center justify-between border-b border-[#3A3A36] pb-1.5">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5" /> Estructura de Cadena en Código QR
                      </span>
                      <span className="text-[9px] bg-emerald-700 text-white font-mono px-1.5 py-0.2">
                        QR Code 2D
                      </span>
                    </div>

                    <div className="bg-black p-2 border border-[#3A3A36] text-center font-mono">
                      <span className="text-xs font-black text-amber-400 tracking-wider">
                        {generateCompactBarcodePayload({
                          productCode: sampleProduct.code,
                          lot: getDailyLotCode(),
                          weight: sampleProduct.defaultWeight || 25,
                          expirationDate: '2026-12-31',
                        })}
                      </span>
                    </div>

                    <p className="text-[9px] text-[#A0A09C]">
                      Lógica de codificación consecutiva para lecturas ultrarrápidas en escáneres Zebra y Android:
                    </p>

                    <div className="grid grid-cols-1 gap-1.5 text-[10px] font-mono">
                      {explainBarcodePayload(
                        generateCompactBarcodePayload({
                          productCode: sampleProduct.code,
                          lot: getDailyLotCode(),
                          weight: sampleProduct.defaultWeight || 25,
                          expirationDate: '2026-12-31',
                        }),
                        {
                          productCode: sampleProduct.code,
                          productName: sampleProduct.name,
                          lot: getDailyLotCode(),
                          weight: sampleProduct.defaultWeight || 25,
                          unit: sampleProduct.unit || 'KG',
                          expirationDate: '2026-12-31',
                        }
                      ).map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#242422] p-1.5 border border-[#3A3A36]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 text-[9px] font-extrabold ${seg.badgeBg}`}>
                              {seg.code}
                            </span>
                            <span className="text-white font-bold">{seg.label}</span>
                          </div>
                          <span className="text-amber-300 font-extrabold text-[9px]">{seg.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 10. DOMICILIO / DIRECCIÓN */}
              {activeElement === 'address' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#141414] uppercase border-b border-gray-200 pb-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" /> Domicilio / Destino en Etiqueta
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={labelFormatConfig.showAddress ?? true}
                      onChange={(e) =>
                        updateLabelFormatConfig({ showAddress: e.target.checked })
                      }
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-[#141414] text-xs">Mostrar Domicilio en la Etiqueta</span>
                  </label>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Texto Predeterminado de Domicilio / Planta
                    </label>
                    <textarea
                      rows={2}
                      value={labelFormatConfig.addressText ?? 'DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000'}
                      onChange={(e) =>
                        updateLabelFormatConfig({ addressText: e.target.value })
                      }
                      placeholder="ej. DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000"
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold font-mono"
                    />
                    <p className="text-[10px] text-[#777] mt-0.5">
                      Este texto aparece en la etiqueta térmica y puede ser editado al momento de imprimir.
                    </p>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.addressFont}
                    onChange={(font) => updateLabelFormatConfig({ addressFont: font })}
                    label="Fuente Zebra de Domicilio"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.addressFontSize || 16}pt</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="26"
                      value={labelFormatConfig.addressFontSize || 16}
                      onChange={(e) =>
                        updateLabelFormatConfig({ addressFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.addressX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ addressX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.addressY ?? 515}
                        onChange={(e) =>
                          updateLabelFormatConfig({ addressY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 11. FOOTER */}
              {activeElement === 'footer' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#141414] uppercase border-b border-gray-200 pb-1 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-600" /> Pie de Página
                  </h3>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Texto Personalizado Pie
                    </label>
                    <input
                      type="text"
                      value={labelFormatConfig.customFooterText}
                      onChange={(e) =>
                        updateLabelFormatConfig({ customFooterText: e.target.value })
                      }
                      className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showPrintTimestamp}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showPrintTimestamp: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Mostrar Fecha Impresión</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={labelFormatConfig.showFooterId}
                        onChange={(e) =>
                          updateLabelFormatConfig({ showFooterId: e.target.checked })
                        }
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-bold text-[#141414] text-[10px]">Incluir ID de Etiqueta</span>
                    </label>
                  </div>

                  {/* Zebra Resident Font Selector */}
                  <ZebraFontSelector
                    value={labelFormatConfig.footerFont}
                    onChange={(font) => updateLabelFormatConfig({ footerFont: font })}
                    label="Fuente Zebra de Pie de Página"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                      Tamaño de Letra: <span className="text-amber-700">{labelFormatConfig.footerFontSize || 18}pt</span>
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="30"
                      value={labelFormatConfig.footerFontSize || 18}
                      onChange={(e) =>
                        updateLabelFormatConfig({ footerFontSize: Number(e.target.value) })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición X (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.footerX ?? 30}
                        onChange={(e) =>
                          updateLabelFormatConfig({ footerX: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#555] mb-1">
                        Posición Y (Dots)
                      </label>
                      <input
                        type="number"
                        value={labelFormatConfig.footerY ?? 540}
                        onChange={(e) =>
                          updateLabelFormatConfig({ footerY: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 border border-[#141414] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Visual Canvas & Action Panel (Col 6) */}
          <div className="lg:col-span-6 p-4 flex flex-col space-y-3 bg-[#D4D3D0] justify-between">
            {/* Top Preview Controls Bar */}
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold uppercase flex items-center gap-1.5 text-[#141414]">
                <Eye className="w-4 h-4 text-amber-600" /> Previsualización Térmica ZPL
              </span>

              {/* Sample product picker */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#555]">Producto:</span>
                <select
                  value={selectedSampleProdId}
                  onChange={(e) => setSelectedSampleProdId(e.target.value)}
                  className="bg-white border border-[#141414] text-[10px] font-bold px-1.5 py-0.5 max-w-[150px] truncate"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Label Canvas Container */}
            <div className="bg-white border-2 border-[#141414] shadow-md p-4 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
              <div className="absolute top-2 left-2 bg-[#141414] text-amber-400 font-mono text-[9px] font-bold px-1.5 py-0.5 z-10">
                {labelFormatConfig.widthInches}" x {labelFormatConfig.heightInches}" @{' '}
                {labelFormatConfig.dpi} DPI
              </div>

              {/* Render either Labelary Image or Interactive Canvas */}
              {labelaryUrl ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="border border-gray-300 shadow-xs bg-white p-1">
                    <img
                      src={labelaryUrl}
                      alt="Labelary Real Zebra Render"
                      className="max-h-[260px] object-contain"
                    />
                  </div>
                  <button
                    onClick={() => setLabelaryUrl(null)}
                    className="text-[10px] font-mono text-gray-600 underline hover:text-black"
                  >
                    Volver a lienzo interactivo
                  </button>
                </div>
              ) : (
                <SimulatedLabelCanvas
                  labelFormatConfig={labelFormatConfig}
                  product={sampleProduct}
                  lot={getDailyLotCode()}
                  weight={sampleProduct.defaultWeight || 25.0}
                  unit={sampleProduct.unit || 'KG'}
                  warehouse={sampleProduct.warehouse || 'Congelado'}
                  expirationDate="2026-12-31"
                  domicilio={labelFormatConfig.addressText || 'DOMICILIO: CARRETERA INTERNACIONAL KM 12.5, C.P. 85000'}
                  speciesLegend={labelFormatConfig.speciesLegendText || '%100 CERDO'}
                  timestamp={new Date().toISOString()}
                  labelId="LBL-PREVIEW-01"
                  interactiveDrag={true}
                  selectedElementKey={activeElement}
                  onSelectElement={(key) => setActiveElement(key as ElementKey)}
                  onElementMove={handleElementMove}
                />
              )}
            </div>

            {/* QR COMPACT STRUCTURE BREAKDOWN CARD */}
            <div className="bg-white border-2 border-[#141414] p-3 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                <span className="font-extrabold text-[#141414] text-[10px] uppercase flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Leyenda del Código QR Estandarizado (Ejemplo)
                </span>
                <span className="text-[9px] font-bold bg-emerald-300 text-[#141414] px-1.5 py-0.2">
                  QR Code 2D / Zebra
                </span>
              </div>

              <div className="flex items-center justify-between bg-[#F8F7F4] p-2 border border-[#141414]">
                <span className="text-[10px] font-bold text-[#555]">CADENA:</span>
                <span className="font-extrabold text-[#141414] bg-amber-400 px-1.5 py-0.5 tracking-wider">
                  {generateCompactBarcodePayload({
                    productCode: sampleProduct.code,
                    lot: getDailyLotCode(),
                    weight: sampleProduct.defaultWeight || 25,
                    expirationDate: '2026-12-31',
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                {explainBarcodePayload(
                  generateCompactBarcodePayload({
                    productCode: sampleProduct.code,
                    lot: getDailyLotCode(),
                    weight: sampleProduct.defaultWeight || 25,
                    expirationDate: '2026-12-31',
                  }),
                  {
                    productCode: sampleProduct.code,
                    productName: sampleProduct.name,
                    lot: getDailyLotCode(),
                    weight: sampleProduct.defaultWeight || 25,
                    unit: sampleProduct.unit || 'KG',
                    expirationDate: '2026-12-31',
                  }
                ).map((seg, idx) => (
                  <div key={idx} className="bg-[#F8F7F4] p-1.5 border border-gray-300 flex flex-col justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`px-1 text-[8px] font-extrabold ${seg.badgeBg}`}>
                        {seg.code}
                      </span>
                      <span className="font-bold text-[#141414] truncate">{seg.label}</span>
                    </div>
                    <span className="text-emerald-800 font-extrabold mt-0.5">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Print & Test Action Buttons */}
            <div className="space-y-2 font-mono">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFetchLabelary}
                  disabled={isLoadingLabelary}
                  className="bg-white hover:bg-gray-100 text-[#141414] border border-[#141414] text-xs font-bold py-2 px-3 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  {isLoadingLabelary ? 'Generando PNG...' : 'Render Labelary Real'}
                </button>

                <button
                  onClick={() => setShowZplDrawer(!showZplDrawer)}
                  className="bg-white hover:bg-gray-100 text-[#141414] border border-[#141414] text-xs font-bold py-2 px-3 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                  {showZplDrawer ? 'Ocultar Código ZPL' : 'Ver Código ZPL'}
                </button>
              </div>

              <button
                onClick={handlePrintSample}
                disabled={isPrintingTest}
                className="w-full bg-[#141414] hover:bg-[#2A2A28] text-amber-400 font-bold text-xs py-2.5 px-3 border border-[#141414] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {isPrintingTest
                  ? 'Enviando a Impresora Zebra...'
                  : 'Probar Impresión en Impresora Zebra'}
              </button>

              {printTestResult && (
                <div
                  className={`p-2 border font-mono text-[11px] font-bold ${
                    printTestResult.success
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                      : 'bg-red-50 border-red-600 text-red-800'
                  }`}
                >
                  {printTestResult.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ZPL Code Drawer Modal Overlay */}
        {showZplDrawer && (
          <div className="bg-[#1E1E1E] text-amber-300 p-4 border-t-2 border-[#141414] font-mono text-xs max-h-[220px] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-2 text-white">
              <span className="font-bold uppercase text-amber-400 flex items-center gap-1.5">
                <FileCode className="w-4 h-4" /> Código ZPL Generado para Impresora Zebra
              </span>
              <button
                onClick={handleCopyZpl}
                className="bg-amber-400 text-[#141414] font-bold text-[10px] px-2 py-1 flex items-center gap-1 hover:bg-amber-300"
              >
                <Copy className="w-3 h-3" /> {copiedZpl ? '¡Copiado!' : 'Copiar ZPL'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-[11px] text-emerald-400 bg-black/60 p-2 border border-gray-700">
              {zpl}
            </pre>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-[#141414] px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-[#2A2A28] shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-300 flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Todo se almacena en la nube: al presionar <strong className="text-white">Guardar y Salir</strong> se sincroniza directamente en <strong className="text-emerald-400">Firebase Firestore</strong>.
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSavingAndClosing}
              className="bg-[#242422] hover:bg-[#32322E] text-gray-300 hover:text-white font-bold text-xs px-4 py-2 border border-[#444] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSavingAndClosing}
              className="bg-amber-400 hover:bg-amber-300 text-[#141414] font-bold text-xs px-6 py-2 border border-amber-400 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSavingAndClosing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  Guardando en Firebase...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-black font-extrabold" />
                  Guardar y Salir
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal: Guardar como Plantilla */}
        {showNewTemplateModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#E4E3E0] border-2 border-[#141414] p-5 w-full max-w-md shadow-2xl font-mono">
              <div className="flex items-center justify-between border-b border-[#141414] pb-2 mb-4">
                <h3 className="font-bold text-sm uppercase flex items-center gap-2 text-[#141414]">
                  <Bookmark className="w-4 h-4 text-amber-600" /> Guardar como Plantilla
                </h3>
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="text-gray-600 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveAsTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#555] mb-1">
                    Nombre del Diseño / Plantilla
                  </label>
                  <input
                    type="text"
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    placeholder="Ej. Etiqueta 4x3 Almacén Central"
                    className="w-full bg-white border border-[#141414] p-2 text-xs font-bold text-[#141414] focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-gray-600 mt-1">
                    Se guardará de forma permanente y podrás seleccionarla en cualquier momento desde la barra superior.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplateModal(false)}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 border border-[#141414] text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!templateNameInput.trim()}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 border border-[#141414] text-xs font-bold text-black disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Guardar Plantilla
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Importar Diseño JSON */}
        {showImportModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#E4E3E0] border-2 border-[#141414] p-5 w-full max-w-lg shadow-2xl font-mono">
              <div className="flex items-center justify-between border-b border-[#141414] pb-2 mb-4">
                <h3 className="font-bold text-sm uppercase flex items-center gap-2 text-[#141414]">
                  <Upload className="w-4 h-4 text-indigo-600" /> Importar Diseño de Etiqueta
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportError(null);
                  }}
                  className="text-gray-600 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#555] mb-1">
                    Cargar archivo JSON
                  </label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFileChange}
                    className="w-full bg-white border border-[#141414] p-1.5 text-xs text-[#141414] file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:font-bold file:bg-amber-400 file:text-black"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-300 p-2 text-[11px] text-amber-900 leading-tight">
                  <p className="font-bold mb-0.5">ℹ️ Configuración Inicial Automática:</p>
                  <p>Al importar este diseño, se guarda de forma permanente en la nube (Firestore) y en almacenamiento de alta capacidad (IndexedDB). Se cargará automáticamente cada vez que inicies el programa.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#555] mb-1">
                    O pegar código JSON del diseño:
                  </label>
                  <textarea
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='{"presetName": "Mi Diseño", "widthInches": 4, ...}'
                    rows={6}
                    className="w-full bg-white border border-[#141414] p-2 text-xs font-mono text-[#141414] focus:outline-hidden"
                  />
                </div>

                {importError && (
                  <div className="bg-red-100 border border-red-500 text-red-700 text-xs p-2">
                    {importError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-300">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportError(null);
                    }}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 border border-[#141414] text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleImportJson}
                    disabled={!importJsonText.trim()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-[#141414] text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Importar y Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* In-App Confirmation Modal */}
        <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      </div>
    </div>
  );
};
