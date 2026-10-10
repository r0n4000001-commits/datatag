import { Product, ZebraPrinterConfig, LabelFormatConfig, BarcodeType, Warehouse, ProductConditionFlag } from '../types';
import { generateCompactBarcodePayload } from './barcodeFormat';
import { getZplFontCommand } from './zebraFonts';

export interface LabelData {
  id: string;
  product: Product;
  lot: string;
  weight: number;
  grossWeight?: number;
  tareWeight?: number;
  tareNumber?: number;
  unit: string;
  warehouse: Warehouse;
  conditionFlag?: ProductConditionFlag;
  expirationDate?: string;
  domicilio?: string;
  speciesLegend?: string;
  timestamp: string;
  notes?: string;
}

/**
 * Generates ZPL II code string for Zebra thermal printers
 */
export function generateZplCode(
  data: LabelData,
  config: ZebraPrinterConfig,
  formatConfig?: LabelFormatConfig
): { zpl: string; payload: string } {
  const widthInches = formatConfig?.widthInches || config.widthInches || 4;
  const heightInches = formatConfig?.heightInches || config.heightInches || 3;
  const dpi = formatConfig?.dpi || config.dpi || 203;
  const darkness = formatConfig?.darkness ?? config.darkness ?? 15;
  const orientation = formatConfig?.orientation || 'N';

  // Base DPI scale factor (format dot coordinates are designed relative to 203 DPI)
  const dpiScale = dpi / 203;

  const widthDots = Math.round(widthInches * dpi);
  const heightDots = Math.round(heightInches * dpi);

  const marginX = Math.round((formatConfig?.offsetX ?? 20) * dpiScale);
  const marginY = Math.round((formatConfig?.offsetY ?? 15) * dpiScale);

  // Compact standardized barcode payload: P{product}L{lot}W{weight}E{expiration}
  const payload = generateCompactBarcodePayload({
    productCode: data.product.code,
    lot: data.lot,
    weight: data.weight,
    expirationDate: data.expirationDate,
    id: data.id,
  });

  const barcodeType: BarcodeType = formatConfig?.barcodeType || data.product.barcodeType || 'QRCode';
  const qrScale = Math.min(8, Math.max(2, formatConfig?.barcodeModuleWidth || 4));
  const bcHeight = Math.round((formatConfig?.barcodeHeightDots || 90) * dpiScale);
  const bcModWidth = Math.max(1, Math.round((formatConfig?.barcodeModuleWidth || 2) * dpiScale));
  const bcPosX = Math.round((formatConfig?.barcodePositionX ?? 30) * dpiScale) + marginX;
  const bcPosY = Math.round((formatConfig?.barcodePositionY ?? 295) * dpiScale) + marginY;
  const showBcText = formatConfig?.showBarcodeText !== false;

  let barcodeZpl = '';
  if (barcodeType === 'QRCode') {
    const qrDots = Math.round(35 * qrScale * dpiScale);
    let folioTextZpl = '';
    if (showBcText) {
      const folioBcFont = Math.round(20 * dpiScale);
      const folioBcY = bcPosY + qrDots + Math.round(6 * dpiScale);
      const folioFontCmd = getZplFontCommand(formatConfig?.detailsFont, orientation, folioBcFont, Math.round(folioBcFont * 0.85));
      folioTextZpl = `\n^FO${bcPosX},${folioBcY}${folioFontCmd}^FDFOLIO: ${sanitizeZplText(data.id)}^FS`;
    }
    barcodeZpl = `^FO${bcPosX},${bcPosY}^BQ${orientation},2,${qrScale}^FDLA,${payload}^FS${folioTextZpl}`;
  } else if (barcodeType === 'PDF417') {
    barcodeZpl = `^FO${bcPosX},${bcPosY}^BP${orientation},8,${bcHeight},2^FD${payload}^FS`;
  } else if (barcodeType === 'GS1-128') {
    barcodeZpl = `^FO${bcPosX},${bcPosY}^BY${bcModWidth},3.0,${bcHeight}^BC${orientation},${bcHeight},${showBcText ? 'Y' : 'N'},N,N^FD>;"01"${data.product.code}>;10${data.lot}^FS`;
  } else {
    // Code 128 (Fallback)
    const folioBcFont = Math.round(24 * dpiScale);
    const folioBcY = bcPosY + bcHeight + Math.round(8 * dpiScale);
    const folioFontCmd = getZplFontCommand(formatConfig?.detailsFont, orientation, folioBcFont, Math.round(folioBcFont * 0.85));
    const folioTextZpl = `\n^FO${bcPosX},${folioBcY}${folioFontCmd}^FDFOLIO UNICO: ${sanitizeZplText(data.id)}^FS`;

    barcodeZpl = `^FO${bcPosX},${bcPosY}^BY${bcModWidth},3.0,${bcHeight}^BC${orientation},${bcHeight},${showBcText ? 'Y' : 'N'},N,N^FD${payload}^FS${folioTextZpl}`;
  }

  const dateFormatted = new Date(data.timestamp || Date.now()).toLocaleDateString('es-ES');

  // 1. Header / Company Name
  let headerZpl = '';
  if (formatConfig?.showCompanyHeader !== false) {
    const compText = sanitizeZplText((formatConfig?.companyHeader || 'YOREME CORTE Y PROCESOS').toUpperCase());
    const hFont = Math.round((formatConfig?.headerFontSize || 36) * dpiScale);
    const hX = Math.round((formatConfig?.headerX ?? 30) * dpiScale) + marginX;
    const hY = Math.round((formatConfig?.headerY ?? 20) * dpiScale) + marginY;
    const lineLen = widthDots - hX - marginX;
    const fontCmd = getZplFontCommand(formatConfig?.headerFont, orientation, hFont, Math.round(hFont * 0.9));
    headerZpl = `^FO${hX},${hY}${fontCmd}^FD${compText}^FS`;
  }

  // 1.2 Línea Divisoria Horizontal (Configurable y Movible)
  let dividerZpl = '';
  if (formatConfig?.showDividerLine !== false) {
    const hlX = Math.round((formatConfig?.dividerLineX ?? 30) * dpiScale) + marginX;
    const hlY = Math.round((formatConfig?.dividerLineY ?? 62) * dpiScale) + marginY;
    const defaultWidth = Math.max(50, widthDots - hlX - marginX);
    const hlWidth = Math.round((formatConfig?.dividerLineWidth ?? defaultWidth) * dpiScale);
    const hlThick = Math.max(1, Math.round((formatConfig?.dividerLineThickness ?? 2) * dpiScale));
    dividerZpl = `^FO${hlX},${hlY}^GB${hlWidth},${hlThick},${hlThick}^FS`;
  }

  // 1.5 Logo
  let logoZpl = '';
  if (formatConfig?.showLogo && formatConfig?.logoUrl) {
    const lX = Math.round((formatConfig?.logoX ?? 620) * dpiScale) + marginX;
    const lY = Math.round((formatConfig?.logoY ?? 15) * dpiScale) + marginY;
    const lW = Math.round((formatConfig?.logoWidth ?? 120) * dpiScale);
    const lH = Math.round((formatConfig?.logoHeight ?? 65) * dpiScale);
    logoZpl = `^FO${lX},${lY}^GB${lW},${lH},2^FS\n^FO${lX + 8},${lY + Math.max(4, Math.round((lH - 16) / 2))}^A0${orientation},16,14^FD[LOGO]^FS`;
  }

  // 2. Product Name
  const pFont = Math.round((formatConfig?.productNameFontSize || 50) * dpiScale);
  const pX = Math.round((formatConfig?.productNameX ?? 30) * dpiScale) + marginX;
  const pY = Math.round((formatConfig?.productNameY ?? 75) * dpiScale) + marginY;
  const pText = sanitizeZplText(data.product.name.toUpperCase());
  let prodNameZpl = '';
  if (pText.length > 25) {
    const fontCmd = getZplFontCommand(formatConfig?.productNameFont, orientation, Math.round(pFont * 0.85), Math.round(pFont * 0.75));
    prodNameZpl = `^FO${pX},${pY}${fontCmd}^FB${widthDots - pX - marginX},2,0,L,0^FD${pText}^FS`;
  } else {
    const fontCmd = getZplFontCommand(formatConfig?.productNameFont, orientation, pFont, Math.round(pFont * 0.9));
    prodNameZpl = `^FO${pX},${pY}${fontCmd}^FD${pText}^FS`;
  }

  // 2.2 Leyenda de Especie / Identificador (ej. %100 CERDO, %100 RES, %100 AVE)
  let speciesZpl = '';
  const rawSpecies = data.speciesLegend !== undefined
    ? data.speciesLegend
    : (data.product?.speciesLegend || formatConfig?.speciesLegendText || '');
  if (formatConfig?.showSpeciesLegend !== false && rawSpecies && rawSpecies.trim()) {
    const spText = sanitizeZplText(rawSpecies.toUpperCase());
    const spFont = Math.round((formatConfig?.speciesLegendFontSize || 30) * dpiScale);
    const spX = Math.round((formatConfig?.speciesLegendX ?? 520) * dpiScale) + marginX;
    const spY = Math.round((formatConfig?.speciesLegendY ?? 75) * dpiScale) + marginY;
    const spStyle = formatConfig?.speciesLegendStyle || 'badge';
    const approxCharW = Math.round(spFont * 0.65);
    const boxWidth = Math.max(70, Math.round(spText.length * approxCharW) + 16);
    const boxHeight = spFont + 10;
    const fontCmd = getZplFontCommand(formatConfig?.speciesLegendFont, orientation, spFont, Math.round(spFont * 0.85));

    if (spStyle === 'badge') {
      speciesZpl = `^FO${spX - 6},${spY - 4}^GB${boxWidth},${boxHeight},${boxHeight},B,0^FS\n^FO${spX},${spY}${fontCmd}^FR^FD${spText}^FS`;
    } else if (spStyle === 'border') {
      speciesZpl = `^FO${spX - 6},${spY - 4}^GB${boxWidth},${boxHeight},3,B,0^FS\n^FO${spX},${spY}${fontCmd}^FD${spText}^FS`;
    } else {
      speciesZpl = `^FO${spX},${spY}${fontCmd}^FD${spText}^FS`;
    }
  }

  // 3. Code & Category & Warehouse & Condition Flag
  let detailsZpl = '';
  const dFont = Math.round((formatConfig?.detailsFontSize || 34) * dpiScale);
  const dX = Math.round((formatConfig?.detailsX ?? 30) * dpiScale) + marginX;
  const dY = Math.round((formatConfig?.detailsY ?? 135) * dpiScale) + marginY;
  const showCat = formatConfig?.showCategory !== false;
  const showWh = formatConfig?.showWarehouseBadge !== false;
  const catText = showCat ? ` | ${sanitizeZplText(data.product.category)}` : '';
  const whName = data.warehouse || data.product.warehouse || 'Congelado';
  const whText = showWh ? ` [${sanitizeZplText(whName.toUpperCase())}]` : '';
  const flagCode = data.conditionFlag || 'A';
  const flagText = ` [${flagCode}]`;
  const detailsFontCmd = getZplFontCommand(formatConfig?.detailsFont, orientation, dFont, Math.round(dFont * 0.9));

  detailsZpl = `^FO${dX},${dY}${detailsFontCmd}^FDCOD: ${sanitizeZplText(data.product.code)}${catText}${whText}${flagText}^FS`;

  // 4. Lot
  let lotZpl = '';
  if (formatConfig?.showLot !== false) {
    const lFont = Math.round((formatConfig?.lotFontSize || 38) * dpiScale);
    const lX = Math.round((formatConfig?.lotX ?? 30) * dpiScale) + marginX;
    const lY = Math.round((formatConfig?.lotY ?? 180) * dpiScale) + marginY;
    const lotFontCmd = getZplFontCommand(formatConfig?.lotFont, orientation, lFont, Math.round(lFont * 0.9));
    lotZpl = `^FO${lX},${lY}${lotFontCmd}^FDLOTE: ${sanitizeZplText(data.lot)}^FS`;
  }

  // 5. Weight
  let weightZpl = '';
  if (formatConfig?.showWeight !== false) {
    const wFont = Math.round((formatConfig?.weightFontSize || 44) * dpiScale);
    const style = formatConfig?.weightBoxStyle || 'highlight';
    const weightValStr = typeof data.weight === 'number' && !isNaN(data.weight) ? data.weight.toFixed(2) : '0.00';
    const weightText = `PESO: ${weightValStr} ${data.unit || data.product.unit || 'KG'}`;
    const wX = Math.round((formatConfig?.weightX ?? 400) * dpiScale) + marginX;
    const wY = Math.round((formatConfig?.weightY ?? 180) * dpiScale) + marginY;

    const boxWidth = Math.round(weightText.length * (wFont * 0.65)) + 20;
    const boxHeight = wFont + 12;
    const weightFontCmd = getZplFontCommand(formatConfig?.weightFont, orientation, wFont, Math.round(wFont * 0.9));

    if (style === 'highlight') {
      weightZpl = `^FO${wX - 8},${wY - 6}^GB${boxWidth},${boxHeight},${boxHeight},B,0^FS\n^FO${wX},${wY}${weightFontCmd}^FR^FD${weightText}^FS`;
    } else if (style === 'border') {
      weightZpl = `^FO${wX - 8},${wY - 6}^GB${boxWidth},${boxHeight},3,B,0^FS\n^FO${wX},${wY}${weightFontCmd}^FD${weightText}^FS`;
    } else {
      weightZpl = `^FO${wX},${wY}${weightFontCmd}^FD${weightText}^FS`;
    }
  }

  // 6. Expiration Date
  let expZpl = '';
  if (formatConfig?.showExpirationDate !== false) {
    const eFont = Math.round((formatConfig?.expirationFontSize || 36) * dpiScale);
    const eX = Math.round((formatConfig?.expirationX ?? 30) * dpiScale) + marginX;
    const eY = Math.round((formatConfig?.expirationY ?? 235) * dpiScale) + marginY;
    const expLineText = data.expirationDate
      ? `F. CADUCIDAD: ${data.expirationDate}`
      : `F. CADUCIDAD: SIN CADUCIDAD`;
    const expFontCmd = getZplFontCommand(formatConfig?.expirationFont, orientation, eFont, Math.round(eFont * 0.9));
    expZpl = `^FO${eX},${eY}${expFontCmd}^FD${expLineText}^FS`;
  }

  // 6.4 Temperatura de Conservación
  let tempZpl = '';
  if (formatConfig?.showTemperature !== false && formatConfig?.temperatureText) {
    const tFont = Math.round((formatConfig?.temperatureFontSize || 20) * dpiScale);
    const tX = Math.round((formatConfig?.temperatureX ?? 30) * dpiScale) + marginX;
    const tY = Math.round((formatConfig?.temperatureY ?? 240) * dpiScale) + marginY;
    const sanitizedTemp = sanitizeZplText(formatConfig.temperatureText.toUpperCase());
    const tempFontCmd = getZplFontCommand(formatConfig?.temperatureFont, orientation, tFont, Math.round(tFont * 0.85));
    tempZpl = `^FO${tX},${tY}${tempFontCmd}^FD${sanitizedTemp}^FS`;
  }

  // 6.5 Domicilio / Dirección
  let addressZpl = '';
  if (formatConfig?.showAddress !== false) {
    const rawAddress = data.domicilio || formatConfig?.addressText || '';
    if (rawAddress.trim()) {
      const aFont = Math.round((formatConfig?.addressFontSize || 22) * dpiScale);
      const aX = Math.round((formatConfig?.addressX ?? 30) * dpiScale) + marginX;
      const aY = Math.round((formatConfig?.addressY ?? 270) * dpiScale) + marginY;
      const sanitizedAddress = sanitizeZplText(rawAddress.toUpperCase());
      const maxLineWidth = Math.max(100, widthDots - aX - marginX);
      const addrFontCmd = getZplFontCommand(formatConfig?.addressFont, orientation, aFont, Math.round(aFont * 0.85));
      if (sanitizedAddress.length > 38) {
        addressZpl = `^FO${aX},${aY}${addrFontCmd}^FB${maxLineWidth},2,0,L,0^FD${sanitizedAddress}^FS`;
      } else {
        addressZpl = `^FO${aX},${aY}${addrFontCmd}^FD${sanitizedAddress}^FS`;
      }
    }
  }

  // 7. Footer
  const fX = Math.round((formatConfig?.footerX ?? 30) * dpiScale) + marginX;
  const fY = Math.round((formatConfig?.footerY ?? 440) * dpiScale) + marginY;
  const fFont = Math.round((formatConfig?.footerFontSize || 24) * dpiScale);
  const showFooterId = formatConfig?.showFooterId !== false;
  const customFooter = formatConfig?.customFooterText || 'SISTEMA ZPL CONTROL DE INVENTARIO';
  const footerFontCmd = getZplFontCommand(formatConfig?.footerFont, orientation, fFont, Math.round(fFont * 0.85));

  let footerZpl = `^FO${fX},${fY}^GB${widthDots - fX - marginX},2,2^FS\n`;
  if (formatConfig?.showPrintTimestamp !== false) {
    const tareAudit = data.tareWeight && data.tareWeight > 0 ? ` | TARA: -${data.tareWeight.toFixed(2)} KG` : '';
    footerZpl += `^FO${fX},${fY + 8}${footerFontCmd}^FDIMP: ${dateFormatted}${showFooterId ? ` | ${data.id}` : ''}${tareAudit}^FS\n`;
  }
  const subFooterFontCmd = getZplFontCommand(formatConfig?.footerFont, orientation, Math.max(14, Math.round(fFont * 0.75)), Math.max(12, Math.round(fFont * 0.7)));
  footerZpl += `^FO${fX},${fY + fFont + 12}${subFooterFontCmd}^FD${sanitizeZplText(customFooter)}^FS`;

  const zpl = `
^XA
^CI28
^PW${widthDots}
^LL${heightDots}
^MD${darkness}
^PR4,4
^LH0,0

${headerZpl}
${dividerZpl}
${logoZpl}
${prodNameZpl}
${speciesZpl}
${detailsZpl}
${lotZpl}
${weightZpl}
${expZpl}
${tempZpl}
${addressZpl}

${barcodeZpl}

${footerZpl}

^XZ
`.trim();

  return { zpl, payload };
}

