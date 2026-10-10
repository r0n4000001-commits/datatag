import type { CSSProperties } from 'react';

export interface CategoryColorOption {
  id: string;
  name: string;
  className: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  previewColor: string;
  tagGroup: string;
}

export const CATEGORY_COLOR_PRESETS: CategoryColorOption[] = [
  {
    id: 'red',
    name: 'Rojo Carmesí',
    className: 'bg-red-100 text-red-900 border-red-400',
    bgHex: '#FEE2E2',
    borderHex: '#F87171',
    textHex: '#7F1D1D',
    previewColor: '#DC2626',
    tagGroup: 'Carnes / Res / Cerdo',
  },
  {
    id: 'amber',
    name: 'Ámbar Dorado',
    className: 'bg-amber-100 text-amber-900 border-amber-400',
    bgHex: '#FEF3C7',
    borderHex: '#FBBF24',
    textHex: '#78350F',
    previewColor: '#D97706',
    tagGroup: 'Aves / Pollo / Pavo',
  },
  {
    id: 'yellow',
    name: 'Amarillo Brillante',
    className: 'bg-yellow-100 text-yellow-900 border-yellow-400',
    bgHex: '#FEF9C3',
    borderHex: '#FACC15',
    textHex: '#713F12',
    previewColor: '#CA8A04',
    tagGroup: 'Lácteos / Quesos',
  },
  {
    id: 'orange',
    name: 'Naranja Intenso',
    className: 'bg-orange-100 text-orange-900 border-orange-400',
    bgHex: '#FFEDD5',
    borderHex: '#FB923C',
    textHex: '#7C2D12',
    previewColor: '#EA580C',
    tagGroup: 'Embutidos / Jamones',
  },
  {
    id: 'blue',
    name: 'Azul Océano',
    className: 'bg-blue-100 text-blue-900 border-blue-400',
    bgHex: '#DBEAFE',
    borderHex: '#60A5FA',
    textHex: '#1E3A8A',
    previewColor: '#2563EB',
    tagGroup: 'Mariscos y Pescados',
  },
  {
    id: 'cyan',
    name: 'Cian Glaciar',
    className: 'bg-cyan-100 text-cyan-900 border-cyan-400',
    bgHex: '#CFFAFE',
    borderHex: '#22D3EE',
    textHex: '#164E63',
    previewColor: '#0891B2',
    tagGroup: 'Congelados Especiales',
  },
  {
    id: 'emerald',
    name: 'Verde Esmeralda',
    className: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    bgHex: '#D1FAE5',
    borderHex: '#34D399',
    textHex: '#064E3B',
    previewColor: '#059669',
    tagGroup: 'Empaques e Insumos',
  },
  {
    id: 'green',
    name: 'Verde Botánico',
    className: 'bg-green-100 text-green-900 border-green-400',
    bgHex: '#DCFCE7',
    borderHex: '#4ADE80',
    textHex: '#14532D',
    previewColor: '#16A34A',
    tagGroup: 'Vegetales / Frescos',
  },
  {
    id: 'lime',
    name: 'Verde Lima',
    className: 'bg-lime-100 text-lime-900 border-lime-400',
    bgHex: '#ECFCCB',
    borderHex: '#A3E635',
    textHex: '#365314',
    previewColor: '#65A30D',
    tagGroup: 'Cítricos / Saborizantes',
  },
  {
    id: 'rose',
    name: 'Rosa / Menudencias',
    className: 'bg-rose-100 text-rose-900 border-rose-400',
    bgHex: '#FFE4E6',
    borderHex: '#FB7185',
    textHex: '#881337',
    previewColor: '#E11D48',
    tagGroup: 'Vísceras y Menudencias',
  },
  {
    id: 'purple',
    name: 'Púrpura Real',
    className: 'bg-purple-100 text-purple-900 border-purple-400',
    bgHex: '#F3E8FF',
    borderHex: '#C084FC',
    textHex: '#581C87',
    previewColor: '#9333EA',
    tagGroup: 'Línea Gourmet / Selectos',
  },
  {
    id: 'indigo',
    name: 'Índigo Profundo',
    className: 'bg-indigo-100 text-indigo-900 border-indigo-400',
    bgHex: '#E0E7FF',
    borderHex: '#818CF8',
    textHex: '#312E81',
    previewColor: '#4F46E5',
    tagGroup: 'Procesados / Valor Agregado',
  },
  {
    id: 'teal',
    name: 'Verde Azulado / Teal',
    className: 'bg-teal-100 text-teal-900 border-teal-400',
    bgHex: '#CCFBF1',
    borderHex: '#2DD4BF',
    textHex: '#134E4A',
    previewColor: '#0D9488',
    tagGroup: 'Químicos y Limpieza',
  },
  {
    id: 'pink',
    name: 'Fucsia / Rosa Brillante',
    className: 'bg-pink-100 text-pink-900 border-pink-400',
    bgHex: '#FCE7F3',
    borderHex: '#F472B6',
    textHex: '#831843',
    previewColor: '#DB2777',
    tagGroup: 'Promociones / Temporada',
  },
  {
    id: 'stone',
    name: 'Gris Piedra / Secos',
    className: 'bg-stone-100 text-stone-900 border-stone-400',
    bgHex: '#F5F5F4',
    borderHex: '#A8A29E',
    textHex: '#1C1917',
    previewColor: '#78716C',
    tagGroup: 'Granos, Harinas e Insumos Secos',
  },
  {
    id: 'slate',
    name: 'Gris Pizarra',
    className: 'bg-slate-200 text-slate-900 border-slate-400',
    bgHex: '#E2E8F0',
    borderHex: '#94A3B8',
    textHex: '#0F172A',
    previewColor: '#475569',
    tagGroup: 'Materiales y Herramientas',
  },
  {
    id: 'dark',
    name: 'Negro Carbón / Premium',
    className: 'bg-neutral-800 text-amber-300 border-neutral-950',
    bgHex: '#262626',
    borderHex: '#0A0A0A',
    textHex: '#FCD34D',
    previewColor: '#171717',
    tagGroup: 'Línea Institucional / Exportación',
  },
];

