/**
 * Utility module for compact standardized barcode payloads and legend explanations
 */

import { getDailyLotCode } from './productAndLotUtils';

export interface BarcodeExplanationSegment {
  code: string;
  label: string;
  description: string;
  value: string;
  badgeBg: string;
}

/**
 * Generates a clean, compact alphanumeric barcode payload compatible with Code128 / Zebra scanners.
 * Format: P{productCode}L{lot}W{weight}E{expiration}
 * Example: P12345L040926W2500E261231
 */
export function generateCompactBarcodePayload(data: {
  productCode: string;
  lot: string;
  weight: number;
  expirationDate?: string;
  id?: string;
}): string {
  // 1. Clean product code: remove PRD- prefix and special characters (e.g. 12-345 -> 12345)
  const cleanProd = data.productCode.replace(/^PRD-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '12345';

  // 2. Clean lot number: remove LOT- prefix and special characters (e.g. 040926 -> 040926)
  const cleanLot = data.lot ? data.lot.replace(/^LOT-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : getDailyLotCode();

  // 3. Compact weight in 4 digits (e.g. 25.00 -> 2500, 5.5 -> 0550)
  const weightInHundredths = Math.round((data.weight || 0) * 100);
  const weightStr = weightInHundredths.toString().padStart(4, '0');

  // 4. Expiration Date in YYMMDD (e.g. 2026-12-31 -> 261231)
  let expStr = '';
  if (data.expirationDate && data.expirationDate !== 'N/A' && data.expirationDate !== 'SIN EXPIRACIÓN') {
    const rawDigits = data.expirationDate.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 6) {
      if (rawDigits.length === 8) {
        // YYYYMMDD -> YYMMDD
        expStr = `E${rawDigits.slice(2)}`;
      } else {
        expStr = `E${rawDigits.slice(0, 6)}`;
      }
    }
  }

  // 5. Unique Label ID suffix to guarantee 100% individual label uniqueness (e.g. |LBL-73613)
  const idSuffix = data.id && data.id.trim() ? `|${data.id.trim().toUpperCase()}` : '';

  // Final compact string: P{product}L{lot}W{weight}E{expiration}|{id}
  return `P${cleanProd}L${cleanLot}W${weightStr}${expStr}${idSuffix}`;
}

/**
 * Explains a barcode payload by parsing its compact segments for visual UI legend display
 */
export function explainBarcodePayload(
  payload: string,
  fallbackData?: {
    productCode?: string;
    productName?: string;
    lot?: string;
    weight?: number;
    unit?: string;
    expirationDate?: string;
    id?: string;
  }
): BarcodeExplanationSegment[] {
  const dailyLot = getDailyLotCode();
  const cleanPayload = payload || (fallbackData
    ? generateCompactBarcodePayload({
        productCode: fallbackData.productCode || '12-345',
        lot: fallbackData.lot || dailyLot,
        weight: fallbackData.weight || 25,
        expirationDate: fallbackData.expirationDate,
        id: fallbackData.id || 'LBL-73613',
      })
    : `P12345L${dailyLot}W2500E261231|LBL-73613`);

  const segments: BarcodeExplanationSegment[] = [];

  // Match P segment
  const pMatch = cleanPayload.match(/P([A-Z0-9]+?)(?=L|W|E|$)/);
  if (pMatch) {
    segments.push({
      code: `P${pMatch[1]}`,
      label: 'P: Código de Producto',
      description: 'Identificador consecutivo de producto',
      value: fallbackData?.productCode
        ? `${fallbackData.productCode}${fallbackData.productName ? ` (${fallbackData.productName})` : ''}`
        : `Producto ${pMatch[1]}`,
      badgeBg: 'bg-[#141414] text-white',
    });
  }

  // Match L segment
  const lMatch = cleanPayload.match(/L([A-Z0-9]+?)(?=W|E|$)/);
  if (lMatch) {
    segments.push({
      code: `L${lMatch[1]}`,
      label: 'L: Número de Lote',
      description: 'Lote de producción o almacén',
      value: fallbackData?.lot || `Lote ${lMatch[1]}`,
      badgeBg: 'bg-amber-300 text-[#141414]',
    });
  }

  // Match W segment
  const wMatch = cleanPayload.match(/W([0-9]{4})/);
  if (wMatch) {
    const valKg = (parseInt(wMatch[1], 10) / 100).toFixed(2);
    segments.push({
      code: `W${wMatch[1]}`,
      label: 'W: Peso Neto',
      description: 'Peso numérico en décimas',
      value: `${valKg} ${fallbackData?.unit || 'KG'}`,
      badgeBg: 'bg-emerald-700 text-white',
    });
  }

  // Match E segment
  const eMatch = cleanPayload.match(/E([0-9]{6})/);
  if (eMatch) {
    const yy = eMatch[1].slice(0, 2);
    const mm = eMatch[1].slice(2, 4);
    const dd = eMatch[1].slice(4, 6);
    segments.push({
      code: `E${eMatch[1]}`,
      label: 'E: Vencimiento',
      description: 'Fecha YYMMDD',
      value: `${dd}/${mm}/20${yy}`,
      badgeBg: 'bg-cyan-800 text-white',
    });
  }

  // Match LBL unique code segment
  const lblMatch = cleanPayload.match(/\|?(LBL-[A-Z0-9]+)/i);
  if (lblMatch) {
    segments.push({
      code: lblMatch[1].toUpperCase(),
      label: 'ID: Folio Único',
      description: 'Identificador consecutivo de etiqueta',
      value: lblMatch[1].toUpperCase(),
      badgeBg: 'bg-indigo-700 text-white',
    });
  }

  return segments;
}