/**
 * Generates a test label ZPL II code string
 */
export function generateTestZplCode(config: ZebraPrinterConfig, formatConfig?: LabelFormatConfig): string {
  const widthInches = formatConfig?.widthInches || config.widthInches || 4;
  const heightInches = formatConfig?.heightInches || config.heightInches || 3;
  const dpi = formatConfig?.dpi || config.dpi || 203;
  const darkness = formatConfig?.darkness ?? config.darkness ?? 15;

  const widthDots = Math.round(widthInches * dpi);
  const heightDots = Math.round(heightInches * dpi);
  const now = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

  return `
^XA
^CI28
^PW${widthDots}
^LL${heightDots}
^MD${darkness}
^PR4,4
^LH0,0

^FO40,25^A0N,34,34^FD*** ETIQUETA DE PRUEBA ZEBRA ***^FS
^FO40,65^GB${widthDots - 80},2,2^FS

^FO50,85^A0N,26,26^FDTEST IP: ${config.ip}:${config.port}^FS
^FO50,115^A0N,24,24^FDCONFIG: ${dpi} DPI | DENSIDAD: ${darkness}^FS
^FO50,145^A0N,24,24^FDTAMANO: ${widthInches}x${heightInches} PULGADAS^FS

^FO50,185^BY3,3,80^BCN,80,Y,N,N^FDTEST-ZEBRA-IP-OK^FS

^FO50,${heightDots - 50}^GB${widthDots - 100},1,1^FS
^FO50,${heightDots - 40}^A0N,20,20^FDIMPRESION DE PRUEBA: ${now}^FS
^FO50,${heightDots - 20}^A0N,18,18^FDSISTEMA ZPL CONTROL DE INVENTARIO^FS

^XZ
`.trim();
}

function sanitizeZplText(str: string): string {
  if (!str) return '';
  return str.replace(/[_^~]/g, '');
}