/**
 * Normalizes a category color value (Tailwind class or hex string)
 * into a valid className or inline style representation.
 */
export function getCategoryBadgeClass(color?: string): string {
  if (!color) {
    return 'bg-stone-100 text-stone-900 border-stone-300';
  }

  // If it's a hex code (starts with # or custom: #)
  if (color.startsWith('#') || color.startsWith('custom:')) {
    return 'border';
  }

  // If it already is a tailwind string (contains bg-)
  if (color.includes('bg-')) {
    return `border ${color}`;
  }

  // Check matching preset ID
  const found = CATEGORY_COLOR_PRESETS.find((p) => p.id === color || p.className.includes(color));
  if (found) {
    return `border ${found.className}`;
  }

  return 'bg-stone-100 text-stone-900 border-stone-300 border';
}

/**
 * Returns inline CSS styles if the color is a custom hex code.
 */
export function getCategoryBadgeStyle(color?: string): CSSProperties {
  if (!color) return {};

  const cleanHex = color.startsWith('custom:') ? color.replace('custom:', '').trim() : color;

  if (cleanHex.startsWith('#')) {
    // Generate a soft background and dark text for contrast if needed
    return {
      backgroundColor: cleanHex,
      borderColor: cleanHex,
      color: '#FFFFFF',
    };
  }

  return {};
}

/**
 * Generates the next available Category Code in sequence (e.g., CAT-09, CAT-10)
 */
export function generateNextCategoryCode(existingCodes: string[]): string {
  let maxNum = 0;
  existingCodes.forEach((c) => {
    const match = c.match(/CAT-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `CAT-${nextNum < 10 ? '0' + nextNum : nextNum}`;
}
