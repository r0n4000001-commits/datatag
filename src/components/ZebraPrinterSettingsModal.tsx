import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { generateTestZplCode } from '../utils/zplGenerator';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  Server,
  Wifi,
  Usb,
  Sliders,
  ExternalLink,
  Laptop,
  Radio,
  Check,
  Zap
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'local';
}

const PAPER_SIZE_PRESETS = [
  {
    label: 'Cuadrado Grande 4" x 4" (101.6 x 101.6 mm)',
    paperWidthMm: 101.6,
    paperHeightMm: 101.6,
    notes: 'Formato cuadrado grande de alta visibilidad para empaques y lotes',
  },
  {
    label: 'Estándar Almacén 4" x 3" (101.6 x 76.2 mm)',
    paperWidthMm: 101.6,
    paperHeightMm: 76.2,
    notes: 'Tamaño estándar para almacenes e inventario congelado/fresco',
  },
  {
    label: 'Compacto Cajas 4" x 2" (101.6 x 50.8 mm)',
    paperWidthMm: 101.6,
    paperHeightMm: 50.8,
    notes: 'Formato rectangular compacto para cajas y empaques',
  },
  {
    label: 'Pallet & Exportación 4" x 6" (101.6 x 152.4 mm)',
    paperWidthMm: 101.6,
    paperHeightMm: 152.4,
    notes: 'Tamaño industrial extendido para pallets y transporte',
  },
  {
    label: 'Pequeño Estantería 3" x 2" (76.2 x 50.8 mm)',
    paperWidthMm: 76.2,
    paperHeightMm: 50.8,
    notes: 'Para estantes, productos individuales y envases pequeños',
  },
];

