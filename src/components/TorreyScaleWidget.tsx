import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  Cable,
  Unplug,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  ArrowRight,
  ShieldCheck,
  Settings2,
  ExternalLink,
  Terminal,
  Cpu
} from 'lucide-react';
import {
  TorreyScaleSerialClient,
  TorreyScaleReading,
  isWebSerialSupported,
  isRunningInIframe,
} from '../utils/torreyScale';

interface Props {
  onWeightReceived: (weight: number) => void;
  onLatestReading?: (reading: TorreyScaleReading) => void;
  currentWeight?: number;
  minWeight?: number;
  onMinWeightChange?: (minWeight: number) => void;
  isManualAuthorized?: boolean;
  onToggleManualAuthorized?: (authorized: boolean) => void;
}

export const TorreyScaleWidget: React.FC<Props> = ({
  onWeightReceived,
  onLatestReading,
  currentWeight = 0.0,
  minWeight = 0.50,
  onMinWeightChange,
  isManualAuthorized = false,
  onToggleManualAuthorized,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isManualMode, setIsManualMode] = useState<boolean>(isManualAuthorized);
  const [manualInputStr, setManualInputStr] = useState<string>(currentWeight > 0 ? String(currentWeight) : '');
  const [reading, setReading] = useState<TorreyScaleReading>({
    weight: currentWeight,
    unit: 'KG',
    isStable: true,
    raw: `  ${currentWeight.toFixed(2)} kg ST`,
    timestamp: new Date().toLocaleTimeString('es-MX'),
  });
  const [statusMessage, setStatusMessage] = useState<string>(
    isManualAuthorized
      ? 'Modo: Captura manual autorizada activa (Sin báscula).'
      : 'Báscula Torrey lista. Conecte su puerto Serie RS-232 / USB COM o active Captura Manual.'
  );

  useEffect(() => {
    if (isManualAuthorized !== undefined) {
      setIsManualMode(isManualAuthorized);
    }
  }, [isManualAuthorized]);
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);

  const inIframe = isRunningInIframe();

  // Serial client ref
  const serialClientRef = useRef<TorreyScaleSerialClient | null>(null);

  // Refs for callbacks and flags
  const onWeightReceivedRef = useRef(onWeightReceived);
  onWeightReceivedRef.current = onWeightReceived;

  const onLatestReadingRef = useRef(onLatestReading);
  onLatestReadingRef.current = onLatestReading;

  const autoApplyRef = useRef(autoApply);
  autoApplyRef.current = autoApply;

  // Initialize Serial client when baudRate or autoPoll changes
  useEffect(() => {
    const client = new TorreyScaleSerialClient({
      baudRate: baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoRequestIntervalMs: autoPoll ? 500 : 0,
    });

    client.onReading((newReading) => {
      const safeWeight = typeof newReading?.weight === 'number' && !isNaN(newReading.weight) ? newReading.weight : 0;
      setReading({
        ...newReading,
        weight: safeWeight,
      });
      setStatusMessage(`Lectura REAL Báscula Torrey (COM): ${safeWeight.toFixed(2)} ${newReading.unit} [${newReading.raw}]`);

      if (onLatestReadingRef.current) {
        onLatestReadingRef.current({ ...newReading, weight: safeWeight });
      }

      if (autoApplyRef.current && onWeightReceivedRef.current) {
        onWeightReceivedRef.current(safeWeight);
      }
    });

    client.onError((err) => {
      setStatusMessage(`Error Báscula Serie: ${err}`);
    });

    serialClientRef.current = client;

    return () => {
      client.disconnect().catch(() => {});
    };
  }, [baudRate, autoPoll]);

  // Connect via Web Serial
  const handleConnectSerial = async () => {
    try {
      if (!serialClientRef.current) return;

      if (inIframe) {
        setStatusMessage('⚠️ Iframe detectado: Debe abrir la app en pestaña nueva para acceder a los puertos COM.');
        setShowGuide(true);
        return;
      }

      setStatusMessage(`Solicitando puerto COM / USB Serie a ${baudRate} Baudios...`);
      const success = await serialClientRef.current.connect();
      setIsConnected(success);
      if (success) {
        setStatusMessage(`¡Báscula Torrey CONECTADA por Puerto Serie (${baudRate} 8N1)!`);
      }
    } catch (err: any) {
      console.error('Error connecting serial port:', err);
      setIsConnected(false);
      setStatusMessage(`Error al conectar puerto COM: ${err?.message || 'Error desconocido'}`);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    try {
      if (serialClientRef.current) {
        await serialClientRef.current.disconnect();
      }
    } catch (e) {
      console.warn('Disconnect error:', e);
    }
    setIsConnected(false);
    setStatusMessage('Báscula desconectada.');
  };

  // Open in new tab
  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  // Commands for Serial
  const handleTare = async () => {
    try {
      if (isConnected && serialClientRef.current) {
        const sent = await serialClientRef.current.tareScale();
        if (sent) {
          setStatusMessage('Comando "T" (Tarar hardware) enviado a la báscula Torrey.');
        } else {
          setStatusMessage('⚠️ No se pudo enviar "T" por el puerto COM.');
        }
      } else {
        setStatusMessage('⚠️ Báscula Serie no conectada. Conecte el puerto COM para enviar comando "T".');
      }
    } catch (err: any) {
      console.error('Error in handleTare:', err);
      setStatusMessage(`Error en comando Tara: ${err?.message || err}`);
    }
  };

  const handleZero = async () => {
    try {
      if (isConnected && serialClientRef.current) {
        const sent = await serialClientRef.current.zeroScale();
        if (sent) {
          setStatusMessage('Comando "Z" (Cero hardware) enviado a la báscula Torrey.');
        } else {
          setStatusMessage('⚠️ No se pudo enviar "Z" por el puerto COM.');
        }
      } else {
        setStatusMessage('⚠️ Báscula Serie no conectada. Conecte el puerto COM para enviar comando "Z".');
      }
    } catch (err: any) {
      console.error('Error in handleZero:', err);
      setStatusMessage(`Error en comando Cero: ${err?.message || err}`);
    }
  };

  const handleRequestWeight = async () => {
    try {
      if (isConnected && serialClientRef.current) {
        await serialClientRef.current.requestWeight();
        setStatusMessage('Comando "P" (Solicitar lectura real) enviado.');
      } else {
        setStatusMessage('⚠️ Báscula no conectada por Puerto COM.');
      }
    } catch (err: any) {
      console.error('Error in handleRequestWeight:', err);
      setStatusMessage(`Error: ${err?.message || err}`);
    }
  };

  const handleTransferToLabel = () => {
    const w = typeof reading?.weight === 'number' && !isNaN(reading.weight) ? reading.weight : 0;
    if (onWeightReceivedRef.current) {
      onWeightReceivedRef.current(w);
    }
    setStatusMessage(`Peso ${w.toFixed(2)} KG aplicado a la etiqueta.`);
  };

  const webSerialSupported = isWebSerialSupported();

  return (
    <div className="bg-[#141414] text-white p-3.5 border-2 border-[#141414] shadow-md font-mono space-y-3 notranslate" translate="no">
      {/* HEADER: TORREY BRAND */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3A3A36] pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-400 text-[#141414] font-black">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                BÁSCULA INDUSTRIAL TORREY
              </span>
              <span className="text-[9px] bg-[#2A2A28] text-emerald-400 px-1.5 py-0.2 border border-emerald-500/30">
                SERIE COM / USB
              </span>
            </div>
            <p className="text-[10px] text-[#A0A09C]">
              Puerto Serie RS-232 / USB (COM @ {baudRate} 8N1)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle: Serial COM vs Authorized Manual */}
          <div className="flex items-center border border-[#3A3A36] bg-[#1E1E1C] p-0.5">
            <button
              type="button"
              onClick={() => {
                setIsManualMode(false);
                if (onToggleManualAuthorized) onToggleManualAuthorized(false);
                setStatusMessage('Modo: Báscula Torrey Serie COM.');
              }}
              className={`px-2 py-1 text-[9px] font-bold uppercase transition-all cursor-pointer ${
                !isManualMode
                  ? 'bg-amber-400 text-black font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚖️ COM (Báscula)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsManualMode(true);
                if (onToggleManualAuthorized) onToggleManualAuthorized(true);
                setStatusMessage('Modo: Captura manual autorizada activa (Sin báscula).');
              }}
              className={`px-2 py-1 text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                isManualMode
                  ? 'bg-cyan-400 text-black font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>✍️ Captura Manual</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 bg-[#242422] px-2 py-1 border border-[#3A3A36]"
            title="Ajustes de Báscula"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* IFRAME RESTRICTION WARNING BANNER FOR SERIAL */}
      {inIframe && (
        <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-200 p-2.5 text-[10px] space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-extrabold text-amber-300 uppercase">
                Acceso a Puertos COM en Navegador
              </p>
              <p className="text-[#D4D3D0] leading-tight">
                Google Chrome y Microsoft Edge requieren ejecutar la aplicación fuera de la ventana de previsualización para mostrar la lista de puertos COM.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-3 py-1.5 bg-amber-400 text-[#141414] font-black hover:bg-amber-300 flex items-center gap-1 shrink-0 border border-amber-200 shadow-sm"
            >
              <span>Abrir en Nueva Pestaña</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* CONFIG SETTINGS PANEL */}
      {showSettings && (
        <div className="bg-[#242422] p-2.5 border border-[#3A3A36] text-[10px] space-y-2 text-[#D4D3D0]">
          <div className="font-extrabold text-amber-400 uppercase flex items-center justify-between border-b border-[#3A3A36] pb-1">
            <span className="flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5" /> Configuración de Puerto Serie COM
            </span>
            <button onClick={() => setShowSettings(false)} className="text-white hover:text-amber-400 font-bold">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] text-[#A0A09C] uppercase font-bold mb-1">
                Velocidad Serie (Baud Rate):
              </label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className="w-full bg-[#141414] text-amber-300 border border-[#444] px-2 py-1 font-mono text-[10px]"
              >
                <option value={9600}>9600 Baudios (Torrey Estándar)</option>
                <option value={4800}>4800 Baudios</option>
                <option value={19200}>19200 Baudios</option>
                <option value={2400}>2400 Baudios</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-[#A0A09C] uppercase font-bold mb-1">
                Sondeo Serie ('P'):
              </label>
              <label className="flex items-center gap-1.5 bg-[#141414] border border-[#333] px-2 py-1 text-[10px] cursor-pointer text-amber-300 font-bold">
                <input
                  type="checkbox"
                  checked={autoPoll}
                  onChange={(e) => setAutoPoll(e.target.checked)}
                  className="accent-amber-400"
                />
                Pedir peso 'P' cada 500ms
              </label>
            </div>

            <div>
              <label className="block text-[9px] text-[#A0A09C] uppercase font-bold mb-1">
                Peso Mínimo Requerido (KG):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.00"
                value={minWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const validVal = isNaN(val) ? 0 : Math.max(0, val);
                  if (onMinWeightChange) onMinWeightChange(validVal);
                }}
                className="w-full bg-[#141414] text-amber-300 border border-[#444] px-2 py-1 font-mono text-[10px] font-bold"
                placeholder="0.50"
              />
            </div>
          </div>
        </div>
      )}

      {/* TECHNICAL CONNECTION GUIDE COLLAPSIBLE */}
      {showGuide && (
        <div className="bg-[#242422] p-3 border border-[#3A3A36] text-[10px] space-y-2 text-[#D4D3D0]">
          <div className="font-extrabold text-amber-400 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" /> Guía de Conexión Serie (USB / COM)
            </span>
            <button
              onClick={() => setShowGuide(false)}
              className="text-white hover:text-amber-400 font-bold"
            >
              ✕
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[10px] leading-relaxed">
            <li>
              <strong>Conexión Serie COM (USB Directo):</strong> Conecte el cable DB9 de la báscula con convertidor USB-Serie FTDI/Prolific a su equipo.
            </li>
            <li>
              <strong>Paso 2:</strong> Abra la app en una <button onClick={handleOpenNewTab} className="text-amber-300 underline font-bold">Pestaña Nueva</button> fuera del iframe.
            </li>
            <li>
              <strong>Paso 3:</strong> Haga clic en "Conectar Puerto Serie USB (COM)" y seleccione el puerto asignado por su sistema operativo.
            </li>
          </ol>
        </div>
      )}

      {/* DIGITAL LED DISPLAY PANEL */}
      <div className={`p-3 border-2 rounded-xs relative overflow-hidden transition-all ${
        isManualMode ? 'bg-[#0E171E] border-cyan-500/60' : 'bg-black border-amber-500/40'
      }`}>
        {/* LED background grid effect */}
        <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:8px_8px] opacity-20 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div>
            <span className={`text-[9px] font-extrabold uppercase tracking-widest block ${
              isManualMode ? 'text-cyan-400' : 'text-amber-500/80'
            }`}>
              {isManualMode ? '✍️ CAPTURA MANUAL AUTORIZADA (CONTINGENCIA / SIN BÁSCULA)' : 'LECTURA BÁSCULA (PUERTO COM / SERIE)'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-wider font-mono drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] ${
                isManualMode ? 'text-cyan-300' : 'text-amber-400'
              }`}>
                {(typeof reading?.weight === 'number' && !isNaN(reading.weight) ? reading.weight : 0).toFixed(2)}
              </span>
              <span className={`text-base font-extrabold ${isManualMode ? 'text-cyan-200' : 'text-amber-300'}`}>
                {reading.unit}
              </span>
              {isManualMode && (
                <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 border border-cyan-600 font-bold ml-2">
                  CAPTURA MANUAL
                </span>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-center gap-1.5 justify-end">
              <span
                className={`px-1.5 py-0.5 text-[9px] font-black border ${
                  minWeight > 0 && (typeof reading?.weight === 'number' && !isNaN(reading.weight) ? reading.weight : 0) < minWeight
                    ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-500'
                }`}
              >
                MÍN: {minWeight.toFixed(2)} KG {minWeight > 0 && (typeof reading?.weight === 'number' && !isNaN(reading.weight) ? reading.weight : 0) < minWeight ? '(INFERIOR)' : '(OK)'}
              </span>
              <span
                className={`px-1.5 py-0.5 text-[9px] font-black border ${
                  reading.isStable
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                    : 'bg-rose-950 text-rose-400 border-rose-500'
                }`}
              >
                {isManualMode ? 'MANUAL OK' : reading.isStable ? 'ST (ESTABLE)' : 'US (INESTABLE)'}
              </span>
            </div>
            <p className="text-[9px] text-[#A0A09C]">
              Actualizado: {reading.timestamp}
            </p>
          </div>
        </div>

        {/* CONTROLS BAR INSIDE DISPLAY */}
        <div className="mt-3 pt-2 border-t border-[#333] flex flex-wrap items-center justify-between gap-2">
          {isManualMode ? (
            /* MANUAL WEIGHT INPUT & PRESETS */
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex items-center gap-1.5 bg-[#141414] px-2 py-1 border border-cyan-500/50">
                <span className="text-[10px] text-cyan-300 font-bold uppercase">Peso Bruto:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={manualInputStr}
                  onChange={(e) => {
                    setManualInputStr(e.target.value);
                    const val = parseFloat(e.target.value);
                    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
                    setReading({
                      weight: safeVal,
                      unit: 'KG',
                      isStable: true,
                      raw: `  ${safeVal.toFixed(2)} kg MANUAL`,
                      timestamp: new Date().toLocaleTimeString('es-MX'),
                    });
                    if (onWeightReceivedRef.current) {
                      onWeightReceivedRef.current(safeVal);
                    }
                  }}
                  className="w-24 bg-black text-cyan-300 font-mono text-xs font-black px-1.5 py-0.5 border border-cyan-400 text-right focus:outline-hidden"
                />
                <span className="text-[10px] text-cyan-400 font-bold">KG</span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-400 uppercase font-bold mr-0.5">Frecuentes:</span>
                {[10.0, 15.5, 25.0, 30.0].map((pw) => (
                  <button
                    key={pw}
                    type="button"
                    onClick={() => {
                      setManualInputStr(String(pw));
                      setReading({
                        weight: pw,
                        unit: 'KG',
                        isStable: true,
                        raw: `  ${pw.toFixed(2)} kg MANUAL`,
                        timestamp: new Date().toLocaleTimeString('es-MX'),
                      });
                      if (onWeightReceivedRef.current) {
                        onWeightReceivedRef.current(pw);
                      }
                      setStatusMessage(`Peso manual ${pw.toFixed(2)} KG aplicado.`);
                    }}
                    className="px-2 py-1 bg-[#1E293B] hover:bg-cyan-900 text-cyan-300 text-[10px] font-bold border border-cyan-700/60 cursor-pointer"
                  >
                    {pw.toFixed(1)} kg
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(manualInputStr);
                  const safeVal = isNaN(val) ? 0 : Math.max(0, val);
                  if (onWeightReceivedRef.current) {
                    onWeightReceivedRef.current(safeVal);
                  }
                  setStatusMessage(`✅ Peso manual ${safeVal.toFixed(2)} KG transferido a la etiqueta.`);
                }}
                className="ml-auto px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black text-[10px] font-black border border-cyan-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Aplicar a Etiqueta</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            /* SERIAL COM HARDWARE CONTROLS */
            <>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2 py-1 bg-rose-900 hover:bg-rose-800 text-white text-[10px] font-bold border border-rose-500 flex items-center gap-1"
                  >
                    Desconectar COM
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectSerial}
                    className={`px-2.5 py-1 text-[10px] font-extrabold border flex items-center gap-1 ${
                      webSerialSupported
                        ? 'bg-amber-400 text-[#141414] border-amber-300 hover:bg-amber-300'
                        : 'bg-[#333] text-[#777] border-[#444] cursor-not-allowed'
                    }`}
                  >
                    <Cable className="w-3.5 h-3.5" />
                    <span>Conectar Puerto Serie USB (COM)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTare}
                  className="px-2 py-1 bg-[#242422] hover:bg-[#333] text-amber-300 text-[10px] font-bold border border-[#444]"
                  title="Manda comando T a la báscula para establecer Tara"
                >
                  Tarar (T)
                </button>

                <button
                  type="button"
                  onClick={handleZero}
                  className="px-2 py-1 bg-[#242422] hover:bg-[#333] text-cyan-300 text-[10px] font-bold border border-[#444]"
                  title="Manda comando Z a la báscula para poner Cero"
                >
                  Cero (Z)
                </button>

                <button
                  type="button"
                  onClick={handleRequestWeight}
                  className="px-2 py-1 bg-[#242422] hover:bg-[#333] text-emerald-300 text-[10px] font-bold border border-[#444]"
                  title="Manda comando P para solicitar peso instantáneo"
                >
                  Pedir Peso (P)
                </button>
              </div>

              <button
                type="button"
                onClick={handleTransferToLabel}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold border border-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Usar Peso ({(typeof reading?.weight === 'number' && !isNaN(reading.weight) ? reading.weight : 0).toFixed(2)} {reading.unit})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* AUTO-APPLY & MIN WEIGHT BAR */}
      <div className="bg-[#242422] p-2 border border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#A0A09C] uppercase flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Captura:</span>
          </span>
          <span className="text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 border border-emerald-600/50">
            ⚡ Modo Óptimo: Captura al Imprimir
          </span>
          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer text-[#A0A09C] hover:text-white font-normal ml-2">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            Transmisión continua a etiqueta
          </label>
        </div>

        <div className="flex items-center gap-1.5 bg-[#141414] px-2 py-0.5 border border-[#444]">
          <span className="text-[9px] font-extrabold text-[#A0A09C] uppercase">Peso Mínimo Requerido:</span>
          <input
            type="number"
            step="0.01"
            min="0.00"
            value={minWeight}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const validVal = isNaN(val) ? 0 : Math.max(0, val);
              if (onMinWeightChange) onMinWeightChange(validVal);
            }}
            className="w-16 bg-black text-amber-300 font-mono text-[10px] font-black px-1 border border-[#555] text-center focus:outline-hidden"
          />
          <span className="text-[9px] font-bold text-amber-400">KG</span>
        </div>
      </div>

      {/* FOOTER STATUS TEXT */}
      <div className="text-[10px] text-[#D4D3D0] border-t border-[#3A3A36] pt-2 space-y-1">
        <div className={`p-2 border text-[10px] whitespace-pre-line font-mono ${
          statusMessage.includes('⚠️') || statusMessage.includes('Error')
            ? 'bg-rose-950/80 border-rose-500 text-rose-200'
            : statusMessage.includes('CONECTADA') || statusMessage.includes('Lectura recibida')
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
            : 'bg-[#242422] border-[#3A3A36] text-[#D4D3D0]'
        }`}>
          {statusMessage}
        </div>
        <div className="flex items-center justify-between text-[9px] text-[#A0A09C]">
          <span>Protocolo RS-232 Torrey (9600 ASCII)</span>
          <span className="text-amber-400/80 font-bold">Torrey Scale Engine Ready</span>
        </div>
      </div>
    </div>
  );
};
