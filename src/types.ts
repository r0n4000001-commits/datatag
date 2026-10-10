export type UserRole =
  | 'Desarrollador de Mercado'
  | 'Jefe de Ventas'
  | 'Telemarketing'
  | 'Operador de Embarque'
  | 'Gerente Sucursal'
  | 'Operador de Etiquetado'
  | 'Administrador Almacén'
  | 'Sistemas'
  | 'Dirección';

export interface SystemUser {
  id: string;
  employeeNumber: string; // p.ej. EMP-1001, 10452, ROOT-001
  name: string; // Nombre completo
  role: UserRole;
  accessPin?: string; // Código numérico de 5 dígitos (p.ej. '72879', '10001')
  password?: string; // Contraseña o PIN de acceso
  assignedZone?: string; // p.ej. 'Zona Norte', 'Zona Sur', 'Zona Centro', 'Zona Bajío', 'Zona Occidente'
  branch?: string; // Sucursal o Planta
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export type BarcodeType = 'Code128' | 'GS1-128' | 'QRCode' | 'PDF417';

export type Warehouse = 'Congelado';

export type ProductConditionFlag = 'A' | 'B' | 'R' | 'M' | 'I';

export interface ProductConditionInfo {
  code: ProductConditionFlag;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export const PRODUCT_CONDITIONS: Record<ProductConditionFlag, ProductConditionInfo> = {
  A: {
    code: 'A',
    label: '[A] Apto / Reacondicionable',
    shortLabel: 'Apto',
    emoji: '🟢',
    color: 'bg-emerald-100 text-emerald-950 border-emerald-500 hover:bg-emerald-200',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    description: 'Producto en óptimas condiciones para venta o proceso',
  },
  B: {
    code: 'B',
    label: '[B] Segunda',
    shortLabel: 'Segunda',
    emoji: '🟡',
    color: 'bg-amber-100 text-amber-950 border-amber-500 hover:bg-amber-200',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-black',
    description: 'Calidad secundaria con imperfección menor o estética',
  },
  R: {
    code: 'R',
    label: '[R] Remate',
    shortLabel: 'Remate',
    emoji: '🟠',
    color: 'bg-orange-100 text-orange-950 border-orange-500 hover:bg-orange-200',
    badgeBg: 'bg-orange-600',
    badgeText: 'text-white',
    description: 'Producto en oferta/descuento por rotación rápida o pronto vencimiento',
  },
  M: {
    code: 'M',
    label: '[M] Merma',
    shortLabel: 'Merma',
    emoji: '🔴',
    color: 'bg-rose-100 text-rose-950 border-rose-500 hover:bg-rose-200',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
    description: 'Producto no apto para venta comercial regular (desecho o merma)',
  },
  I: {
    code: 'I',
    label: '[I] Inspección',
    shortLabel: 'Inspección',
    emoji: '🔵',
    color: 'bg-blue-100 text-blue-950 border-blue-500 hover:bg-blue-200',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    description: 'Producto retenido temporalmente en control de calidad o cuarentena',
  },
};

export interface ConditionExpirationRule {
  enabled: boolean;
  days: number;
  description?: string;
}

export type ConditionExpirationConfig = Record<ProductConditionFlag, ConditionExpirationRule>;

export const DEFAULT_CONDITION_EXPIRATION_CONFIG: ConditionExpirationConfig = {
  A: { enabled: true, days: 360, description: '360 días (Producto Apto estándar)' },
  B: { enabled: true, days: 180, description: '180 días (Producto de Segunda / Rotación media)' },
  R: { enabled: true, days: 30, description: '30 días (Producto de Remate / Venta pronta)' },
  M: { enabled: true, days: 7, description: '7 días (Merma / Desecho controlado)' },
  I: { enabled: true, days: 15, description: '15 días (Inspección / Cuarentena temporal)' },
};

export interface SubWarehouse {
  id: string;
  code: string;
  name: string;
  parentWarehouse: Warehouse;
  description?: string;
  capacityKg?: number;
}

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
}

export interface SpeciesItem {
  id: string;
  code: string;
  name: string;
  legend: string;
  origin?: string;
  description?: string;
  badgeColor?: string;
}

export interface TareItem {
  id: string; // e.g. "TAR-1"
  tareNumber: number; // e.g. 1, 2, 3... (Número de tara para asignación rápida)
  code: string; // e.g. "T-CARTON", "T-PLASTICA", "T-BOLSA", "T-TINA"
  name: string; // e.g. "Caja Cartón Corrugado", "Caja Plástica Reutilizable"
  weight: number; // Peso a restar en KG (e.g. 1.20, 2.10, 0.05, 0.85)
  unit: 'KG' | 'LB' | 'G';
  description?: string;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: 'KG' | 'LB' | 'PZA' | 'CAJA' | 'L' | 'G';
  reorderPoint: number;
  description?: string;
  defaultWeight?: number;
  barcodeType: BarcodeType;
  warehouse?: Warehouse;
  subWarehouse?: string;
  speciesLegend?: string;
  tareId?: string; // ID de la tara asignada por defecto a este producto
  tareNumber?: number; // Número de tara (1, 2, 3...)
  tareWeight?: number; // Peso guardado de tara (KG)
}

export interface PrintedLabel {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  lot: string;
  weight: number; // Peso neto registrado (bruto - tara)
  grossWeight?: number; // Peso bruto de la báscula antes de descontar tara
  tareWeight?: number; // Peso de la tara aplicada
  tareId?: string;
  tareNumber?: number;
  tareName?: string;
  unit: string;
  warehouse: Warehouse;
  subWarehouse?: string;
  conditionFlag?: ProductConditionFlag;
  expirationDate?: string;
  domicilio?: string;
  speciesLegend?: string;
  printTimestamp: string;
  barcodePayload: string;
  printerIp: string;
  status: 'printed' | 'simulated' | 'failed';
  copies: number;
  printedBy?: string; // Nombre + No. Empleado
  employeeNumber?: string;
  isDischarged: boolean;
  dischargedAt?: string;
  dischargedBy?: string;
  dischargeReason?: string;
  dischargeFolio?: string;
  isReserved?: boolean;
  reservedBy?: string;
  reservationId?: string;
}

export type ReservationStatus = 'PENDIENTE' | 'APROBADO' | 'DESPACHADO' | 'CANCELADO';

export interface MarketReservationItem {
  labelId: string;
  productCode: string;
  productName: string;
  lot: string;
  weight: number;
  unit: string;
  warehouse?: Warehouse | string;
  subWarehouse?: string;
}

export interface OrderItemSubstitution {
  originalLabelId: string;
  originalProductCode: string;
  originalProductName: string;
  originalLot: string;
  originalWeight: number;
  originalUnit?: string;
  substitutedWithLabelId: string;
  substitutedWithProductCode: string;
  substitutedWithProductName: string;
  substitutedWithLot: string;
  substitutedWithWeight: number;
  substitutedWithUnit?: string;
  weightDifference?: number; // Diferencia en KG (positivo o negativo)
  substitutedAt: string;
  substitutedBy: string;
  reason?: string;
}

export type MarketOrderType = 'PEDIDO_VENTA' | 'SOLICITUD_MUESTRA';

export interface MarketReservation {
  id: string;
  orderType?: MarketOrderType;
  internalFolio?: string;
  developerName: string;
  developerRole?: string;
  developerZone?: string; // Zona asignada al desarrollador de mercado
  clientOrEvent: string;
  reason: 'Muestreo / Degustación' | 'Demostración Comercial' | 'Evento / Feria' | 'Reserva Venta Especial' | 'Prueba de Calidad' | 'Venta Directa' | 'Apartado Comercial' | 'Pedido Programado' | 'Otro';
  status: ReservationStatus;
  reservationDate: string;
  requiredDate?: string;
  notes?: string;
  labelIds: string[];
  items: MarketReservationItem[];
  totalWeight: number;
  totalItems: number;
  substitutions?: OrderItemSubstitution[];
  hasSubstitutions?: boolean;
  originalItems?: MarketReservationItem[];
  originalTotalWeight?: number;
  approvedAt?: string;
  approvedBy?: string;
  sifproFolio?: string;
  exitFolio?: string;
  dischargeFolio?: string;
  dischargedAt?: string;
  dischargedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  cancellationNotes?: string;
}

export interface TelemarketingCancellationRecord {
  id: string;
  reservationId: string;
  orderType?: MarketOrderType;
  developerName: string;
  developerRole?: string;
  developerZone?: string;
  clientOrEvent: string;
  reasonForReservation: string;
  cancellationReason: string;
  cancellationNotes?: string;
  cancelledAt: string;
  cancelledBy: string;
  totalWeight: number;
  totalItems: number;
  itemsSummary: string;
  sourceType: 'SIFPRO' | 'Producto No Conformante' | 'PEDIDO_VENTA' | 'SOLICITUD_MUESTRA';
  sifproFolio?: string;
}

export interface DischargeRecord {
  id: string;
  exitFolio?: string; // Folio consecutivo de proceso de salida, p.ej. "SAL-0504"
  labelId: string;
  productCode: string;
  productName: string;
  lot: string;
  weight: number;
  unit: string;
  warehouse?: Warehouse;
  subWarehouse?: string;
  conditionFlag?: ProductConditionFlag;
  scannedCode: string;
  timestamp: string;
  scannedBy: string;
  reason: 'Venta' | 'Despacho Producción' | 'Transferencia' | 'Merma / Vencimiento' | 'Ajuste';
  notes?: string;
}

export type PrinterStatus = 'online' | 'offline' | 'checking' | 'unknown';

export interface ZebraPrinterConfig {
  ip: string;
  port: number;
  darkness: number; // 0-30
  dpi: 203 | 300 | 600;
  widthInches: number;
  heightInches: number;
}

export interface LocalPrinterConfig {
  printerName: string;
  connectionType: 'system_driver' | 'web_serial' | 'web_usb';
  vendorId?: string;
  productId?: string;
  baudRate: number;
  paperWidthMm: number;
  paperHeightMm: number;
  autoOpenPrintDialog: boolean;
  notes?: string;
}

export type ZebraFontId = '0' | 'GS' | 'D' | 'E' | 'H' | 'F' | 'G' | 'B' | 'A';

export interface ZebraFontOption {
  id: ZebraFontId;
  code: string;
  name: string;
  familyDescription: string;
  zplCode: string;
  cssFamily: string;
  cssWeight?: string;
  cssLetterSpacing?: string;
  sampleText?: string;
}

export interface LabelFormatConfig {
  presetName?: string;
  widthInches: number;
  heightInches: number;
  dpi: 203 | 300 | 600;
  darkness: number;
  orientation: 'N' | 'R' | 'I' | 'B'; // Normal, Rotated 90, Inverted 180, Bottom-up 270

