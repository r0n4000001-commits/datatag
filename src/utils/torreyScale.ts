/**
 * Torrey Scale (Model 0EQB100 / EQB Series) Serial Communication Utility
 * Supports Web Serial API (RS-232 / USB Serial Adapter @ 9600 8N1)
 */

export interface TorreyScaleReading {
  weight: number;
  unit: 'KG' | 'LB' | string;
  isStable: boolean;
  raw: string;
  timestamp: string;
}

export interface TorreyScaleConfig {
  baudRate: number; // Default 9600
  dataBits: 7 | 8;  // Default 8
  stopBits: 1 | 2;  // Default 1
  parity: 'none' | 'even' | 'odd'; // Default 'none'
  autoRequestIntervalMs?: number; // Request 'P' every N ms if continuous isn't enabled
}

/**
 * Parses raw ASCII output from Torrey EQB-100 / EQB-200 / PCR scales
 * Example string formats from Torrey:
 * - "  25.00 kg"
 * - " 025.000 kg ST"
 * - "ST,GS,+00025.00kg"
 * - "0025.00"
 */
export function parseTorreyWeightString(raw: string): TorreyScaleReading | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Detect Unit (KG or LB)
  let unit: 'KG' | 'LB' | string = 'KG';
  if (/lb/i.test(trimmed)) {
    unit = 'LB';
  } else if (/kg/i.test(trimmed)) {
    unit = 'KG';
  }

  // Detect Stability indicator ("ST" or "US" in Torrey scales)
  const isStable = !/US/i.test(trimmed); // ST = Stable, US = Unstable

  // Extract numeric weight using regex
  // Match numbers with optional sign and decimal: e.g. +00025.00 or 25.00 or -0.50
  const numberMatch = trimmed.match(/[-+]?\d+(?:\.\d+)?/);
  if (!numberMatch) return null;

  const parsedWeight = parseFloat(numberMatch[0]);
  if (isNaN(parsedWeight)) return null;

  return {
    weight: Math.abs(parsedWeight), // ensure positive weight magnitude
    unit,
    isStable,
    raw: trimmed,
    timestamp: new Date().toLocaleTimeString(),
  };
}

/**
 * Checks if the browser supports Web Serial API
 */
export function isWebSerialSupported(): boolean {
  return typeof window !== 'undefined' && 'serial' in navigator;
}

/**
 * Checks if the current page is running inside an iframe (which restricts Web Serial COM port access)
 */
export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Helper class to manage Web Serial connection to Torrey EQB-100
 */
