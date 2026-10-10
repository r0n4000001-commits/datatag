import type { CSSProperties } from 'react';
import { SpeciesItem, Product } from '../types';

export interface SpeciesColorOption {
  id: string;
  name: string;
  className: string;
  previewColor: string;
}

export const SPECIES_COLOR_PRESETS: SpeciesColorOption[] = [
  {
    id: 'rose-pork',
    name: 'Rosa Porcino',
    className: 'bg-rose-100 text-rose-900 border-rose-400',
    previewColor: '#F43F5E',
  },
  {
    id: 'red-beef',
    name: 'Rojo Bovino / Res',
    className: 'bg-red-100 text-red-900 border-red-400',
    previewColor: '#DC2626',
  },
  {
    id: 'amber-poultry',
    name: 'Ámbar Pollo / Aves',
    className: 'bg-amber-100 text-amber-900 border-amber-400',
    previewColor: '#D97706',
  },
  {
    id: 'orange-turkey',
    name: 'Naranja Pavo',
    className: 'bg-orange-100 text-orange-900 border-orange-400',
    previewColor: '#EA580C',
  },
  {
    id: 'yellow-dairy',
    name: 'Amarillo Lácteos',
    className: 'bg-yellow-100 text-yellow-900 border-yellow-400',
    previewColor: '#CA8A04',
  },
  {
    id: 'emerald-veggie',
    name: 'Verde Vegetal / Insumo',
    className: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    previewColor: '#059669',
  },
  {
    id: 'blue-seafood',
    name: 'Azul Pescado / Mariscos',
    className: 'bg-blue-100 text-blue-900 border-blue-400',
    previewColor: '#2563EB',
  },
  {
    id: 'purple-sheep',
    name: 'Púrpura Ovino / Caprino',
    className: 'bg-purple-100 text-purple-900 border-purple-400',
    previewColor: '#7C3AED',
  },
  {
    id: 'teal-premium',
    name: 'Turquesa Especial',
    className: 'bg-teal-100 text-teal-900 border-teal-400',
    previewColor: '#0D9488',
  },
  {
    id: 'stone-neutral',
    name: 'Gris / Neutro',
    className: 'bg-stone-100 text-stone-900 border-stone-400',
    previewColor: '#57534E',
  },
];

export const PRESET_ORIGINS: string[] = [
  'Nacional (México - TIF)',
  'Importado (EUA - USDA)',
  'Importado (Canadá - CFIA)',
  'Nacional (Granja Local)',
  'Importado (Chile / SAG)',
  'Importado (Australia / DAFF)',
  'Inspección Federal TIF',
  'Mixto / Nacional e Importado',
];