  // Branding & Company
  showCompanyHeader: boolean;
  companyHeader: string;
  headerX?: number; // dots
  headerY?: number; // dots
  headerFontSize: number; // 14 - 60
  headerFont?: ZebraFontId;

  // Línea Divisoria Horizontal (Configurable y Movible)
  showDividerLine?: boolean;
  dividerLineX?: number; // dots
  dividerLineY?: number; // dots
  dividerLineWidth?: number; // dots (longitud)
  dividerLineThickness?: number; // dots (grosor 1-12)

  // Logo in Label
  showLogo?: boolean;
  logoUrl?: string;
  logoX?: number; // dots
  logoY?: number; // dots
  logoWidth?: number; // dots
  logoHeight?: number; // dots

  // Product Fields
  productNameX?: number; // dots
  productNameY?: number; // dots
  productNameFontSize: number; // 18 - 70
  productNameFont?: ZebraFontId;
  showCategory: boolean;
  showWarehouseBadge: boolean;
  detailsX?: number; // dots
  detailsY?: number; // dots
  detailsFontSize?: number; // 14 - 40
  detailsFont?: ZebraFontId;

  // Lot
  showLot: boolean;
  lotX?: number; // dots
  lotY?: number; // dots
  lotFontSize?: number; // 14 - 40
  lotFont?: ZebraFontId;