export class TorreyScaleSerialClient {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private isConnected: boolean = false;
  private onReadingCallback: ((reading: TorreyScaleReading) => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;
  private pollIntervalId: any = null;

  constructor(private config: TorreyScaleConfig = { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', autoRequestIntervalMs: 500 }) {}

  public onReading(cb: (reading: TorreyScaleReading) => void) {
    this.onReadingCallback = cb;
  }

  public onError(cb: (err: string) => void) {
    this.onErrorCallback = cb;
  }

  public async connect(): Promise<boolean> {
    if (!isWebSerialSupported()) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Web Serial API no es compatible con este navegador. Use Chrome/Edge en PC.');
      }
      return false;
    }

    if (isRunningInIframe()) {
      const msg = 'Seguridad del navegador: Al estar dentro de un cuadro de vista previa (iframe), los puertos COM están bloqueados. Haga clic en "Abrir en Pestaña Independiente" arriba a la derecha para usar el Puerto Serie físico.';
      if (this.onErrorCallback) this.onErrorCallback(msg);
      return false;
    }

    try {
      // Ensure previous port is properly closed before opening a new one
      if (this.port) {
        try {
          await this.disconnect();
        } catch (e) {
          // ignore cleanup error
        }
      }

      // Request user to select Serial/USB port for Torrey Scale
      this.port = await (navigator as any).serial.requestPort();

      // Open port with standard options
      try {
        await this.port.open({
          baudRate: this.config.baudRate || 9600,
          dataBits: this.config.dataBits || 8,
          stopBits: this.config.stopBits || 1,
          parity: this.config.parity || 'none',
        });
      } catch (openErr: any) {
        // Fallback try with basic baud rate only if strict config threw error
        if (openErr?.message?.includes('open') || openErr?.name === 'InvalidStateError') {
          console.warn('First open attempt failed, retrying with simple baudRate options:', openErr);
          await new Promise(r => setTimeout(r, 200));
          await this.port.open({ baudRate: this.config.baudRate || 9600 });
        } else {
          throw openErr;
        }
      }

      this.isConnected = true;
      this.startReadingLoop();

      // Start auto-poll timer if required (sends 'P\r\n' to request weight periodically)
      if (this.config.autoRequestIntervalMs && this.config.autoRequestIntervalMs > 0) {
        this.pollIntervalId = setInterval(() => {
          this.requestWeight();
        }, this.config.autoRequestIntervalMs);
      }

      return true;
    } catch (err: any) {
      this.isConnected = false;
      let rawMsg = err?.message || '';
      let msg = rawMsg || 'Error al conectar la báscula Torrey por Puerto Serie';

      if (err?.name === 'NotFoundError') {
        msg = 'Selección de puerto cancelada por el usuario.';
      } else if (err?.name === 'SecurityError' || err?.name === 'NotAllowedError') {
        msg = 'Acceso al puerto COM denegado por el navegador. Abra la aplicación en una Pestaña Nueva independizada del iframe.';
      } else if (rawMsg.includes('open') || rawMsg.includes('abrir') || rawMsg.includes('SerialPort') || err?.name === 'InvalidStateError') {
        msg = '⚠️ No se pudo abrir el puerto COM serie. Motivos más comunes:\n1) El puerto COM ya está abierto en otra ventana, pestaña u otro programa (Putty, Punto de Venta, etc.). Cierre cualquier otra app que use el puerto.\n2) El adaptador USB-a-Serie está bloqueado en Windows. Desconecte el cable USB y vuelva a conectarlo.\n3) Asegúrese de seleccionar el puerto correcto.';
      } else if (rawMsg.includes('already open')) {
        msg = 'El puerto COM ya está abierto o siendo utilizado por otro proceso.';
      }

      if (this.onErrorCallback) this.onErrorCallback(msg);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }

    try {
      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (e) {
          // ignore cancel error
        }
        try {
          this.reader.releaseLock();
        } catch (e) {
          // ignore releaseLock error
        }
        this.reader = null;
      }

      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch (e) {
          // ignore releaseLock error
        }
        this.writer = null;
      }

      if (this.port) {
        try {
          await this.port.close();
        } catch (e) {
          console.warn('Error closing Torrey scale serial port:', e);
        }
        this.port = null;
      }
    } catch (e) {
      console.warn('Cleanup error during disconnect:', e);
    }
  }

  public async sendCommand(cmd: string): Promise<boolean> {
    if (!this.port || !this.isConnected || !this.port.writable) return false;
    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      await writer.write(encoder.encode(cmd.endsWith('\r\n') ? cmd : `${cmd}\r\n`));
      try {
        writer.releaseLock();
      } catch (e) {
        // ignore lock release error if writer was already released
      }
      return true;
    } catch (err: any) {
      console.warn('Failed to send command to Torrey Scale:', err);
      return false;
    }
  }

  /**
   * Send 'P' command to query current weight from Torrey EQB-100
   */
  public async requestWeight(): Promise<boolean> {
    return this.sendCommand('P');
  }

  /**
   * Send 'T' command to Tare scale
   */
  public async tareScale(): Promise<boolean> {
    return this.sendCommand('T');
  }

  /**
   * Send 'Z' command to Zero scale
   */
  public async zeroScale(): Promise<boolean> {
    return this.sendCommand('Z');
  }

  private async startReadingLoop() {
    if (!this.port || !this.port.readable) return;

    let buffer = '';
    const textDecoder = new TextDecoder();

    try {
      this.reader = this.port.readable.getReader();
    } catch (err: any) {
      console.warn('Could not get reader from port.readable:', err);
      return;
    }

    try {
      while (this.isConnected && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          buffer += textDecoder.decode(value, { stream: true });
          // Torrey lines end with CR, LF, or CR+LF
          const lines = buffer.split(/[\r\n]+/);
          // Keep incomplete trailing string in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const reading = parseTorreyWeightString(line);
            if (reading && this.onReadingCallback) {
              this.onReadingCallback(reading);
            }
          }
        }
      }
    } catch (err: any) {
      if (this.isConnected && this.onErrorCallback) {
        this.onErrorCallback(`Error de lectura en báscula: ${err?.message || err}`);
      }
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch (e) {
          // ignore releaseLock error
        }
        this.reader = null;
      }
    }
  }

  public getStatus() {
    return this.isConnected;
  }
}
