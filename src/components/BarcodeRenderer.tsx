import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { BarcodeType } from '../types';

interface BarcodeRendererProps {
  value: string;
  type?: BarcodeType;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  type = 'QRCode',
  width = 1.8,
  height = 45,
  fontSize = 12,
  displayValue = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qrSvgData, setQrSvgData] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    if (type === 'QRCode') {
      QRCode.toString(value, { type: 'svg', margin: 0, color: { dark: '#000000', light: '#ffffff' } })
        .then((svgString) => {
          setQrSvgData(svgString);
        })
        .catch((err) => {
          console.error('Error generating QR SVG:', err);
        });
    } else if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: (type as string) === 'EAN13' ? 'EAN13' : 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: 2,
          lineColor: '#000000',
          background: '#ffffff',
          fontOptions: 'bold',
          textMargin: 2,
        });
      } catch (err) {
        console.warn('JsBarcode fallback to CODE128:', err);
        try {
          JsBarcode(svgRef.current, value, {
            format: 'CODE128',
            width: width,
            height: height,
            displayValue: displayValue,
            fontSize: fontSize,
            margin: 2,
            lineColor: '#000000',
            background: '#ffffff',
            fontOptions: 'bold',
          });
        } catch (e) {
          console.error('Barcode render fatal error:', e);
        }
      }
    }
  }, [value, type, width, height, fontSize, displayValue]);

  if (!value) return null;

  if (type === 'QRCode') {
    return (
      <div
        className={`flex flex-col items-center justify-center w-full h-full ${className}`}
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {qrSvgData ? (
          <div
            className="w-full h-full max-w-full [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: qrSvgData }}
          />
        ) : (
          <div className="w-full h-full bg-black text-white text-[9px] flex items-center justify-center font-bold">
            QR CODE
          </div>
        )}
        {displayValue && (
          <span className="text-[9px] font-mono font-bold text-black uppercase tracking-tight mt-0.5 max-w-full truncate">
            {value}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};