  // Weight
  showWeight: boolean;
  weightX?: number; // dots
  weightY?: number; // dots
  weightFontSize: number; // 18 - 60
  weightBoxStyle: 'standard' | 'highlight' | 'border';
  weightFont?: ZebraFontId;

  // Dates
  showExpirationDate: boolean;
  expirationX?: number; // dots
  expirationY?: number; // dots
  expirationFontSize?: number; // 14 - 40
  expirationFont?: ZebraFontId;
  showPrintTimestamp: boolean;

  // Temperatura de Conservación
  showTemperature?: boolean;
  temperatureText?: string;
  temperatureX?: number; // dots
  temperatureY?: number; // dots
  temperatureFontSize?: number; // 12 - 36
  temperatureFont?: ZebraFontId;

  // Domicilio / Dirección
  showAddress?: boolean;
  addressText?: string;
  addressX?: number; // dots
  addressY?: number; // dots
  addressFontSize?: number; // 12 - 36
  addressFont?: ZebraFontId;

  // Leyenda de Especie / Identificador (ej. %100 CERDO, %100 RES, %100 AVE)
  showSpeciesLegend?: boolean;
  speciesLegendText?: string;
  speciesLegendX?: number; // dots
  speciesLegendY?: number; // dots
  speciesLegendFontSize?: number; // 14 - 50
  speciesLegendStyle?: 'standard' | 'badge' | 'border';
  speciesLegendFont?: ZebraFontId;

