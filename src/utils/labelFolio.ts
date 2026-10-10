import { PrintedLabel } from '../types';

/**
 * Calculates the next unique sequential folio for a box label.
 * Format: LBL-{number} (e.g. LBL-73613, LBL-73614)
 * Ensures every single physical box has a distinct, unique control number for traceability.
 */
export function getNextLabelFolio(
  existingLabels: PrintedLabel[] = [],
  currentCandidate?: string
): string {
  // Baseline starts above 73612 from recent printing
  let maxFolio = 73612;

  // 1. If a candidate was provided (e.g. currentFolioId in state), make sure next is at least candidate + 1
  if (currentCandidate && typeof currentCandidate === 'string') {
    const match = currentCandidate.match(/^LBL-?(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxFolio) {
        maxFolio = num;
      }
    }
  }

  // 2. Check localStorage for the last registered folio in this station
  if (typeof window !== 'undefined') {
    try {
      const savedLast = localStorage.getItem('last_label_folio');
      if (savedLast) {
        const match = savedLast.match(/^LBL-?(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxFolio) {
            maxFolio = num;
          }
        }
      }
    } catch (e) {}
  }

  // 3. Check all existing registered labels in inventory
  if (Array.isArray(existingLabels)) {
    for (const label of existingLabels) {
      if (label && typeof label.id === 'string') {
        const match = label.id.match(/^LBL-?(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxFolio) {
            maxFolio = num;
          }
        }
      }
    }
  }

  const nextNumber = maxFolio + 1;
  return `LBL-${nextNumber}`;
}

/**
 * Saves a manual starting or override folio in localStorage for this weighing/printing station.
 */
export function setStationFolio(newFolio: string | number): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanStr = String(newFolio).trim().toUpperCase();
    const match = cleanStr.match(/^LBL-?(\d+)$/i);
    const formatted = match ? `LBL-${match[1]}` : (/^\d+$/.test(cleanStr) ? `LBL-${cleanStr}` : cleanStr);
    localStorage.setItem('last_label_folio', formatted);
  } catch (e) {}
}