export const ZebraPrinterSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const {
    printerConfig,
    updatePrinterConfig,
    localPrinterConfig,
    updateLocalPrinterConfig,
  } = useInventory();

  // Local Printer State
  const [localName, setLocalName] = useState(localPrinterConfig.printerName);
  const [localConnType, setLocalConnType] = useState(localPrinterConfig.connectionType);
  const [localWidthMm, setLocalWidthMm] = useState(localPrinterConfig.paperWidthMm);
  const [localHeightMm, setLocalHeightMm] = useState(localPrinterConfig.paperHeightMm);
  const [localAutoPrint, setLocalAutoPrint] = useState(localPrinterConfig.autoOpenPrintDialog);

  // Discovered Web Serial Ports
  const [serialPorts, setSerialPorts] = useState<any[]>([]);
  const [isScanningSerial, setIsScanningSerial] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');

  const [darkness, setDarkness] = useState(printerConfig.darkness);
  const [dpi, setDpi] = useState(printerConfig.dpi);
  const [widthInches, setWidthInches] = useState(printerConfig.widthInches);
  const [heightInches, setHeightInches] = useState(printerConfig.heightInches);

  // Detect iframe environment
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (isOpen) {
      setLocalName(localPrinterConfig.printerName);
      setLocalConnType(localPrinterConfig.connectionType);
      setLocalWidthMm(localPrinterConfig.paperWidthMm);
      setLocalHeightMm(localPrinterConfig.paperHeightMm);
      setLocalAutoPrint(localPrinterConfig.autoOpenPrintDialog);

      setDarkness(printerConfig.darkness);
      setDpi(printerConfig.dpi);
      setWidthInches(printerConfig.widthInches);
      setHeightInches(printerConfig.heightInches);

      // List granted serial ports if supported
      if ('serial' in navigator) {
        (navigator as any).serial.getPorts().then((ports: any[]) => {
          setSerialPorts(ports);
        }).catch(() => {});
      }
    }
  }, [isOpen, localPrinterConfig, printerConfig]);

  if (!isOpen) return null;

  // Scan or request Web Serial USB device
  const handleScanUSBSerialDevice = async () => {
    setIsScanningSerial(true);
    setScanStatusMessage('Solicitando acceso a puerto USB / Serie del sistema...');

    if (!('serial' in navigator)) {
      setScanStatusMessage('⚠️ Su navegador no soporta Web Serial API. Utilice el modo "Controlador de Sistema / Windows" o abra la aplicación en Chrome / Edge.');
      setIsScanningSerial(false);
      return;
    }

    if (inIframe) {
      setScanStatusMessage('⚠️ Entorno Iframe detectado: Debe abrir la aplicación en una pestaña nueva para otorgar permiso al puerto USB/Serie.');
      setIsScanningSerial(false);
      return;
    }

    try {
      const portSelected = await (navigator as any).serial.requestPort();
      const info = portSelected.getInfo();
      const portName = `Dispositivo USB (VendorID: 0x${(info.usbVendorId || 0).toString(16)}, ProductID: 0x${(info.usbProductId || 0).toString(16)})`;
      
      setSerialPorts((prev) => [...prev, portSelected]);
      setLocalName(portName);
      setLocalConnType('web_serial');
      setScanStatusMessage(`¡Dispositivo detectado y seleccionado!: ${portName}`);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setScanStatusMessage('Búsqueda cancelada por el usuario (no se seleccionó puerto).');
      } else {
        setScanStatusMessage(`Error al buscar puerto USB: ${err.message || err}`);
      }
    } finally {
      setIsScanningSerial(false);
    }
  };

  const handleSelectPaperPreset = (preset: typeof PAPER_SIZE_PRESETS[0]) => {
    setLocalWidthMm(preset.paperWidthMm);
    setLocalHeightMm(preset.paperHeightMm);
  };

  const handleLocalTestPrint = () => {
    try {
      window.focus();
    } catch (e) {
      // Ignore focus errors
    }

    // Small delay ensures DOM and focus settle before print dialog opens
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    }, 100);
  };

  const handleSaveLocalConfig = () => {
    updateLocalPrinterConfig({
      printerName: localName,
      connectionType: localConnType,
      paperWidthMm: Number(localWidthMm),
      paperHeightMm: Number(localHeightMm),
      autoOpenPrintDialog: localAutoPrint,
    });
    updatePrinterConfig({
      darkness: Number(darkness),
      dpi: Number(dpi) as 203 | 300 | 600,
      widthInches: Number(widthInches),
      heightInches: Number(heightInches),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/70 p-4 font-mono notranslate" translate="no">
      <div className="bg-[#F8F7F4] border-2 border-[#141414] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between border-b border-[#141414] shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Gestión y Configuración de Impresora Local
              </h3>
              <p className="text-[10px] text-[#A0A09C]">
                Impresoras Locales (USB / Driver Windows / Mac)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#282828] text-[#A0A09C] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto text-[#141414]">
          {/* Active Selected Device Banner */}
          <div className="bg-emerald-950 text-white p-3 border border-emerald-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dispositivo Local Activo
              </span>
              <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 border border-emerald-700 uppercase font-bold">
                {localConnType === 'web_serial' ? 'Puerto Serie Directo' : 'Controlador de Sistema'}
              </span>
            </div>
            <p className="text-sm font-black text-amber-300 font-mono tracking-tight">
              {localName || 'Ninguna seleccionada'}
            </p>
            <p className="text-[10px] text-emerald-200">
              Ancho Papel: {localWidthMm} mm | Alto: {localHeightMm} mm
            </p>
          </div>

          {/* Windows / Mac System Printer Section */}
          <div className="bg-white p-3 border border-[#141414] space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase flex items-center gap-1.5 text-[#141414]">
                <Printer className="w-4 h-4 text-emerald-700" />
                <span>Impresión Local por Controlador de Windows / Mac</span>
              </p>
              {inIframe && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[9px] text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 border border-amber-400 flex items-center gap-1 font-bold"
                >
                  <span>Abrir en Pestaña Nueva</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-[#444]">
              Las impresoras USB conectadas a su equipo (Zebra, Epson, TSC, HP, etc.) se gestionan directamente a través de los controladores de su sistema operativo Windows o Mac.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleLocalTestPrint}
                className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#141414] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-200" />
                <span>🖨️ Desplegar Ventana de Impresión (Seleccionar Impresora de Windows)</span>
              </button>
            </div>

            <p className="text-[10px] text-[#666] italic leading-tight">
              💡 Al presionar este botón se abrirá el diálogo oficial de impresión donde podrá elegir su impresora física predeterminada o cualquier otro dispositivo conectado a su PC.
            </p>
          </div>

          {/* Custom Printer Name & Real PC Printer Info */}
          <div className="bg-[#E4E3E0] p-3 border border-[#141414] space-y-3">
            <p className="text-xs font-bold uppercase flex items-center gap-1.5 text-[#141414]">
              <Laptop className="w-4 h-4 text-emerald-800" />
              <span>Nombre de la Impresora Instalada en su PC (Windows / Mac):</span>
            </p>

            <div>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="ej. Impresora Predeterminada del Sistema, Zebra ZD420, HP LaserJet..."
                className="w-full px-2.5 py-2 bg-white border border-[#141414] text-xs font-bold text-[#141414] focus:outline-hidden"
              />
              <p className="text-[10px] text-[#555] mt-1">
                💡 <strong>Nota sobre las impresoras de su PC:</strong> Por privacidad y seguridad del navegador web, la lista exacta de impresoras de su computadora se despliega en la ventana nativa de impresión de Windows/Mac al presionar <strong>IMPRIMIR</strong>.
              </p>
            </div>

            {/* Formato y Tamaño de Papel / Etiqueta */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-extrabold uppercase flex items-center gap-1 text-[#141414]">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Seleccionar Tamaño de Etiqueta (Dimensiones):</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAPER_SIZE_PRESETS.map((preset, idx) => {
                  const isSelected = localWidthMm === preset.paperWidthMm && localHeightMm === preset.paperHeightMm;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPaperPreset(preset)}
                      className={`p-2 text-left border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-100 border-amber-600 text-amber-950 font-bold shadow-xs'
                          : 'bg-white border-[#141414]/20 hover:border-[#141414] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <span className="font-bold text-[11px] leading-tight">{preset.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                      </div>
                      <p className="text-[9px] text-[#666] leading-tight">{preset.notes}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Ancho Personalizado (mm):</label>
                <input
                  type="number"
                  value={localWidthMm}
                  onChange={(e) => setLocalWidthMm(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-[#141414] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Alto Personalizado (mm):</label>
                <input
                  type="number"
                  value={localHeightMm}
                  onChange={(e) => setLocalHeightMm(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-[#141414] text-xs font-bold"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-300 p-2.5 text-[10px] text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-amber-900 uppercase">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>¿Cómo imprimir directo a su PC sin cuadro de diálogo manual?</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[10px] text-amber-900 leading-tight">
                <li>
                  <strong>Modo Kiosk (Impresión Automática en Chrome/Edge):</strong> Inicie su navegador con el comando <code>--kiosk-printing</code> en el acceso directo de Windows/Mac para imprimir directo en la impresora predeterminada de su PC.
                </li>
              </ul>
            </div>
          </div>

          {/* Off-screen Printable Sample Test Label for System Local Printer */}
          <div
            className="printable-label-area fixed -left-[9999px] top-0 bg-white text-black p-4 border-2 border-black font-mono"
            style={{
              width: `${localWidthMm || 101.6}mm`,
              minHeight: `${localHeightMm || 76.2}mm`,
            }}
          >
            <div className="border-b-2 border-black pb-1 mb-2 text-center">
              <div className="font-black text-sm uppercase tracking-wider">ETIQUETA PRUEBA IMPRESORA LOCAL</div>
              <div className="text-[10px] text-gray-700 font-bold">CONTROLADOR DE SISTEMA (WINDOWS / MAC)</div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between border-b border-gray-300 pb-0.5">
                <span className="font-bold">IMPRESORA:</span>
                <span className="font-mono">{localName || 'Predeterminada del sistema'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-0.5">
                <span className="font-bold">FORMATO:</span>
                <span>{localWidthMm} mm x {localHeightMm} mm</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-0.5">
                <span className="font-bold">FECHA IMPRESIÓN:</span>
                <span>{new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-0.5">
                <span className="font-bold">ESTADO SIFPRO:</span>
                <span className="font-bold text-emerald-800">CONEXIÓN LOCAL ACTIVA</span>
              </div>
            </div>

            <div className="mt-4 p-2 bg-black text-white text-center font-bold text-xs uppercase">
              *** COMUNICACIÓN Y PRUEBA CORRECTA ***
            </div>
          </div>

          {/* Local Save Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#141414]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-[#141414] hover:bg-[#E4E3E0] uppercase border border-[#141414]/30"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveLocalConfig}
              className="px-4 py-1.5 bg-emerald-700 text-white font-bold text-xs uppercase hover:bg-emerald-600 border border-[#141414] flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Impresora Local</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