  // Barcode / QR Code
  barcodeType: BarcodeType;
  barcodeHeightDots: number; // 30 - 200
  barcodeModuleWidth: number; // 2 - 8
  barcodePositionX: number; // offset X in dots
  barcodePositionY: number; // offset Y in dots
  showBarcodeText: boolean;

  // Footer & Layout
  footerX?: number; // dots
  footerY?: number; // dots
  footerFontSize?: number; // 12 - 30
  footerFont?: ZebraFontId;
  offsetX: number; // dots margin X
  offsetY: number; // dots margin Y
  lineSpacing: number; // dots gap between lines
  showFooterId: boolean;
  customFooterText: string;
  savedAt?: number; // Unix timestamp in milliseconds for versioning & conflict resolution
}

export interface SavedLabelTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: LabelFormatConfig;
  isDefault?: boolean;
}

export interface LabelFormInputs {
  productId: string;
  lot: string;
  weight: number;
  warehouse: Warehouse;
  subWarehouse?: string;
  hasExpiration: boolean;
  expirationDate: string;
  domicilio?: string;
  speciesLegend?: string;
  copies: number;
  customNotes?: string;
}

export interface MarketSettings {
  isReleased: boolean;
  lastManualOverride?: string;
  scheduleEnabled: boolean;
  openTime: string; // "10:00" format
  closeTime: string; // "18:00" format
}

export interface SifproInventoryRecord {
  id: string;
  code: string; // p.ej. "06-106" (Código)
  name: string; // p.ej. "Top Sirloin TT" (Nombre)
  date: string; // p.ej. "20260516" (Fecha)
  folio: string; // p.ej. "5248" (Folio)
  lot: string; // p.ej. "10480" (Lote)
  weight: number | string; // p.ej. 24.09 o "24.09" (Peso en KG)
  readingDate: string; // p.ej. "20260627" (Fecha Lectura)
  warehouseId: string; // p.ej. "1" (Almacén)
  recordType: 'Físico SIFPRO' | 'Venta Diaria' | 'Recepción Matriz' | 'Devolución SIFPRO';
  uploadedAt: string;
  docDate?: string; // Fecha asignada al documento cargado
  fileName?: string; // Nombre del archivo cargado
  batchId?: string; // Identificador único de la carga de documento
  isReserved?: boolean;
  reservedBy?: string;
  reason?: string; // Motivo de la devolución / cliente (opcional)
  outWeight?: number | string; // Peso de salida original para devoluciones
}

export interface SystemResetOptions {
  mode: 'demo_flow' | 'clean_zero' | 'factory_full';
  resetReservations?: boolean;
  seedDemoOrders?: boolean;
  resetLabelsInventory?: boolean;
  clearDischarges?: boolean;
  resetCatalogs?: boolean;
  resetPrintersAndFormats?: boolean;
  releaseMarketCatalog?: boolean;
}
