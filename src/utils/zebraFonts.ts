import React from 'react';
import { ZebraFontId, ZebraFontOption } from '../types';

export const ZEBRA_FONTS: ZebraFontOption[] = [
  {
    id: '0',
    code: '0',
    name: 'Font 0: Zebra Sans-Serif (Escalable)',
    familyDescription: 'Fuente estándar proporcional y escalable de Zebra. La más clara y versátil.',
    zplCode: '^A0',
    cssFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    cssWeight: '700',
    cssLetterSpacing: 'normal',
    sampleText: 'ZEBRA 0 SANS',
  },
  {
    id: 'GS',
    code: 'GS',
    name: 'Font GS: Swiss 721 (Helvetica)',
    familyDescription: 'TrueType de alta definición geométrica, apariencia moderna y corporativa.',
    zplCode: '^AGS',
    cssFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    cssWeight: '800',
    cssLetterSpacing: '-0.01em',
    sampleText: 'SWISS 721 HD',
  },
  {
    id: 'D',
    code: 'D',
    name: 'Font D: Matriz Mediana (18x10)',
    familyDescription: 'Matriz industrial nítida, ideal para destacar lotes, números y fechas.',
    zplCode: '^AD',
    cssFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", monospace',
    cssWeight: '700',
    cssLetterSpacing: '0.04em',
    sampleText: 'LOT: 2026-MED',
  },
  {
    id: 'E',
    code: 'E',
    name: 'Font E: Zebra OCR-B (Óptica)',
    familyDescription: 'Tipografía OCR-B estándar internacional, óptima para lectura humana y lectores ópticos.',
    zplCode: '^AE',
    cssFamily: '"OCR-B", "OCR B Std", "Courier New", monospace',
    cssWeight: '700',
    cssLetterSpacing: '0.08em',
    sampleText: 'OCR-B 987654',
  },
  {
    id: 'H',
    code: 'H',
    name: 'Font H: Zebra OCR-A (Industrial)',
    familyDescription: 'Tipografía OCR-A bancaria e industrial de alta precisión y seguridad.',
    zplCode: '^AH',
    cssFamily: '"OCR-A", "OCR A Std", "Courier New", monospace',
    cssWeight: '700',
    cssLetterSpacing: '0.06em',
    sampleText: 'OCR-A 450123',
  },
  {
    id: 'F',
    code: 'F',
    name: 'Font F: Matriz Condensada (26x13)',
    familyDescription: 'Matriz alta condensada verticalmente, excelente para descripciones largas o cortes complejos.',
    zplCode: '^AF',
    cssFamily: 'Impact, "Arial Narrow", "Arial Black", sans-serif',
    cssWeight: '900',
    cssLetterSpacing: '-0.02em',
    sampleText: 'CORTE CONDENSADO',
  },
  {
    id: 'G',
    code: 'G',
    name: 'Font G: Matriz Pesada Negrita (60x40)',
    familyDescription: 'Matriz gigante de máximo impacto visual, recomendada para pesos o encabezados.',
    zplCode: '^AG',
    cssFamily: 'Impact, "Trebuchet MS", "Arial Black", sans-serif',
    cssWeight: '900',
    cssLetterSpacing: '0.02em',
    sampleText: 'PESO 60X40',
  },
  {
    id: 'B',
    code: 'B',
    name: 'Font B: Matriz Pequeña (11x7)',
    familyDescription: 'Matriz industrial clásica compacta para datos secundarios y leyendas.',
    zplCode: '^AB',
    cssFamily: '"Lucida Console", Monaco, monospace',
    cssWeight: '600',
    cssLetterSpacing: '0.05em',
    sampleText: 'MATRIZ 11X7',
  },
  {
    id: 'A',
    code: 'A',
    name: 'Font A: Micro Matriz (9x5)',
    familyDescription: 'Matriz ultracompacta para etiquetas de alta densidad o texto legal.',
    zplCode: '^AA',
    cssFamily: 'monospace',
    cssWeight: '600',
    cssLetterSpacing: '0.1em',
    sampleText: 'MICRO 9X5',
  },
];

export function getZebraFontOption(id?: string): ZebraFontOption {
  const found = ZEBRA_FONTS.find((f) => f.id === id);
  return found || ZEBRA_FONTS[0];
}

export function getZebraFontCss(id?: string): React.CSSProperties {
  const font = getZebraFontOption(id);
  return {
    fontFamily: font.cssFamily,
    fontWeight: font.cssWeight as any,
    letterSpacing: font.cssLetterSpacing,
  };
}

export function getZplFontCommand(
  fontId: string | undefined,
  orientation: string = 'N',
  heightDots: number,
  widthDots?: number
): string {
  const font = getZebraFontOption(fontId);
  const w = widthDots ?? Math.round(heightDots * 0.88);
  return `^A${font.id}${orientation},${heightDots},${w}`;
}
