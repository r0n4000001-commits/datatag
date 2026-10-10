import React, { useRef, useState, useEffect } from 'react';
import { LabelFormatConfig, Product, Warehouse, ProductConditionFlag } from '../types';
import { generateCompactBarcodePayload } from '../utils/barcodeFormat';
import { BarcodeRenderer } from './BarcodeRenderer';
import { getZebraFontCss } from '../utils/zebraFonts';

interface Props {
  labelFormatConfig: LabelFormatConfig;
  product: Product;
  lot: string;
  weight: number;
  unit: string;
  warehouse: Warehouse;
  conditionFlag?: ProductConditionFlag;
  expirationDate?: string;
  domicilio?: string;
  speciesLegend?: string;
  timestamp?: string;
  labelId?: string;
  interactiveDrag?: boolean;
  selectedElementKey?: string | null;
  onSelectElement?: (key: string) => void;
  onElementMove?: (key: string, newX: number, newY: number) => void;
  onElementPositionChange?: (key: string, newX: number, newY: number) => void;
}

export const SimulatedLabelCanvas: React.FC<Props> = ({
  labelFormatConfig,
  product,
  lot,
  weight,
  unit,
  warehouse,
  conditionFlag = 'A',
  expirationDate,
  domicilio,
  speciesLegend,
  timestamp,
  labelId = 'LBL-PREVIEW',
  interactiveDrag = false,
  selectedElementKey,
  onSelectElement,
  onElementMove,
  onElementPositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const widthInches = labelFormatConfig.widthInches || 4;
  const heightInches = labelFormatConfig.heightInches || 3;
  const dpi = labelFormatConfig.dpi || 203;

  const totalWidthDots = Math.round(widthInches * dpi);
  const totalHeightDots = Math.round(heightInches * dpi);

  const marginX = labelFormatConfig.offsetX ?? 20;
  const marginY = labelFormatConfig.offsetY ?? 15;

  const qrScale = Math.min(8, Math.max(2, labelFormatConfig.barcodeModuleWidth || 4));
  const qrDots = 35 * qrScale;

  // Calculate element positions in dots
  const elemPositions = {
    header: {
      x: (labelFormatConfig.headerX ?? 30) + marginX,
      y: (labelFormatConfig.headerY ?? 20) + marginY,
      fontSize: labelFormatConfig.headerFontSize || 36,
      show: labelFormatConfig.showCompanyHeader !== false,
    },
    dividerLine: {
      x: (labelFormatConfig.dividerLineX ?? 30) + marginX,
      y: (labelFormatConfig.dividerLineY ?? 62) + marginY,
      width: labelFormatConfig.dividerLineWidth ?? Math.max(50, totalWidthDots - ((labelFormatConfig.dividerLineX ?? 30) + marginX) - marginX),
      thickness: labelFormatConfig.dividerLineThickness ?? 2,
      show: labelFormatConfig.showDividerLine !== false,
    },
    logo: {
      x: (labelFormatConfig.logoX ?? 620) + marginX,
      y: (labelFormatConfig.logoY ?? 15) + marginY,
      width: labelFormatConfig.logoWidth || 120,
      height: labelFormatConfig.logoHeight || 65,
      show: labelFormatConfig.showLogo && Boolean(labelFormatConfig.logoUrl),
      url: labelFormatConfig.logoUrl,
    },
    productName: {
      x: (labelFormatConfig.productNameX ?? 30) + marginX,
      y: (labelFormatConfig.productNameY ?? 75) + marginY,
      fontSize: labelFormatConfig.productNameFontSize || 50,
      show: true,
    },
    speciesLegend: {
      x: (labelFormatConfig.speciesLegendX ?? 520) + marginX,
      y: (labelFormatConfig.speciesLegendY ?? 75) + marginY,
      fontSize: labelFormatConfig.speciesLegendFontSize || 30,
      style: labelFormatConfig.speciesLegendStyle || 'badge',
      show: labelFormatConfig.showSpeciesLegend !== false && Boolean((speciesLegend ?? product?.speciesLegend ?? labelFormatConfig.speciesLegendText ?? '%100 CERDO').trim()),
      text: (speciesLegend ?? product?.speciesLegend ?? labelFormatConfig.speciesLegendText ?? '%100 CERDO').trim(),
    },
    details: {
      x: (labelFormatConfig.detailsX ?? 30) + marginX,
      y: (labelFormatConfig.detailsY ?? 135) + marginY,
      fontSize: labelFormatConfig.detailsFontSize || 34,
      show: true,
    },
    lot: {
      x: (labelFormatConfig.lotX ?? 30) + marginX,
      y: (labelFormatConfig.lotY ?? 180) + marginY,
      fontSize: labelFormatConfig.lotFontSize || 38,
      show: labelFormatConfig.showLot !== false,
    },
    weight: {
      x: (labelFormatConfig.weightX ?? 400) + marginX,
      y: (labelFormatConfig.weightY ?? 180) + marginY,
      fontSize: labelFormatConfig.weightFontSize || 44,
      show: labelFormatConfig.showWeight !== false,
    },
    expiration: {
      x: (labelFormatConfig.expirationX ?? 30) + marginX,
      y: (labelFormatConfig.expirationY ?? 235) + marginY,
      fontSize: labelFormatConfig.expirationFontSize || 36,
      show: labelFormatConfig.showExpirationDate !== false,
    },
    temperature: {
      x: (labelFormatConfig.temperatureX ?? 30) + marginX,
      y: (labelFormatConfig.temperatureY ?? 240) + marginY,
      fontSize: labelFormatConfig.temperatureFontSize || 20,
      show: labelFormatConfig.showTemperature !== false && Boolean((labelFormatConfig.temperatureText || 'MANTENER CONGELADO A -18°C').trim()),
    },
    address: {
      x: (labelFormatConfig.addressX ?? 30) + marginX,
      y: (labelFormatConfig.addressY ?? 270) + marginY,
      fontSize: labelFormatConfig.addressFontSize || 22,
      show: labelFormatConfig.showAddress !== false && Boolean((domicilio || labelFormatConfig.addressText || 'DOMICILIO: PLANTA MATRIZ').trim()),
    },
    barcode: {
      x: (labelFormatConfig.barcodePositionX ?? 30) + marginX,
      y: (labelFormatConfig.barcodePositionY ?? 295) + marginY,
      widthDots: qrDots,
      heightDots: qrDots,
      show: true,
    },
    footer: {
      x: (labelFormatConfig.footerX ?? 30) + marginX,
      y: (labelFormatConfig.footerY ?? 440) + marginY,
      fontSize: labelFormatConfig.footerFontSize || 24,
      show: true,
    },
  };

  // Convert dots position to CSS percentage
  const getStyleForDots = (xDots: number, yDots: number, fontSizeDots?: number) => {
    const leftPct = (xDots / totalWidthDots) * 100;
    const topPct = (yDots / totalHeightDots) * 100;

    // Convert font size in dots to responsive font size in cqw (container query width)
    // In a container of totalWidthDots, 1 dot = (100 / totalWidthDots) cqw
    const fontSizeCqw = fontSizeDots ? (fontSizeDots / totalWidthDots) * 100 : undefined;

    return {
      position: 'absolute' as const,
      left: `${leftPct}%`,
      top: `${topPct}%`,
      fontSize: fontSizeCqw ? `${fontSizeCqw}cqw` : undefined,
      lineHeight: 1,
    };
  };

  // Drag handlers
  const handleMouseDown = (key: string, e: React.MouseEvent) => {
    if (!interactiveDrag) return;
    e.stopPropagation();
    setIsDragging(key);
    if (onSelectElement) onSelectElement(key);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickXInDots = ((e.clientX - rect.left) / rect.width) * totalWidthDots;
      const clickYInDots = ((e.clientY - rect.top) / rect.height) * totalHeightDots;

      const currentElem = (elemPositions as any)[key];
      setDragOffset({
        x: clickXInDots - currentElem.x,
        y: clickYInDots - currentElem.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const moveCallback = onElementPositionChange || onElementMove;
    if (!isDragging || !containerRef.current || !moveCallback) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseXInDots = ((e.clientX - rect.left) / rect.width) * totalWidthDots;
    const mouseYInDots = ((e.clientY - rect.top) / rect.height) * totalHeightDots;

    const rawX = Math.round(mouseXInDots - dragOffset.x - marginX);
    const rawY = Math.round(mouseYInDots - dragOffset.y - marginY);

    const clampedX = Math.max(0, Math.min(totalWidthDots - marginX, rawX));
    const clampedY = Math.max(0, Math.min(totalHeightDots - marginY, rawY));

    moveCallback(isDragging, clampedX, clampedY);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    const upHandler = () => setIsDragging(null);
    window.addEventListener('mouseup', upHandler);
    return () => window.removeEventListener('mouseup', upHandler);
  }, []);

  const dateFormatted = timestamp
    ? new Date(timestamp).toLocaleDateString('es-ES')
    : new Date().toLocaleDateString('es-ES');

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      translate="no"
      className={`printable-label-area notranslate relative bg-white border-2 border-black shadow-md font-mono text-black overflow-hidden select-none transition-all ${
        interactiveDrag ? 'cursor-default' : ''
      }`}
      style={{
        aspectRatio: `${widthInches} / ${heightInches}`,
        containerType: 'inline-size',
        width: '100%',
        maxWidth: '480px',
      }}
    >
      {/* Background Grid Lines when in interactive edit mode */}
      {interactiveDrag && (
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:12px_12px]" />
      )}

      {/* 1. Header / Company Name */}
      {elemPositions.header.show && (
        <div
          onMouseDown={(e) => handleMouseDown('header', e)}
          onClick={() => onSelectElement && onSelectElement('header')}
          style={{
            ...getStyleForDots(
              elemPositions.header.x,
              elemPositions.header.y,
              elemPositions.header.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.headerFont),
          }}
          className={`font-black uppercase tracking-tight whitespace-nowrap cursor-grab active:cursor-grabbing ${
            selectedElementKey === 'header' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
        >
          {labelFormatConfig.companyHeader || 'YOREME CORTE Y PROCESOS'}
        </div>
      )}

      {/* 1.2 Línea Divisoria Horizontal (Configurable y Movible) */}
      {(elemPositions.dividerLine.show || selectedElementKey === 'dividerLine') && (
        <div
          onMouseDown={(e) => handleMouseDown('dividerLine', e)}
          onClick={() => onSelectElement && onSelectElement('dividerLine')}
          style={{
            position: 'absolute',
            left: `${(elemPositions.dividerLine.x / totalWidthDots) * 100}%`,
            top: `${(elemPositions.dividerLine.y / totalHeightDots) * 100}%`,
            width: `${Math.max(3, (elemPositions.dividerLine.width / totalWidthDots) * 100)}%`,
            height: `${Math.max(1, (elemPositions.dividerLine.thickness / totalHeightDots) * 100)}%`,
            minHeight: `${elemPositions.dividerLine.thickness}px`,
            backgroundColor: '#000000',
          }}
          className={`cursor-grab active:cursor-grabbing select-none transition-all ${
            selectedElementKey === 'dividerLine' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-400 z-20 shadow-sm'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
          title="Línea divisoria horizontal (Haz clic o arrastra para mover)"
        />
      )}

      {/* 1.5 Logo de Empresa en Etiqueta */}
      {(elemPositions.logo.show || selectedElementKey === 'logo') && (
        <div
          onMouseDown={(e) => handleMouseDown('logo', e)}
          onClick={() => onSelectElement && onSelectElement('logo')}
          style={{
            position: 'absolute',
            left: `${(elemPositions.logo.x / totalWidthDots) * 100}%`,
            top: `${(elemPositions.logo.y / totalHeightDots) * 100}%`,
            width: `${(elemPositions.logo.width / totalWidthDots) * 100}%`,
            height: `${(elemPositions.logo.height / totalHeightDots) * 100}%`,
          }}
          className={`cursor-grab active:cursor-grabbing select-none flex items-center justify-center p-0.5 transition-all ${
            selectedElementKey === 'logo' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-100/90 z-20 border-2 border-dashed border-amber-600 shadow-md'
              : elemPositions.logo.url
              ? 'hover:outline-1 hover:outline-dashed hover:outline-amber-500 z-10'
              : 'border-2 border-dashed border-gray-400 bg-gray-100/80 z-10'
          }`}
          title="Logo de Empresa (Haz clic o arrastra para mover en la etiqueta)"
        >
          {elemPositions.logo.url ? (
            <img
              src={elemPositions.logo.url}
              alt="Logo Empresa"
              className="max-h-full max-w-full object-contain pointer-events-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[10px] font-bold text-gray-700 font-mono text-center leading-tight pointer-events-none p-1">
              <span className="text-sm">📷</span>
              <span className="text-[9px] font-black uppercase text-[#141414]">[ ZONA DE LOGO ]</span>
              <span className="text-[8px] text-amber-700">Arrastra para posicionar</span>
            </div>
          )}
        </div>
      )}

      {/* 2. Product Name */}
      <div
        onMouseDown={(e) => handleMouseDown('productName', e)}
        onClick={() => onSelectElement && onSelectElement('productName')}
        style={{
          ...getStyleForDots(
            elemPositions.productName.x,
            elemPositions.productName.y,
            elemPositions.productName.fontSize
          ),
          ...getZebraFontCss(labelFormatConfig.productNameFont),
        }}
        className={`font-black uppercase leading-none tracking-tight cursor-grab active:cursor-grabbing ${
          selectedElementKey === 'productName' && interactiveDrag
            ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
            : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
        }`}
      >
        {product.name}
      </div>

      {/* 2.5 Leyenda de Especie / Identificador */}
      {elemPositions.speciesLegend.show && (
        <div
          onMouseDown={(e) => handleMouseDown('speciesLegend', e)}
          onClick={() => onSelectElement && onSelectElement('speciesLegend')}
          style={{
            ...getStyleForDots(
              elemPositions.speciesLegend.x,
              elemPositions.speciesLegend.y,
              elemPositions.speciesLegend.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.speciesLegendFont),
            ...(elemPositions.speciesLegend.style === 'badge'
              ? { backgroundColor: '#000000', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }
              : {}),
          }}
          className={`font-black whitespace-nowrap cursor-grab active:cursor-grabbing uppercase tracking-wide select-none ${
            elemPositions.speciesLegend.style === 'badge'
              ? 'bg-black text-white px-1.5 py-0.5 -mx-1.5 -my-0.5 border border-black'
              : elemPositions.speciesLegend.style === 'border'
              ? 'border-2 border-black px-1.5 py-0.5 -mx-1.5 -my-0.5 text-black bg-white/90'
              : 'text-black'
          } ${
            selectedElementKey === 'speciesLegend' && interactiveDrag
              ? 'ring-2 ring-amber-500 z-20 shadow-md'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
          title={`Leyenda de Especie: ${elemPositions.speciesLegend.text}`}
        >
          {elemPositions.speciesLegend.text}
        </div>
      )}

      {/* 3. Details (Code, Category, Warehouse) */}
      <div
        onMouseDown={(e) => handleMouseDown('details', e)}
        onClick={() => onSelectElement && onSelectElement('details')}
        style={{
          ...getStyleForDots(
            elemPositions.details.x,
            elemPositions.details.y,
            elemPositions.details.fontSize
          ),
          ...getZebraFontCss(labelFormatConfig.detailsFont),
        }}
        className={`font-bold flex items-center gap-1 whitespace-nowrap cursor-grab active:cursor-grabbing ${
          selectedElementKey === 'details' && interactiveDrag
            ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
            : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
        }`}
      >
        <span>COD: <strong>{product.code}</strong></span>
        {labelFormatConfig.showCategory && <span>| {product.category}</span>}
        {labelFormatConfig.showWarehouseBadge && (
          <span
            style={{ backgroundColor: '#000000', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            className="bg-black text-white px-1 py-0.2 text-[0.8em] uppercase font-bold"
          >
            {warehouse || product.warehouse || 'Congelado'}
          </span>
        )}
        {conditionFlag && (
          <span className="font-mono font-black text-[0.85em] text-[#141414] px-0.5">
            [{conditionFlag}]
          </span>
        )}
      </div>

      {/* 4. Lot */}
      {elemPositions.lot.show && (
        <div
          onMouseDown={(e) => handleMouseDown('lot', e)}
          onClick={() => onSelectElement && onSelectElement('lot')}
          style={{
            ...getStyleForDots(
              elemPositions.lot.x,
              elemPositions.lot.y,
              elemPositions.lot.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.lotFont),
          }}
          className={`font-bold whitespace-nowrap cursor-grab active:cursor-grabbing ${
            selectedElementKey === 'lot' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
        >
          LOTE: {lot || 'LOT-2026-DEMO'}
        </div>
      )}

      {/* 5. Weight */}
      {elemPositions.weight.show && (
        <div
          onMouseDown={(e) => handleMouseDown('weight', e)}
          onClick={() => onSelectElement && onSelectElement('weight')}
          style={{
            ...getStyleForDots(
              elemPositions.weight.x,
              elemPositions.weight.y,
              elemPositions.weight.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.weightFont),
            ...(labelFormatConfig.weightBoxStyle === 'highlight'
              ? { backgroundColor: '#000000', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }
              : {}),
          }}
          className={`font-black whitespace-nowrap cursor-grab active:cursor-grabbing ${
            labelFormatConfig.weightBoxStyle === 'highlight'
              ? 'bg-black text-white px-1.5 py-0.5 -mx-1.5 -my-0.5 border border-black'
              : labelFormatConfig.weightBoxStyle === 'border'
              ? 'border-2 border-black px-1.5 py-0.5 -mx-1.5 -my-0.5 text-black'
              : 'text-black'
          } ${
            selectedElementKey === 'weight' && interactiveDrag
              ? 'ring-2 ring-amber-500 z-20'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
        >
          PESO: {typeof weight === 'number' && !isNaN(weight) ? weight.toFixed(2) : '0.00'} {unit || product.unit || 'KG'}
        </div>
      )}

      {/* 6. Expiration Date */}
      {elemPositions.expiration.show && (
        <div
          onMouseDown={(e) => handleMouseDown('expiration', e)}
          onClick={() => onSelectElement && onSelectElement('expiration')}
          style={{
            ...getStyleForDots(
              elemPositions.expiration.x,
              elemPositions.expiration.y,
              elemPositions.expiration.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.expirationFont),
          }}
          className={`font-bold whitespace-nowrap cursor-grab active:cursor-grabbing ${
            selectedElementKey === 'expiration' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
        >
          F. CADUCIDAD: {expirationDate || '2026-12-31'}
        </div>
      )}

      {/* 6.5 Temperatura de Conservación */}
      {elemPositions.temperature.show && (
        <div
          onMouseDown={(e) => handleMouseDown('temperature', e)}
          onClick={() => onSelectElement && onSelectElement('temperature')}
          style={{
            ...getStyleForDots(
              elemPositions.temperature.x,
              elemPositions.temperature.y,
              elemPositions.temperature.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.temperatureFont),
          }}
          className={`font-black uppercase tracking-tight whitespace-nowrap cursor-grab active:cursor-grabbing text-black ${
            selectedElementKey === 'temperature' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
          title={labelFormatConfig.temperatureText || 'MANTENER CONGELADO A -18°C'}
        >
          {labelFormatConfig.temperatureText || 'MANTENER CONGELADO A -18°C'}
        </div>
      )}

      {/* 6.6 Domicilio / Dirección */}
      {elemPositions.address.show && (
        <div
          onMouseDown={(e) => handleMouseDown('address', e)}
          onClick={() => onSelectElement && onSelectElement('address')}
          style={{
            ...getStyleForDots(
              elemPositions.address.x,
              elemPositions.address.y,
              elemPositions.address.fontSize
            ),
            ...getZebraFontCss(labelFormatConfig.addressFont),
          }}
          className={`font-bold leading-tight max-w-[90%] break-words cursor-grab active:cursor-grabbing text-[#141414] ${
            selectedElementKey === 'address' && interactiveDrag
              ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
              : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
          }`}
          title={domicilio || labelFormatConfig.addressText || 'DOMICILIO'}
        >
          {domicilio || labelFormatConfig.addressText || 'DOMICILIO: CARRETERA INTERNACIONAL KM 12.5'}
        </div>
      )}

      {/* 7. Barcode / QR Code */}
      <div
        onMouseDown={(e) => handleMouseDown('barcode', e)}
        onClick={() => onSelectElement && onSelectElement('barcode')}
        style={{
          position: 'absolute',
          left: `${(elemPositions.barcode.x / totalWidthDots) * 100}%`,
          top: `${(elemPositions.barcode.y / totalHeightDots) * 100}%`,
          width: `${(elemPositions.barcode.widthDots / totalWidthDots) * 100}%`,
          height: `${(elemPositions.barcode.heightDots / totalHeightDots) * 100}%`,
        }}
        className={`cursor-grab active:cursor-grabbing select-none ${
          selectedElementKey === 'barcode' && interactiveDrag
            ? 'ring-2 ring-amber-500 bg-amber-50/50 z-20'
            : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
        }`}
        title="Código QR (Haz clic o arrastra para mover)"
      >
        <BarcodeRenderer
          value={generateCompactBarcodePayload({
            productCode: product.code,
            lot: lot || 'LOT-2026',
            weight: weight || 25,
            expirationDate,
            id: labelId,
          })}
          type="QRCode"
          displayValue={false}
          className="w-full h-full"
        />
      </div>

      {/* 7.1 Folio Text below QR Code */}
      {labelFormatConfig.showBarcodeText !== false && (
        <div
          style={{
            position: 'absolute',
            left: `${(elemPositions.barcode.x / totalWidthDots) * 100}%`,
            top: `${((elemPositions.barcode.y + elemPositions.barcode.heightDots + 6) / totalHeightDots) * 100}%`,
            fontSize: `${(20 / totalWidthDots) * 100}cqw`,
            lineHeight: 1,
            ...getZebraFontCss(labelFormatConfig.detailsFont),
          }}
          className="font-mono font-bold text-black uppercase tracking-tight whitespace-nowrap select-none"
        >
          FOLIO: {labelId}
        </div>
      )}

      {/* 8. Footer */}
      <div
        onMouseDown={(e) => handleMouseDown('footer', e)}
        onClick={() => onSelectElement && onSelectElement('footer')}
        style={{
          position: 'absolute',
          left: `${(elemPositions.footer.x / totalWidthDots) * 100}%`,
          top: `${(elemPositions.footer.y / totalHeightDots) * 100}%`,
          width: `${((totalWidthDots - elemPositions.footer.x - marginX) / totalWidthDots) * 100}%`,
        }}
        className={`cursor-grab active:cursor-grabbing select-none ${
          selectedElementKey === 'footer' && interactiveDrag
            ? 'ring-2 ring-amber-500 bg-amber-50/80 z-20'
            : 'hover:outline-1 hover:outline-dashed hover:outline-amber-500'
        }`}
      >
        {/* Divider line in footer */}
        <div
          style={{
            width: '100%',
            height: '2px',
            backgroundColor: '#000000',
          }}
        />
        {/* Timestamp & ID line */}
        {labelFormatConfig.showPrintTimestamp !== false && (
          <div
            style={{
              paddingTop: `${(8 / totalHeightDots) * 100}%`,
              fontSize: `${(elemPositions.footer.fontSize / totalWidthDots) * 100}cqw`,
              lineHeight: 1,
              ...getZebraFontCss(labelFormatConfig.footerFont),
            }}
            className="font-bold whitespace-nowrap truncate"
          >
            IMP: {dateFormatted}{labelFormatConfig.showFooterId !== false && ` | ${labelId}`}
          </div>
        )}
        {/* Custom footer line */}
        <div
          style={{
            paddingTop: `${(4 / totalHeightDots) * 100}%`,
            fontSize: `${(Math.max(14, Math.round(elemPositions.footer.fontSize * 0.75)) / totalWidthDots) * 100}cqw`,
            lineHeight: 1,
            ...getZebraFontCss(labelFormatConfig.footerFont),
          }}
          className="uppercase font-bold truncate opacity-90"
        >
          {labelFormatConfig.customFooterText || 'SISTEMA ZPL CONTROL DE INVENTARIO'}
        </div>
      </div>
    </div>
  );
};