export function generateNextSpeciesCode(existingCodes: string[]): string {
  const nums = existingCodes
    .map((c) => {
      const match = c.match(/ESP-(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);

  const maxNum = nums.length > 0 ? Math.max(...nums) : existingCodes.length;
  const nextNum = maxNum + 1;
  return `ESP-${String(nextNum).padStart(2, '0')}`;
}

export function formatSpeciesLegend(input: string): string {
  const clean = input.trim().toUpperCase();
  if (!clean) return '%100';
  if (clean.startsWith('%')) return clean;
  if (clean.startsWith('100%') || clean.startsWith('100 %')) {
    return `%100 ${clean.replace(/^100\s*%\s*/i, '').trim()}`;
  }
  return `%100 ${clean}`;
}

export function getSpeciesBadgeClass(badgeColor?: string): string {
  if (!badgeColor) return 'bg-stone-100 text-stone-800 border-stone-300';
  if (badgeColor.startsWith('#') || badgeColor.startsWith('custom:')) {
    return 'border';
  }
  return badgeColor;
}

export function getSpeciesBadgeStyle(badgeColor?: string): CSSProperties {
  if (!badgeColor) return {};
  if (badgeColor.startsWith('#') || badgeColor.startsWith('custom:')) {
    const hex = badgeColor.replace('custom:', '').trim();
    return {
      backgroundColor: `${hex}20`,
      color: hex,
      borderColor: `${hex}60`,
    };
  }
  return {};
}

/**
 * Infiere o resuelve la leyenda de especie (%100 CERDO, %100 RES, %100 POLLO, etc.)
 * a partir de la configuración directa del producto, de su categoría o de su nombre.
 */
export function inferProductSpeciesLegend(
  product?: Partial<Product> | null,
  speciesList?: SpeciesItem[]
): string {
  if (!product) return '%100 CERDO';

  // 1. Si ya tiene especie configurada explícitamente y no está vacía, usarla
  if (product.speciesLegend && product.speciesLegend.trim()) {
    return product.speciesLegend.trim().toUpperCase();
  }

  const nameLower = (product.name || '').toLowerCase();
  const catLower = (product.category || '').toLowerCase();

  // 2. Intentar vincular con el catálogo de especies existente
  if (speciesList && speciesList.length > 0) {
    for (const sp of speciesList) {
      const spName = sp.name.toLowerCase();
      const spLegendRaw = sp.legend.replace(/^%\s*100\s*/i, '').trim().toLowerCase();
      if (spLegendRaw && (nameLower.includes(spLegendRaw) || catLower.includes(spLegendRaw))) {
        return sp.legend;
      }
      if (spName && (nameLower.includes(spName) || catLower.includes(spName))) {
        return sp.legend;
      }
    }
  }

  // 3. Inferencia heurística por palabras clave cárnicas y categorías industriales
  // Res / Bovino
  if (
    nameLower.includes('res') ||
    nameLower.includes('bovino') ||
    nameLower.includes('arrachera') ||
    nameLower.includes('suadero') ||
    nameLower.includes('bisteck') ||
    nameLower.includes('bistec') ||
    nameLower.includes('sirloin') ||
    nameLower.includes('rib eye') ||
    nameLower.includes('costeña') ||
    nameLower.includes('vacio') ||
    catLower.includes('res') ||
    catLower.includes('bovino')
  ) {
    return '%100 RES';
  }

  // Pollo / Aves
  if (
    nameLower.includes('pollo') ||
    nameLower.includes('pechuga') ||
    nameLower.includes('muslo') ||
    nameLower.includes('ala') ||
    nameLower.includes('pierna con muslo') ||
    nameLower.includes('alita') ||
    catLower.includes('aves') ||
    catLower.includes('pollo')
  ) {
    return '%100 POLLO';
  }

  // Pavo
  if (nameLower.includes('pavo') || catLower.includes('pavo')) {
    return '%100 PAVO';
  }

  // Lácteos
  if (
    nameLower.includes('queso') ||
    nameLower.includes('mantequilla') ||
    nameLower.includes('leche') ||
    nameLower.includes('crema') ||
    catLower.includes('lácteo') ||
    catLower.includes('lacteo')
  ) {
    return '%100 LÁCTEO';
  }

  // Pescados / Mariscos
  if (
    nameLower.includes('pescado') ||
    nameLower.includes('marisco') ||
    nameLower.includes('camaron') ||
    nameLower.includes('camarón') ||
    nameLower.includes('filete') ||
    nameLower.includes('salmon') ||
    nameLower.includes('salmón') ||
    catLower.includes('marisco') ||
    catLower.includes('pescado')
  ) {
    return '%100 MARISCOS';
  }

  // Vegetal / Harinas / Granos
  if (
    nameLower.includes('harina') ||
    nameLower.includes('trigo') ||
    nameLower.includes('vegetal') ||
    nameLower.includes('grano') ||
    catLower.includes('grano') ||
    catLower.includes('vegetal')
  ) {
    return '%100 VEGETAL';
  }

  // Cerdo / Porcino
  if (
    nameLower.includes('cerdo') ||
    nameLower.includes('puerco') ||
    nameLower.includes('chuleta') ||
    nameLower.includes('jamon') ||
    nameLower.includes('jamón') ||
    nameLower.includes('tocino') ||
    nameLower.includes('lomo') ||
    nameLower.includes('costilla') ||
    nameLower.includes('manteca') ||
    nameLower.includes('chicharr') ||
    catLower.includes('cerdo') ||
    catLower.includes('porcino') ||
    catLower.includes('embutido')
  ) {
    return '%100 CERDO';
  }

  // Por defecto si no coincide
  return '%100 CERDO';
}

