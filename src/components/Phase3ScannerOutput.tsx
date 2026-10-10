import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { DischargeRecord, PrintedLabel, PRODUCT_CONDITIONS, MarketReservation, OrderItemSubstitution } from '../types';
import { getDailyLotCode } from '../utils/productAndLotUtils';
import { OrderDispatchVoucherModal } from './OrderDispatchVoucherModal';
import {
  Barcode,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  User,
  Search,
  Trash2,
  Plus,
  FileText,
  X,
  Send,
  Zap,
  Printer,
  Package,
  Layers,
  ArrowRight,
  ClipboardList,
  ShoppingBag,
  BookmarkPlus,
  Clock,
  Calendar,
  Truck,
  ShieldCheck,
  Sliders,
  RefreshCw,
  ArrowRightLeft,
  AlertCircle,
  Check,
} from 'lucide-react';

interface PendingDispatchItem {
  id: string; // unique item id in queue
  rawCode: string;
  matchedLabel: PrintedLabel;
  scannedAt: Date;
  isSubstitution?: boolean;
  substitutingForLabelId?: string;
  substitutingForProductName?: string;
  substitutingForWeight?: number;
  substitutingForLot?: string;
  substitutionReason?: string;
}

function formatSafeWeight(val: any, decimals = 2): string {
  const num = Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
}

function formatSafeDate(val: any): string {
  if (!val) return 'N/A';
  const d = new Date(val);
  return isNaN(d.getTime())
    ? 'N/A'
    : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatFullDateTime(val: any): string {
  if (!val) return 'N/A';
  const d = new Date(val);
  return isNaN(d.getTime())
    ? 'N/A'
    : `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export const Phase3ScannerOutput: React.FC = () => {
  const {
    labels,
    discharges,
    systemUsers,
    activeUser,
    generateNextExitFolio,
    processBatchDischarge,
    reservations,
    updateMarketReservationStatus,
    dispatchMarketReservationWithSubstitutions,
    updatePrintedLabelId,
    addPrintedLabel,
  } = useInventory();

  // Substitutions state for active order
  const [orderSubstitutions, setOrderSubstitutions] = useState<OrderItemSubstitution[]>([]);

  // Modal when barcode gun scans a box not in the active order
  const [pendingSubstitutionCandidate, setPendingSubstitutionCandidate] = useState<{
    scannedBox: PrintedLabel;
    targetOriginalLabelId: string;
    reason: string;
  } | null>(null);

  // Manual substitution picker modal when clicking "Sustituir" on a missing box
  const [manualSubstitutionTarget, setManualSubstitutionTarget] = useState<{
    originalItem: any;
    selectedReplacementId: string;
    reason: string;
    searchQuery: string;
    filterSameProductOnly: boolean;
  } | null>(null);

  // State for correcting/synchronizing physical LBL on damaged barcode cards
  const [editingLabelIdTarget, setEditingLabelIdTarget] = useState<PrintedLabel | null>(null);
  const [newFolioInput, setNewFolioInput] = useState<string>('');
  const [editFolioError, setEditFolioError] = useState<string>('');

  // Mode: 'orders' (Surtir Pedido Aprobado) | 'direct' (Salida Directa sin Pedido)
  const approvedOrders = useMemo(
    () => reservations.filter((r) => r.status === 'APROBADO'),
    [reservations]
  );

  const [dispatchMode, setDispatchMode] = useState<'orders' | 'direct'>(() => {
    return 'orders';
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedVoucherReservation, setSelectedVoucherReservation] = useState<MarketReservation | null>(null);

  // Automatically select first approved order if none selected
  useEffect(() => {
    if (dispatchMode === 'orders' && approvedOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(approvedOrders[0].id);
    }
  }, [dispatchMode, approvedOrders, selectedOrderId]);

  // Reset substitutions when changing order or dispatch mode
  useEffect(() => {
    setOrderSubstitutions([]);
  }, [selectedOrderId, dispatchMode]);

  const activeOrder = useMemo(
    () => approvedOrders.find((r) => r.id === selectedOrderId) || null,
    [approvedOrders, selectedOrderId]
  );

  // Unified Dispatch List: operator scans 1 or more boxes to review before discharging
  const [dispatchList, setDispatchList] = useState<PendingDispatchItem[]>([]);

  // Barcode Gun Input state
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Tab: 'scanner' (Pistola de Código de Barras) | 'manual' (Búsqueda Manual / Código Dañado)
  const [inputTab, setInputTab] = useState<'scanner' | 'manual'>('scanner');
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Operator & Reason
  const [scannedBy, setScannedBy] = useState(() => {
    return activeUser
      ? `${activeUser.name} (${activeUser.employeeNumber} - ${activeUser.role})`
      : 'Operador de Embarque / Lector de Código de Barras';
  });

  useEffect(() => {
    if (activeUser) {
      setScannedBy(`${activeUser.name} (${activeUser.employeeNumber} - ${activeUser.role})`);
    }
  }, [activeUser]);

  const [dischargeReason, setDischargeReason] = useState<DischargeRecord['reason']>('Despacho Producción');
  const [dischargeNotes, setDischargeNotes] = useState('');

  // Alert message for scan feedback
  const [scanNotice, setScanNotice] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
    details?: string;
  }>({ type: null, message: '' });

  // Finished Exit Voucher modal
  const [completedExitVoucher, setCompletedExitVoucher] = useState<{
    exitFolio: string;
    timestamp: string;
    operator: string;
    reason: string;
    notes?: string;
    itemsCount: number;
    totalWeight: number;
    records: DischargeRecord[];
  } | null>(null);

  // Modal for multiple copy/paste codes
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [batchPasteInput, setBatchPasteInput] = useState('');

  // Next consecutive folio preview
  const nextConsecutiveFolio = useMemo(() => {
    return generateNextExitFolio();
  }, [generateNextExitFolio, discharges]);

  // Audio Beep Generator (Web Audio API)
  const playBeepSound = useCallback((type: 'success' | 'error' | 'warning') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }, []);

  // Ensure gun input is focused
  const focusGunInput = useCallback(() => {
    if (inputTab === 'scanner' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputTab]);

  useEffect(() => {
    focusGunInput();
  }, [focusGunInput, inputTab]);

  // Global keydown listener to capture barcode gun keystrokes even if focus wandered off
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')
      ) {
        return;
      }

      if (inputTab === 'scanner' && inputRef.current && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputTab]);

  // Scan detection logic (Find matching label from raw scanned string or manual LBL code)
  const findMatchingLabel = useCallback((rawCode: string): PrintedLabel | null => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return null;

    const upperCode = cleanCode.toUpperCase();

    // F03: Reject incomplete barcode prefixes (e.g. "LBL", "LBL-", "LBL--")
    // Incomplete barcodes must NOT resolve to random existing labels!
    if (/^LBL-?$/i.test(upperCode) || upperCode === 'LBL' || upperCode === 'LBL-') {
      return null;
    }

    const rawNumberOnly = upperCode.replace(/^LBL-?/i, '').replace(/[^0-9A-Z]/g, '');
    const normalizedLBL = rawNumberOnly.length >= 4 ? `LBL-${rawNumberOnly}` : '';

    // 1. Direct ID match (Exact match, or full numeric suffix with at least 4 digits: e.g. "73601" -> "LBL-73601")
    let match = labels.find((l) => {
      const lid = l.id.toUpperCase();
      const lidRaw = lid.replace(/^LBL-?/i, '').replace(/[^0-9A-Z]/g, '');
      return lid === upperCode || (normalizedLBL !== '' && lid === normalizedLBL) || (rawNumberOnly.length >= 4 && lidRaw === rawNumberOnly);
    });
    if (match) return match;

    // 1.5 If in orders mode with an active order, check if any box in the order matches this raw folio
    if (dispatchMode === 'orders' && activeOrder) {
      const orderItems = activeOrder.items || [];
      const itemMatch = orderItems.find((it) => {
        const iid = it.labelId.toUpperCase();
        const iidRaw = iid.replace(/^LBL-?/i, '').replace(/[^0-9A-Z]/g, '');
        return iid === upperCode || (normalizedLBL !== '' && iid === normalizedLBL) || (rawNumberOnly.length >= 4 && iidRaw === rawNumberOnly);
      });
      if (itemMatch) {
        return {
          id: itemMatch.labelId,
          productId: 'order-item',
          productCode: itemMatch.productCode,
          productName: itemMatch.productName,
          category: 'Carnes',
          lot: itemMatch.lot,
          weight: itemMatch.weight,
          unit: itemMatch.unit || 'KG',
          warehouse: 'Congelado',
          subWarehouse: itemMatch.subWarehouse,
          conditionFlag: 'A',
          printTimestamp: new Date().toISOString(),
          barcodePayload: `${itemMatch.productCode}|${itemMatch.lot}|${itemMatch.weight}KG|${itemMatch.labelId}`,
          printerIp: 'Sistema Almacén',
          status: 'printed',
          copies: 1,
          isDischarged: false,
        };
      }
    }

    // 2. Direct payload match
    match = labels.find((l) => l.barcodePayload === cleanCode || l.barcodePayload === upperCode);
    if (match) return match;

    // 3. Format with pipes: '01-001|220926|25.00KG|2026-12-31|LBL-50957'
    if (cleanCode.includes('|')) {
      const parts = cleanCode.split('|');
      const labelIdFromPayload = parts[parts.length - 1].toUpperCase();
      match = labels.find(
        (l) =>
          l.id.toUpperCase() === labelIdFromPayload ||
          (l.barcodePayload && l.barcodePayload.toUpperCase().includes(labelIdFromPayload))
      );
      if (match) return match;

      const [prodCode, lotStr] = cleanCode.split('|');
      match = labels.find((l) => !l.isDischarged && l.productCode === prodCode && l.lot === lotStr);
      if (match) return match;
    }

    // 4. Compact format: P01001L220926W0218E270917 / P01001L031026W3890E270928
    const pMatch = cleanCode.match(/P([A-Z0-9]+?)(?=L|W|E|$)/i);
    const lMatch = cleanCode.match(/L([A-Z0-9]+?)(?=W|E|$)/i);
    const wMatch = cleanCode.match(/W(\d{3,5})(?=E|$)/i);

    if (pMatch && lMatch) {
      const prodPart = pMatch[1].toUpperCase();
      const lotPart = lMatch[1].toUpperCase();
      const scannedWeight = wMatch ? Number(wMatch[1]) / 100 : null;

      // 4.1 Match product, lot AND exact weight (within 0.08 KG)
      if (scannedWeight !== null && !isNaN(scannedWeight)) {
        match = labels.find((l) => {
          if (l.isDischarged) return false;
          const cleanP = l.productCode.replace(/^PRD-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const cleanL = l.lot.replace(/^LOT-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const pOk = cleanP === prodPart || cleanP.includes(prodPart);
          const lOk = cleanL === lotPart || cleanL.includes(lotPart);
          const wOk = Math.abs(l.weight - scannedWeight) < 0.08;
          return pOk && lOk && wOk;
        });
        if (match) return match;
      }

      // 4.2 Match product and lot if single box or weight variation
      match = labels.find((l) => {
        if (l.isDischarged) return false;
        const cleanP = l.productCode.replace(/^PRD-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const cleanL = l.lot.replace(/^LOT-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return (cleanP === prodPart || cleanP.includes(prodPart)) && (cleanL === lotPart || cleanL.includes(lotPart));
      });
      if (match) return match;
    }

    // Notice: Removed loose fallback `labels.find(l => l.id.toUpperCase().includes(upperCode))`
    // which caused partial string "LBL-" to falsely match "LBL-98755" (Falla F03).
    return null;
  }, [labels, dispatchMode, activeOrder]);

  // Add a scanned box to the pending list (DO NOT discharge immediately!)
  const handleAddBoxToList = useCallback((rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    const matched = findMatchingLabel(cleanCode);

    if (!matched) {
      playBeepSound('error');
      setScanNotice({
        type: 'error',
        message: 'Código no encontrado en el sistema',
        details: `El código "${cleanCode}" no coincide con ninguna etiqueta registrada. Verifique si la etiqueta pertenece a este almacén.`,
      });
      setBarcodeInput('');
      setTimeout(focusGunInput, 20);
      return;
    }

    if (matched.isDischarged) {
      playBeepSound('error');
      setScanNotice({
        type: 'error',
        message: `La caja ${matched.id} ya fue descargada anteriormente`,
        details: `Producto: ${matched.productName} | Lote: ${matched.lot} | Despachada: ${formatSafeDate(matched.dischargedAt)}`,
      });
      setBarcodeInput('');
      setTimeout(focusGunInput, 20);
      return;
    }

    // Check duplicate in current pending list
    const isAlreadyInList = dispatchList.some(
      (item) => item.matchedLabel.id === matched.id || item.rawCode === cleanCode
    );

    if (isAlreadyInList) {
      playBeepSound('error');
      setScanNotice({
        type: 'warning',
        message: `¡Caja ${matched.id} ya se encuentra en la lista!`,
        details: `${matched.productName} (${formatSafeWeight(matched.weight)} ${matched.unit || 'KG'}) ya fue agregada para esta salida.`,
      });
      setBarcodeInput('');
      setTimeout(focusGunInput, 20);
      return;
    }

    if (dispatchMode === 'orders' && activeOrder) {
      const orderLabelIds = activeOrder.items?.map((it) => it.labelId) || activeOrder.labelIds || [];
      const isInOrder = orderLabelIds.includes(matched.id);
      if (isInOrder) {
        // Direct match for requested box in order
        playBeepSound('success');
        const newItem: PendingDispatchItem = {
          id: `${matched.id}-${Date.now()}`,
          rawCode: cleanCode,
          matchedLabel: matched,
          scannedAt: new Date(),
        };
        setDispatchList((prev) => [newItem, ...prev]);
        setScanNotice({
          type: 'success',
          message: `✓ Caja verificada para pedido: ${matched.id} (${matched.productName})`,
          details: `Peso: ${formatSafeWeight(matched.weight)} ${matched.unit || 'KG'} | Lote: ${matched.lot}. (El descuento del almacén se aplicará al confirmar la salida y generar comprobante).`,
        });
      } else {
        // Box is NOT in order! Trigger substitution logic
        const unsuppliedItems = (activeOrder.items || []).filter(
          (it) =>
            !dispatchList.some((d) => d.matchedLabel.id === it.labelId) &&
            !orderSubstitutions.some((s) => s.originalLabelId === it.labelId)
        );

        if (unsuppliedItems.length === 0) {
          playBeepSound('error');
          setScanNotice({
            type: 'warning',
            message: `⚠️ Caja ${matched.id} no pertenece al pedido`,
            details: `El pedido ${activeOrder.internalFolio || activeOrder.id} ya cuenta con todas sus cajas cubiertas (${activeOrder.items?.length || activeOrder.totalItems} cajas). Si desea sustituir una caja, deshaga primero una de las verificadas o sustituidas.`,
          });
        } else {
          playBeepSound('warning');
          // Look for same product code first, else first unsupplied item
          const sameProd = unsuppliedItems.find((it) => it.productCode === matched.productCode);
          const defaultTargetId = sameProd ? sameProd.labelId : unsuppliedItems[0].labelId;

          setPendingSubstitutionCandidate({
            scannedBox: matched,
            targetOriginalLabelId: defaultTargetId,
            reason: 'Caja física no localizada en rack / Sustitución por stock equivalente',
          });
          setScanNotice({
            type: 'warning',
            message: `🔄 Caja sustituta escaneada: ${matched.id} (${matched.productName})`,
            details: `Esta caja no figuraba en el pedido original. Seleccione cuál caja no encontrada desea sustituir.`,
          });
        }
      }
    } else {
      playBeepSound('success');
      const newItem: PendingDispatchItem = {
        id: `${matched.id}-${Date.now()}`,
        rawCode: cleanCode,
        matchedLabel: matched,
        scannedAt: new Date(),
      };
      setDispatchList((prev) => [newItem, ...prev]);
      setScanNotice({
        type: 'success',
        message: `Caja agregada: ${matched.productName}`,
        details: `ID: ${matched.id} | Peso: ${formatSafeWeight(matched.weight)} ${matched.unit || 'KG'} | Lote: ${matched.lot}`,
      });
    }

    setBarcodeInput('');
    setTimeout(focusGunInput, 20);
  }, [findMatchingLabel, playBeepSound, dispatchList, focusGunInput, dispatchMode, activeOrder, orderSubstitutions]);

  // Confirm barcode gun scanned substitution
  const handleConfirmPendingSubstitution = () => {
    if (!pendingSubstitutionCandidate || !activeOrder) return;
    const { scannedBox, targetOriginalLabelId, reason } = pendingSubstitutionCandidate;
    const originalItem = (activeOrder.items || []).find((it) => it.labelId === targetOriginalLabelId) || {
      labelId: targetOriginalLabelId,
      productCode: scannedBox.productCode,
      productName: scannedBox.productName,
      lot: 'SOLICITADO',
      weight: scannedBox.weight,
      unit: scannedBox.unit || 'KG',
    };

    const weightDiff = Number((scannedBox.weight - originalItem.weight).toFixed(2));
    const newSub: OrderItemSubstitution = {
      originalLabelId: originalItem.labelId,
      originalProductCode: originalItem.productCode,
      originalProductName: originalItem.productName,
      originalLot: originalItem.lot,
      originalWeight: originalItem.weight,
      originalUnit: originalItem.unit || 'KG',
      substitutedWithLabelId: scannedBox.id,
      substitutedWithProductCode: scannedBox.productCode,
      substitutedWithProductName: scannedBox.productName,
      substitutedWithLot: scannedBox.lot,
      substitutedWithWeight: scannedBox.weight,
      substitutedWithUnit: scannedBox.unit || 'KG',
      weightDifference: weightDiff,
      substitutedAt: new Date().toISOString(),
      substitutedBy: activeUser ? `${activeUser.name} (${activeUser.role || 'Operador de Embarque'})` : scannedBy,
      reason: reason.trim() || 'Caja física no localizada en rack / Sustitución por stock equivalente',
    };

    const newItem: PendingDispatchItem = {
      id: `${scannedBox.id}-${Date.now()}`,
      rawCode: scannedBox.barcodePayload || scannedBox.id,
      matchedLabel: scannedBox,
      scannedAt: new Date(),
      isSubstitution: true,
      substitutingForLabelId: originalItem.labelId,
      substitutingForProductName: originalItem.productName,
      substitutingForWeight: originalItem.weight,
      substitutingForLot: originalItem.lot,
      substitutionReason: newSub.reason,
    };

    setDispatchList((prev) => [newItem, ...prev]);
    setOrderSubstitutions((prev) => [
      ...prev.filter((s) => s.originalLabelId !== originalItem.labelId),
      newSub,
    ]);
    setPendingSubstitutionCandidate(null);
    playBeepSound('success');
    setScanNotice({
      type: 'success',
      message: `🔄 Sustitución registrada: ${originalItem.labelId} reemplazada por ${scannedBox.id}`,
      details: `${scannedBox.productName} (${formatSafeWeight(scannedBox.weight)} KG). Diferencia: ${
        weightDiff >= 0 ? `+${weightDiff}` : weightDiff
      } KG. La caja no encontrada volverá a estar disponible en stock.`,
    });
    setBarcodeInput('');
    setTimeout(focusGunInput, 20);
  };

  // Confirm manual substitution picked from stock
  const handleConfirmManualSubstitution = () => {
    if (!manualSubstitutionTarget || !activeOrder) return;
    const { originalItem, selectedReplacementId, reason } = manualSubstitutionTarget;
    if (!selectedReplacementId) return;

    const repLabel = labels.find((l) => l.id === selectedReplacementId);
    if (!repLabel) return;

    if (dispatchList.some((d) => d.matchedLabel.id === repLabel.id)) {
      alert('Esta caja ya se encuentra en la lista de salida.');
      return;
    }

    const weightDiff = Number((repLabel.weight - originalItem.weight).toFixed(2));
    const newSub: OrderItemSubstitution = {
      originalLabelId: originalItem.labelId,
      originalProductCode: originalItem.productCode,
      originalProductName: originalItem.productName,
      originalLot: originalItem.lot,
      originalWeight: originalItem.weight,
      originalUnit: originalItem.unit || 'KG',
      substitutedWithLabelId: repLabel.id,
      substitutedWithProductCode: repLabel.productCode,
      substitutedWithProductName: repLabel.productName,
      substitutedWithLot: repLabel.lot,
      substitutedWithWeight: repLabel.weight,
      substitutedWithUnit: repLabel.unit || 'KG',
      weightDifference: weightDiff,
      substitutedAt: new Date().toISOString(),
      substitutedBy: activeUser ? `${activeUser.name} (${activeUser.role || 'Operador de Embarque'})` : scannedBy,
      reason: reason.trim() || 'Caja física no localizada en rack / Sustitución por stock equivalente',
    };

    const newItem: PendingDispatchItem = {
      id: `${repLabel.id}-${Date.now()}`,
      rawCode: repLabel.barcodePayload || repLabel.id,
      matchedLabel: repLabel,
      scannedAt: new Date(),
      isSubstitution: true,
      substitutingForLabelId: originalItem.labelId,
      substitutingForProductName: originalItem.productName,
      substitutingForWeight: originalItem.weight,
      substitutingForLot: originalItem.lot,
      substitutionReason: newSub.reason,
    };

    setDispatchList((prev) => [newItem, ...prev]);
    setOrderSubstitutions((prev) => [
      ...prev.filter((s) => s.originalLabelId !== originalItem.labelId),
      newSub,
    ]);
    setManualSubstitutionTarget(null);
    playBeepSound('success');
    setScanNotice({
      type: 'success',
      message: `🔄 Sustitución registrada: ${originalItem.labelId} reemplazada por ${repLabel.id}`,
      details: `${repLabel.productName} (${formatSafeWeight(repLabel.weight)} KG). Diferencia: ${
        weightDiff >= 0 ? `+${weightDiff}` : weightDiff
      } KG.`,
    });
  };

  // Undo an order substitution
  const handleUndoSubstitution = (originalLabelId: string) => {
    const sub = orderSubstitutions.find((s) => s.originalLabelId === originalLabelId);
    if (!sub) return;
    setDispatchList((prev) => prev.filter((d) => d.matchedLabel.id !== sub.substitutedWithLabelId));
    setOrderSubstitutions((prev) => prev.filter((s) => s.originalLabelId !== originalLabelId));
    setScanNotice({
      type: 'warning',
      message: `Sustitución deshecha: La caja ${originalLabelId} vuelve a estar pendiente`,
      details: `Se retiró la caja sustituta ${sub.substitutedWithLabelId} de la lista de salida.`,
    });
  };

  // Handler to verify a single box from the active order checklist
  const handleVerifySingleBox = (boxItem: any) => {
    const isAlreadyIn = dispatchList.some((item) => item.matchedLabel.id === boxItem.labelId);
    if (isAlreadyIn) return;

    const matched = labels.find((l) => l.id === boxItem.labelId) || {
      id: boxItem.labelId,
      productId: 'unknown',
      productCode: boxItem.productCode,
      productName: boxItem.productName,
      category: 'Carnes',
      lot: boxItem.lot,
      weight: boxItem.weight,
      unit: boxItem.unit || 'KG',
      warehouse: boxItem.warehouse || 'Congelado',
      subWarehouse: boxItem.subWarehouse,
      conditionFlag: 'A' as const,
      printTimestamp: new Date().toISOString(),
      isDischarged: false,
    };

    playBeepSound('success');
    const newItem: PendingDispatchItem = {
      id: `${boxItem.labelId}-${Date.now()}`,
      rawCode: boxItem.labelId,
      matchedLabel: matched as PrintedLabel,
      scannedAt: new Date(),
    };

    setDispatchList((prev) => [newItem, ...prev]);
    setScanNotice({
      type: 'success',
      message: `✓ Caja ${boxItem.labelId} agregada a la lista de preparación`,
      details: `${boxItem.productName} (${formatSafeWeight(boxItem.weight)} ${boxItem.unit || 'KG'}). El descuento del almacén se aplicará al presionar 'Confirmar Salida y Emitir Comprobante'.`,
    });
  };

  // Handler to verify all boxes of the active order in 1 click
  const handleVerifyAllBoxesInOrder = () => {
    if (!activeOrder) return;
    const items = activeOrder.items || [];
    const newItems: PendingDispatchItem[] = [];

    items.forEach((it) => {
      const isAlready = dispatchList.some((d) => d.matchedLabel.id === it.labelId);
      if (!isAlready) {
        const lbl = labels.find((l) => l.id === it.labelId) || {
          id: it.labelId,
          productId: 'unknown',
          productCode: it.productCode,
          productName: it.productName,
          category: 'Carnes',
          lot: it.lot,
          weight: it.weight,
          unit: it.unit || 'KG',
          warehouse: it.warehouse || 'Congelado',
          subWarehouse: it.subWarehouse,
          conditionFlag: 'A' as const,
          printTimestamp: new Date().toISOString(),
          isDischarged: false,
        };
        newItems.push({
          id: `${it.labelId}-${Date.now()}`,
          rawCode: it.labelId,
          matchedLabel: lbl as PrintedLabel,
          scannedAt: new Date(),
        });
      }
    });

    if (newItems.length > 0) {
      setDispatchList((prev) => [...newItems, ...prev]);
      playBeepSound('success');
      setScanNotice({
        type: 'success',
        message: `✓ ${newItems.length} cajas del pedido cargadas a la lista de preparación`,
        details: 'Cajas listas para revisión. Presione "Confirmar Salida y Emitir Comprobante de Pedido" para aplicar el descuento del almacén.',
      });
    }
  };

  // Handler to save updated folio on a damaged box card or order item
  const handleSaveUpdatedFolio = async () => {
    if (!editingLabelIdTarget || !newFolioInput.trim()) return;
    try {
      setEditFolioError('');
      const cleanNewId = newFolioInput.trim().toUpperCase();
      const formattedNewId = cleanNewId.startsWith('LBL-') ? cleanNewId : `LBL-${cleanNewId}`;
      await updatePrintedLabelId(editingLabelIdTarget.id, formattedNewId);

      const updatedLabel: PrintedLabel = {
        ...editingLabelIdTarget,
        id: formattedNewId,
      };

      // Update existing item in dispatchList if old ID was present
      setDispatchList((prev) => {
        const foundIndex = prev.findIndex(
          (d) => d.matchedLabel.id.toUpperCase() === editingLabelIdTarget.id.toUpperCase()
        );
        if (foundIndex >= 0) {
          const clone = [...prev];
          clone[foundIndex] = {
            ...clone[foundIndex],
            rawCode: formattedNewId,
            matchedLabel: updatedLabel,
          };
          return clone;
        } else {
          // Auto add to dispatch list so operator doesn't have to re-enter it
          return [
            {
              id: `${formattedNewId}-${Date.now()}`,
              rawCode: formattedNewId,
              matchedLabel: updatedLabel,
              scannedAt: new Date(),
            },
            ...prev,
          ];
        }
      });

      playBeepSound('success');
      setScanNotice({
        type: 'success',
        message: `✓ Folio LBL sincronizado: ${formattedNewId}`,
        details: `La caja ahora está registrada como "${formattedNewId}", coincidiendo 1:1 con la etiqueta física y agregada a la lista de salida.`,
      });
      setEditingLabelIdTarget(null);
      setNewFolioInput('');
    } catch (err: any) {
      setEditFolioError(err.message || 'Error al actualizar el folio');
    }
  };

  // Handle Enter key on barcode gun input
  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBoxToList(barcodeInput);
    }
  };

  // Remove single box from list (undoes linked substitution if applicable)
  const handleRemoveItem = (itemId: string) => {
    const item = dispatchList.find((d) => d.id === itemId);
    if (item && item.isSubstitution && item.substitutingForLabelId) {
      setOrderSubstitutions((prev) =>
        prev.filter((s) => s.originalLabelId !== item.substitutingForLabelId)
      );
    }
    setDispatchList((prev) => prev.filter((d) => d.id !== itemId));
  };

  // Clear entire list
  const handleClearList = () => {
    if (window.confirm('¿Desea vaciar la lista de cajas escaneadas?')) {
      setDispatchList([]);
      setOrderSubstitutions([]);
      setScanNotice({ type: null, message: '' });
      setTimeout(focusGunInput, 30);
    }
  };

  // Submit multiple paste codes
  const handleBatchPasteSubmit = () => {
    const lines = batchPasteInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((code) => handleAddBoxToList(code));
    setBatchPasteInput('');
    setShowPasteModal(false);
  };

  // Calculations for current pending list
  const totalBoxesCount = dispatchList.length;
  const totalWeightKg = dispatchList.reduce(
    (sum, item) => sum + (Number(item.matchedLabel.weight) || 0),
    0
  );

  // Execute Discharge process with Consecutive Folio Number
  const handleExecuteDischarge = () => {
    if (dispatchList.length === 0) return;

    const assignedExitFolio = generateNextExitFolio();
    const codesToDischarge = dispatchList.map((item) => item.rawCode || item.matchedLabel.id);

    const result = processBatchDischarge(
      codesToDischarge,
      scannedBy,
      dischargeReason,
      dischargeNotes,
      assignedExitFolio
    );

    if (result.successfulCount > 0) {
      playBeepSound('success');
      // Set voucher modal with summary
      setCompletedExitVoucher({
        exitFolio: result.exitFolio || assignedExitFolio,
        timestamp: new Date().toISOString(),
        operator: scannedBy,
        reason: dischargeReason,
        notes: dischargeNotes,
        itemsCount: result.successfulCount,
        totalWeight: result.totalWeight,
        records: result.records,
      });

      // Clear pending list
      setDispatchList([]);
      setScanNotice({ type: null, message: '' });
    } else {
      playBeepSound('error');
      setScanNotice({
        type: 'error',
        message: 'No se pudo procesar la salida',
        details: result.errors.map((e) => e.message).join(' | '),
      });
    }
  };

  // Execute Order Discharge & Inventory Discount (Supports substitutions & releasing unfound boxes)
  const handleExecuteOrderDischarge = async () => {
    if (!activeOrder) return;

    const originalItems = activeOrder.items || [];
    const unfoundCount = originalItems.filter(
      (it) =>
        !dispatchList.some((d) => d.matchedLabel.id === it.labelId) &&
        !orderSubstitutions.some((s) => s.originalLabelId === it.labelId)
    ).length;

    let confirmMsg = `¿Desea confirmar el despacho y descuento de inventario del pedido ${
      activeOrder.internalFolio || activeOrder.id
    } para ${activeOrder.clientOrEvent}?\n\n• Cajas a despachar: ${dispatchList.length} cajas (${formatSafeWeight(totalWeightKg)} KG)`;

    if (orderSubstitutions.length > 0) {
      confirmMsg += `\n• Sustituciones autorizadas: ${orderSubstitutions.length} caja(s).`;
    }
    if (unfoundCount > 0) {
      confirmMsg += `\n• Cajas no encontradas: ${unfoundCount} caja(s) (cambiarán su estatus a DISPONIBLES en stock nuevamente).`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    const dispatcher = activeUser
      ? `${activeUser.name} (${activeUser.role || 'Almacén Embarques'})`
      : scannedBy;
    const assignedFolio = activeOrder.internalFolio || generateNextExitFolio();

    const updatedOrder = await dispatchMarketReservationWithSubstitutions(
      activeOrder.id,
      dispatchList.map((item) => item.matchedLabel),
      orderSubstitutions,
      dispatcher,
      assignedFolio,
      dischargeNotes
    );

    playBeepSound('success');

    if (updatedOrder) {
      setSelectedVoucherReservation(updatedOrder);
    } else {
      setSelectedVoucherReservation({
        ...activeOrder,
        status: 'DESPACHADO',
        dischargedAt: new Date().toISOString(),
        dischargedBy: dispatcher,
        substitutions: orderSubstitutions,
        hasSubstitutions: orderSubstitutions.length > 0,
        totalWeight: totalWeightKg,
        totalItems: dispatchList.length,
      });
    }

    setDispatchList([]);
    setOrderSubstitutions([]);
    setScanNotice({
      type: 'success',
      message: `¡Salida de Pedido ${activeOrder.internalFolio || activeOrder.id} completada exitosamente!`,
      details: `Se descontaron ${formatSafeWeight(totalWeightKg)} KG de Producto No Conforme (${
        dispatchList.length
      } cajas). ${
        orderSubstitutions.length > 0
          ? `Se registraron ${orderSubstitutions.length} sustitución(es) en el Comprobante Oficial y las cajas no encontradas quedaron DISPONIBLES en stock.`
          : 'Se emitió el Comprobante Oficial de Pedido.'
      }`,
    });
  };

  // Filtered active stock for manual tab (Damaged barcode fallback)
  const activeStockLabels = labels
    .filter((l) => !l.isDischarged)
    .filter((l) => {
      if (!manualSearchQuery.trim()) return true;
      const q = manualSearchQuery.trim().toLowerCase();
      const rawNum = q.replace(/^lbl-?/i, '');
      return (
        l.id.toLowerCase().includes(q) ||
        (rawNum && l.id.toLowerCase().includes(rawNum)) ||
        l.weight.toFixed(2).includes(q) ||
        (l.productName && l.productName.toLowerCase().includes(q)) ||
        (l.productCode && l.productCode.toLowerCase().includes(q)) ||
        (l.lot && l.lot.toLowerCase().includes(q))
      );
    });

  return (
    <div className="space-y-4 font-mono">
      {/* Intro Header */}
      <div className="bg-[#141414] text-white p-4 sm:p-5 border border-[#141414] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-[#141414] text-[10px] font-extrabold px-2 py-0.5 uppercase tracking-wider">
              FASE 3
            </span>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <Barcode className="w-5 h-5 text-amber-400" />
              Lector de Código de Barras & Control de Salidas
            </h2>
          </div>
          <p className="text-[#A0A09C] text-xs max-w-2xl font-sans">
            Escanee 1 o más cajas con la pistola lectora. Las cajas se listarán automáticamente para que pueda revisar los kilos y cantidades antes de generar la salida con su <strong>Folio Consecutivo</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#1F1F1D] border border-[#3A3A36] px-3.5 py-2 text-xs font-bold shrink-0">
          <div className="text-right">
            <span className="text-[9px] uppercase text-[#A0A09C] block">Próximo Folio de Salida:</span>
            <span className="text-sm font-black text-amber-400 font-mono tracking-wider">{nextConsecutiveFolio}</span>
          </div>
          <div className="w-px h-8 bg-[#333]"></div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Beep Activo</span>
          </div>
        </div>
      </div>

      {/* MODE SWITCHER: Surtir Pedido Aprobado vs Salida Directa */}
      <div className="bg-[#1F1F1D] border-2 border-amber-400 p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-gray-700 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDispatchMode('orders')}
              className={`px-4 py-2 text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer rounded-xs ${
                dispatchMode === 'orders'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-[#141414] text-gray-300 hover:text-white border border-gray-700'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-inherit" />
              <span>1. Surtir Pedido Aprobado PNC ({approvedOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDispatchMode('direct')}
              className={`px-4 py-2 text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer rounded-xs ${
                dispatchMode === 'direct'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-[#141414] text-gray-300 hover:text-white border border-gray-700'
              }`}
            >
              <Send className="w-4 h-4 text-inherit" />
              <span>2. Salida Directa (Sin Pedido)</span>
            </button>
          </div>

          <span className="text-[11px] text-amber-300 font-sans">
            {dispatchMode === 'orders'
              ? '✓ Emite Comprobante Oficial con Telemarketing, Vendedor, Cliente y Horas'
              : '⚡ Salida de almacén con Folio Consecutivo directo'}
          </span>
        </div>

        {/* ORDER PICKER DETAILS WHEN IN ORDERS MODE */}
        {dispatchMode === 'orders' && (
          <div className="space-y-3 text-xs">
            {approvedOrders.length === 0 ? (
              <div className="bg-[#141414] border border-amber-500/50 p-3.5 text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>No hay pedidos aprobados pendientes de despacho en este momento.</span>
                </p>
                <p className="text-[11px] text-gray-400 font-sans">
                  Los pedidos generados por el área comercial y aprobados por Telemarketing aparecerán aquí para que Almacén y Embarques realice la preparación física y emita el Comprobante Oficial. Si requiere despachar mercancía sin pedido, cambie a <strong>&quot;2. Salida Directa&quot;</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#141414] p-2.5 border border-gray-700">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-[11px] font-black uppercase text-amber-400 shrink-0">
                      Seleccionar Pedido a Surtir:
                    </label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => {
                        setSelectedOrderId(e.target.value);
                        setDispatchList([]);
                      }}
                      className="bg-white text-black font-mono font-bold text-xs p-1.5 border-2 border-amber-400 w-full max-w-xl focus:outline-hidden"
                    >
                      {approvedOrders.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          [{ord.internalFolio || ord.id}] — {ord.clientOrEvent} | {ord.totalWeight.toFixed(2)} KG ({ord.items?.length || ord.totalItems} cajas) — Solicitó: {ord.developerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeOrder && (
                    <button
                      type="button"
                      onClick={handleVerifyAllBoxesInOrder}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      title="Verificar y cargar todas las cajas del pedido a la lista de preparación en 1 clic"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verificar Todo el Pedido ({activeOrder.items?.length || activeOrder.totalItems} cajas)</span>
                    </button>
                  )}
                </div>

                {activeOrder && (
                  <div className="bg-white text-black border-2 border-amber-400 p-3.5 space-y-2.5 shadow-sm">
                    {/* Header info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 border-b border-gray-300 pb-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Folio de Pedido:</span>
                        <span className="font-mono font-black text-sm text-black">
                          {activeOrder.internalFolio || activeOrder.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Cliente / Evento:</span>
                        <span className="font-bold text-xs text-black block truncate" title={activeOrder.clientOrEvent}>
                          {activeOrder.clientOrEvent}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Vendedor / Comercial:</span>
                        <span className="font-bold text-xs text-black block truncate">
                          {activeOrder.developerName} {activeOrder.developerZone && `(${activeOrder.developerZone})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Atención Telemarketing:</span>
                        <span className="font-bold text-xs text-emerald-800 block truncate">
                          {activeOrder.approvedBy || 'Telemarketing Central'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-700 bg-amber-50/70 p-2 border border-amber-200">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-bold text-gray-900">
                          <Calendar className="w-3.5 h-3.5 text-amber-700" />
                          <span>Hora Creación Pedido:</span>
                          <strong className="text-black">{formatFullDateTime(activeOrder.reservationDate)}</strong>
                        </span>
                      </div>
                      <div className="font-bold text-black flex items-center gap-2">
                        <span>Total Pedido:</span>
                        <span className="bg-amber-300 px-2 py-0.5 font-mono text-black font-black text-xs">
                          {activeOrder.totalWeight.toFixed(2)} KG ({activeOrder.items?.length || activeOrder.totalItems} Cajas)
                        </span>
                      </div>
                    </div>

                    {/* Picking checklist of boxes belonging to the order */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-bold text-gray-800 border-b border-gray-200 pb-1.5">
                        <span className="uppercase flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-black" />
                          <span>Cajas Requeridas para este Pedido ({activeOrder.items?.length || activeOrder.labelIds.length}):</span>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-black text-emerald-800">
                            {dispatchList.filter(d => !d.isSubstitution && (activeOrder.items?.map(i => i.labelId) || activeOrder.labelIds).includes(d.matchedLabel.id)).length} exactas
                          </span>
                          {orderSubstitutions.length > 0 && (
                            <span className="text-xs font-mono font-black text-amber-950 bg-amber-200 px-1.5 py-0.5 rounded-xs border border-amber-400 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-amber-900" />
                              <span>{orderSubstitutions.length} sustitución{orderSubstitutions.length !== 1 ? 'es' : ''}</span>
                            </span>
                          )}
                          <span className="text-xs font-mono text-gray-600">
                            ({dispatchList.length} de {activeOrder.items?.length || activeOrder.labelIds.length} cajas listas)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {(activeOrder.items && activeOrder.items.length > 0 ? activeOrder.items : activeOrder.labelIds.map(id => ({ labelId: id, productCode: 'PNC', productName: 'Producto PNC', lot: '031026', weight: 0, unit: 'KG' }))).map((it: any, idx: number) => {
                          const isVerified = dispatchList.some(d => d.matchedLabel.id === it.labelId && !d.isSubstitution);
                          const substitution = orderSubstitutions.find(s => s.originalLabelId === it.labelId);
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 border-2 text-xs flex flex-col justify-between gap-1.5 transition-all ${
                                isVerified
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                                  : substitution
                                  ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-2xs'
                                  : 'bg-gray-50 border-gray-300 text-gray-800 hover:border-gray-400'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-black bg-black text-amber-400 px-1 text-[10px]">
                                    {it.labelId}
                                  </span>
                                  {isVerified && (
                                    <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.2 border border-emerald-400 rounded-xs">
                                      ✓ Original
                                    </span>
                                  )}
                                  {substitution && (
                                    <span className="text-[9px] font-black uppercase text-amber-950 bg-amber-300 px-1.5 py-0.2 border border-amber-500 rounded-xs flex items-center gap-0.5">
                                      <RefreshCw className="w-2.5 h-2.5 text-amber-900" />
                                      <span>Sustituida</span>
                                    </span>
                                  )}
                                  {!isVerified && !substitution && (
                                    <span className="text-[9px] font-bold text-gray-500 uppercase">
                                      ⏳ Pendiente
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold truncate text-[11px] block mt-1 text-gray-900" title={it.productName}>
                                  {it.productName}
                                </span>
                                <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                                  Lote original: <strong className="font-mono text-black">{it.lot}</strong> | Peso: <strong className="text-emerald-950">{formatSafeWeight(it.weight)} {it.unit || 'KG'}</strong>
                                </div>

                                {substitution && (
                                  <div className="mt-1.5 p-1.5 bg-amber-100/80 border border-amber-300 rounded-xs text-[10px] space-y-0.5">
                                    <span className="font-bold text-amber-950 block">
                                      Caja entregada: <strong className="font-mono text-black">{substitution.substitutedWithLabelId}</strong>
                                    </span>
                                    <span className="text-gray-700 block truncate font-sans">
                                      {substitution.substitutedWithProductName}
                                    </span>
                                    <div className="flex items-center justify-between text-gray-700">
                                      <span>Lote: <strong className="font-mono">{substitution.substitutedWithLot}</strong> ({formatSafeWeight(substitution.substitutedWithWeight)} KG)</span>
                                      <span className={`font-black font-mono ${substitution.weightDifference && substitution.weightDifference > 0 ? 'text-emerald-800' : substitution.weightDifference && substitution.weightDifference < 0 ? 'text-rose-800' : 'text-gray-800'}`}>
                                        Dif: {substitution.weightDifference && substitution.weightDifference >= 0 ? '+' : ''}{formatSafeWeight(substitution.weightDifference)} KG
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUndoSubstitution(it.labelId)}
                                      className="text-[9px] text-rose-700 hover:text-rose-900 underline font-bold cursor-pointer block pt-0.5"
                                    >
                                      Deshacer sustitución
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="pt-1.5 border-t border-black/10 flex items-center justify-between gap-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const existing = labels.find((l) => l.id.toUpperCase() === it.labelId.toUpperCase()) || {
                                      id: it.labelId,
                                      productId: 'order-item',
                                      productCode: it.productCode,
                                      productName: it.productName,
                                      category: 'Carnes',
                                      lot: it.lot,
                                      weight: it.weight,
                                      unit: it.unit || 'KG',
                                      warehouse: it.warehouse || 'Congelado',
                                      subWarehouse: it.subWarehouse,
                                      conditionFlag: 'A' as const,
                                      printTimestamp: new Date().toISOString(),
                                      isDischarged: false,
                                    };
                                    setEditingLabelIdTarget(existing as PrintedLabel);
                                    setNewFolioInput(it.labelId);
                                    setEditFolioError('');
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-bold text-[9px] uppercase cursor-pointer flex items-center gap-0.5"
                                  title="Si la etiqueta física tiene un código LBL distinto o el código de barras está dañado, sincronícelo aquí"
                                >
                                  <Sliders className="w-2.5 h-2.5 text-gray-700" />
                                  <span>LBL Físico</span>
                                </button>

                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-400">
                                    ✓ Verificada
                                  </span>
                                ) : substitution ? (
                                  <span className="text-[10px] font-black text-amber-950 bg-amber-200 px-1.5 py-0.5 border border-amber-400">
                                    Sustituida
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleVerifySingleBox(it)}
                                      className="px-2 py-0.5 bg-black hover:bg-gray-800 text-amber-400 font-bold text-[10px] uppercase cursor-pointer"
                                      title="Cargar esta caja original encontrada"
                                    >
                                      + Verificar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setManualSubstitutionTarget({
                                          originalItem: it,
                                          selectedReplacementId: '',
                                          reason: 'Caja física no localizada en rack / Sustitución por stock equivalente',
                                          searchQuery: '',
                                          filterSameProductOnly: true,
                                        })
                                      }
                                      className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase cursor-pointer flex items-center gap-0.5 shadow-2xs"
                                      title="No se encontró esta caja: Sustituir por otra caja disponible en stock"
                                    >
                                      <RefreshCw className="w-2.5 h-2.5 text-black" />
                                      <span>Sustituir</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-amber-100/90 border border-amber-300 p-2 text-[11px] text-amber-950 font-sans flex items-start gap-2">
                        <span className="text-sm">ℹ️</span>
                        <div>
                          <strong>Control de Salida & Sustituciones:</strong> Si una caja no se encuentra físicamente, presione <strong>&quot;Sustituir&quot;</strong> o escanee otra caja con la pistola. Las cajas sustitutas se descontarán del inventario y las cajas no encontradas <strong>volverán a estar DISPONIBLES en stock</strong> automáticamente.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operator and Reason Setup Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8F7F4] border border-[#141414] p-3 text-xs">
        <div>
          <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase flex items-center justify-between">
            <span>Operador Responsable:</span>
            {activeUser && (
              <span className="text-amber-800 font-extrabold text-[9px]">
                EMP: {activeUser.employeeNumber}
              </span>
            )}
          </label>
          {systemUsers.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) setScannedBy(e.target.value);
              }}
              value={scannedBy}
              className="w-full mb-1 py-1 px-2 bg-white border border-[#141414] text-[11px] font-bold text-amber-900 focus:outline-hidden"
            >
              <option value="">-- Seleccionar Operador Registrado --</option>
              {systemUsers.map((u) => (
                <option key={u.id} value={`${u.name} (${u.employeeNumber} - ${u.role})`}>
                  [{u.employeeNumber}] {u.name} - {u.role}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <input
              type="text"
              value={scannedBy}
              onChange={(e) => setScannedBy(e.target.value)}
              placeholder="Nombre del operador..."
              className="w-full pl-7 pr-2 py-1 bg-white border border-[#141414] text-xs font-bold text-[#141414] focus:outline-hidden"
            />
            <User className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">
            Motivo de Salida / Despacho:
          </label>
          <select
            value={dischargeReason}
            onChange={(e) => setDischargeReason(e.target.value as any)}
            className="w-full py-1.5 px-2 bg-white border border-[#141414] text-xs font-bold text-[#141414] focus:outline-hidden mb-1"
          >
            <option value="Despacho Producción">Despacho Producción</option>
            <option value="Venta">Venta a Cliente</option>
            <option value="Transferencia">Transferencia Almacén</option>
            <option value="Merma / Vencimiento">Merma / Vencimiento</option>
            <option value="Ajuste">Ajuste de Inventario</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#141414] mb-1 uppercase">
            Notas / Remisión / Destino:
          </label>
          <input
            type="text"
            value={dischargeNotes}
            onChange={(e) => setDischargeNotes(e.target.value)}
            placeholder="Ej. Remisión #402, Cocina Principal, Chofer..."
            className="w-full py-1.5 px-2 bg-white border border-[#141414] text-xs text-[#141414] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Grid: Barcode Gun Input (Left 5 Cols) + Live Review List (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Barcode Gun Scanning Box */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-3">
            {/* Tabs: Gun vs Manual Fallback */}
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setInputTab('scanner');
                    setTimeout(focusGunInput, 30);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                    inputTab === 'scanner'
                      ? 'bg-[#141414] text-amber-400 border border-[#141414]'
                      : 'bg-white text-[#141414] border border-[#141414]/30 hover:bg-[#E4E3E0]'
                  }`}
                >
                  <Barcode className="w-4 h-4 text-amber-400" />
                  <span>Pistola Láser (HID)</span>
                </button>

                <button
                  onClick={() => setInputTab('manual')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                    inputTab === 'manual'
                      ? 'bg-[#141414] text-amber-400 border border-[#141414]'
                      : 'bg-white text-[#141414] border border-[#141414]/30 hover:bg-[#E4E3E0]'
                  }`}
                >
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Código Dañado</span>
                </button>
              </div>

              <button
                onClick={() => setShowPasteModal(true)}
                className="text-[10px] font-bold text-gray-700 hover:text-black hover:underline uppercase flex items-center gap-1 cursor-pointer"
                title="Pegar varios códigos de una sola vez"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Pegar Lista</span>
              </button>
            </div>

            {/* TAB 1: Pistola Láser View */}
            {inputTab === 'scanner' && (
              <div
                onClick={focusGunInput}
                className="space-y-3 bg-[#141414] text-white p-4 border-2 border-amber-400 shadow-md cursor-text"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-extrabold text-amber-400 uppercase tracking-wide">
                      Pistola Láser Lista
                    </span>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-bold bg-[#222220] px-2 py-0.5 border border-emerald-600/50">
                    Auto-enfoque permanente
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleKeyDownInput}
                    autoFocus
                    placeholder="Dispare la pistola al código de barras..."
                    className="w-full pl-3.5 pr-28 py-3.5 bg-black border-2 border-amber-400 font-mono text-sm font-bold text-amber-300 placeholder:text-gray-500 focus:outline-hidden focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
                  />
                  <button
                    onClick={() => handleAddBoxToList(barcodeInput)}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="bg-[#1C1C1A] p-2.5 border border-[#333] flex items-center justify-between text-[11px] text-gray-300 font-sans">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Al escanear cada caja se añade a la lista de salida. <strong>No se descargará hasta que presione &quot;Generar Salida&quot;</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusGunInput();
                    }}
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-bold uppercase underline shrink-0 cursor-pointer ml-2"
                  >
                    Reenfocar
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual Search / Damaged Barcode Fallback */}
            {inputTab === 'manual' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    placeholder="Buscar por ID (LBL-50957), producto o lote..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#141414] text-xs font-bold text-[#141414] focus:outline-hidden"
                  />
                  {manualSearchQuery && (
                    <button
                      onClick={() => setManualSearchQuery('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {activeStockLabels.map((lbl) => {
                    const alreadyAdded = dispatchList.some((item) => item.matchedLabel.id === lbl.id);
                    return (
                      <div
                        key={lbl.id}
                        className={`p-2 border text-xs flex items-center justify-between gap-2 ${
                          alreadyAdded
                            ? 'bg-amber-50 border-amber-400 opacity-60'
                            : 'bg-white border-[#141414]/30 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-[#141414] bg-amber-300 px-1 border border-[#141414]/20">
                              {lbl.id}
                            </span>
                            <span className="font-bold text-[#141414]">{lbl.productName}</span>
                          </div>
                          <p className="text-[10px] text-[#666] mt-0.5">
                            Lote: <strong className="text-[#141414]">{lbl.lot}</strong> | Peso:{' '}
                            <strong className="text-emerald-800">{formatSafeWeight(lbl.weight)} {lbl.unit || 'KG'}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLabelIdTarget(lbl);
                              setNewFolioInput(lbl.id);
                              setEditFolioError('');
                            }}
                            className="px-2 py-1 text-[10px] font-bold uppercase flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-400 cursor-pointer"
                            title="Corregir o sincronizar folio con la etiqueta física si no coincide"
                          >
                            <Sliders className="w-3 h-3 text-amber-800" />
                            <span>Corregir LBL</span>
                          </button>

                          <button
                            disabled={alreadyAdded}
                            onClick={() => handleAddBoxToList(lbl.id)}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase flex items-center gap-1 border ${
                              alreadyAdded
                                ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                                : 'bg-[#141414] text-amber-400 hover:bg-[#282828] border-[#141414] cursor-pointer'
                            }`}
                          >
                            {alreadyAdded ? 'Agregado' : '+ Añadir'}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {activeStockLabels.length === 0 && (
                    <div className="p-4 bg-white border border-[#141414] space-y-3">
                      {manualSearchQuery.trim() ? (
                        <div className="space-y-3">
                          <div className="bg-amber-50 border-2 border-amber-500 p-3 text-xs text-amber-950 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-amber-900">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                Folio &quot;{manualSearchQuery.toUpperCase()}&quot; no encontrado en catálogo
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-700 font-sans leading-relaxed">
                              Cada caja física posee un folio LBL único. Si la caja que tiene en sus manos tiene impreso <strong>{manualSearchQuery.toUpperCase().startsWith('LBL-') ? manualSearchQuery.toUpperCase() : `LBL-${manualSearchQuery.toUpperCase()}`}</strong> pero el código de barras está dañado o difiere del sistema, puede sincronizarla de inmediato:
                            </p>
                          </div>

                          {/* If active order has unverified boxes, offer 1-click binding */}
                          {dispatchMode === 'orders' && activeOrder && (
                            <div className="space-y-1.5 bg-[#FAF9F6] border border-gray-300 p-2.5">
                              <span className="text-[10px] font-black uppercase text-gray-800 block">
                                Vincular folio físico a un ítem del pedido {activeOrder.internalFolio || activeOrder.id}:
                              </span>
                              <div className="space-y-1">
                                {(activeOrder.items || []).filter(it => !dispatchList.some(d => d.matchedLabel.id === it.labelId)).map((it, idx) => {
                                  const clean = manualSearchQuery.trim().toUpperCase();
                                  const targetId = clean.startsWith('LBL-') ? clean : `LBL-${clean}`;
                                  return (
                                    <div key={idx} className="flex items-center justify-between bg-white p-2 border border-gray-200 text-xs">
                                      <div className="min-w-0 flex-1 pr-2">
                                        <span className="font-bold text-black block truncate">{it.productName}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                          Lote: {it.lot} | {formatSafeWeight(it.weight)} {it.unit || 'KG'} (ID sistema: {it.labelId})
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await updatePrintedLabelId(it.labelId, targetId);
                                            const updatedLabel: PrintedLabel = {
                                              id: targetId,
                                              productId: 'order',
                                              productCode: it.productCode,
                                              productName: it.productName,
                                              category: 'Carnes',
                                              lot: it.lot,
                                              weight: it.weight,
                                              unit: it.unit || 'KG',
                                              warehouse: 'Congelado',
                                              subWarehouse: it.subWarehouse,
                                              conditionFlag: 'A',
                                              printTimestamp: new Date().toISOString(),
                                              barcodePayload: `${it.productCode}|${it.lot}|${it.weight}KG|${targetId}`,
                                              printerIp: 'Sistema Almacén',
                                              status: 'printed',
                                              copies: 1,
                                              isDischarged: false,
                                            };
                                            setDispatchList((prev) => [
                                              {
                                                id: `${targetId}-${Date.now()}`,
                                                rawCode: targetId,
                                                matchedLabel: updatedLabel,
                                                scannedAt: new Date(),
                                              },
                                              ...prev,
                                            ]);
                                            playBeepSound('success');
                                            setScanNotice({
                                              type: 'success',
                                              message: `✓ Folio físico ${targetId} vinculado a ${it.productName}`,
                                              details: `La caja física con folio ${targetId} ahora está registrada en el pedido y agregada a la lista de salida.`,
                                            });
                                            setManualSearchQuery('');
                                          } catch (err: any) {
                                            setScanNotice({
                                              type: 'error',
                                              message: 'Error al sincronizar folio',
                                              details: err.message,
                                            });
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase cursor-pointer shrink-0 shadow-xs"
                                      >
                                        Asignar {targetId}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Quick register physical box if missing from inventory */}
                          <button
                            type="button"
                            onClick={() => {
                              const clean = manualSearchQuery.trim().toUpperCase();
                              const targetId = clean.startsWith('LBL-') ? clean : `LBL-${clean}`;
                              const defaultProd = activeOrder?.items?.[0] || {
                                productCode: '01-001',
                                productName: 'Carne de Res Molida Premium',
                                lot: '031026',
                                weight: 25.0,
                                unit: 'KG',
                                warehouse: 'Congelado',
                              };
                              const created = addPrintedLabel({
                                id: targetId,
                                productId: 'manual-add',
                                productCode: defaultProd.productCode,
                                productName: defaultProd.productName,
                                category: 'Carnes',
                                lot: defaultProd.lot,
                                weight: defaultProd.weight,
                                unit: defaultProd.unit || 'KG',
                                warehouse: 'Congelado',
                                conditionFlag: 'A',
                                barcodePayload: `${defaultProd.productCode}|${defaultProd.lot}|${defaultProd.weight}KG|${targetId}`,
                                printerIp: 'Sistema Almacén',
                                status: 'printed',
                                copies: 1,
                                printedBy: activeUser ? `${activeUser.name} (${activeUser.employeeNumber})` : 'Operador Almacén',
                              });
                              setDispatchList((prev) => [
                                {
                                  id: `${created.id}-${Date.now()}`,
                                  rawCode: created.id,
                                  matchedLabel: created,
                                  scannedAt: new Date(),
                                },
                                ...prev,
                              ]);
                              playBeepSound('success');
                              setScanNotice({
                                type: 'success',
                                message: `✓ Caja física registrada: ${created.id}`,
                                details: `${created.productName} (${formatSafeWeight(created.weight)} ${created.unit}) dada de alta con su LBL físico y añadida a la lista.`,
                              });
                              setManualSearchQuery('');
                            }}
                            className="w-full py-2 px-3 bg-black hover:bg-gray-800 text-amber-400 font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4 text-amber-400" />
                            <span>
                              Registrar {manualSearchQuery.toUpperCase().startsWith('LBL-') ? manualSearchQuery.toUpperCase() : `LBL-${manualSearchQuery.toUpperCase()}`} en Almacén
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-[#888] text-xs space-y-1 py-2">
                          <p>No hay cajas activas disponibles que coincidan con la búsqueda.</p>
                          <p className="text-[10px] text-gray-500 font-sans">
                            Ingrese el folio numérico (ej. 76467) impreso en la etiqueta física para buscarla o sincronizarla.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scan Feedback Banner */}
            {scanNotice.type && (
              <div
                className={`p-3 border text-xs space-y-1 transition-all animate-in fade-in duration-150 ${
                  scanNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                    : scanNotice.type === 'warning'
                    ? 'bg-amber-50 border-amber-500 text-amber-950'
                    : 'bg-rose-50 border-rose-500 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {scanNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {scanNotice.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  {scanNotice.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span className="uppercase">{scanNotice.message}</span>
                </div>
                {scanNotice.details && (
                  <p className="text-[11px] leading-relaxed opacity-90 pl-6 font-sans">
                    {scanNotice.details}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Dispatch Review List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#F8F7F4] border-2 border-[#141414] p-4 space-y-4 shadow-sm">
            {/* Header of review list */}
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2.5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#141414]" />
                <div>
                  <h3 className="font-extrabold text-[#141414] text-xs uppercase tracking-wider">
                    Lista de Cajas para Salida de Almacén
                  </h3>
                  <span className="text-[10px] text-[#666] font-sans">
                    Revise cajas y kilos antes de confirmar
                  </span>
                </div>
              </div>

              {dispatchList.length > 0 && (
                <button
                  onClick={handleClearList}
                  className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Lista</span>
                </button>
              )}
            </div>

            {/* Big Metrics Display: Total Cajas + Total KG */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#141414] text-white p-3 border border-[#141414]">
              <div>
                <span className="text-[10px] uppercase text-[#A0A09C] block font-sans">Cajas Escaneadas:</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                  {totalBoxesCount} <span className="text-xs font-normal text-gray-300">Caja{totalBoxesCount !== 1 ? 's' : ''}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-[#A0A09C] block font-sans">Peso Total Neto:</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  {formatSafeWeight(totalWeightKg, 2)} <span className="text-xs font-normal text-gray-300">KG</span>
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-[#333] pt-2 sm:pt-0 sm:pl-3">
                <span className="text-[10px] uppercase text-[#A0A09C] block font-sans">Consecutivo:</span>
                <span className="text-sm font-black text-cyan-400 font-mono tracking-wide block mt-1">
                  {nextConsecutiveFolio}
                </span>
              </div>
            </div>

            {/* List of scanned boxes in queue */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {dispatchList.map((item, idx) => {
                const cond = item.matchedLabel.conditionFlag && PRODUCT_CONDITIONS[item.matchedLabel.conditionFlag];
                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white border border-[#141414] text-xs flex items-center justify-between gap-2 hover:border-amber-500 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-5 h-5 bg-[#141414] text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {totalBoxesCount - idx}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-extrabold text-[10px] bg-amber-300 text-[#141414] px-1.5 py-0.2 border border-[#141414]/30">
                            {item.matchedLabel.id}
                          </span>
                          <span className="font-bold text-[#141414] text-xs truncate">
                            {item.matchedLabel.productName}
                          </span>
                          {item.isSubstitution && (
                            <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 border border-black flex items-center gap-0.5 rounded-xs shadow-2xs">
                              <RefreshCw className="w-2.5 h-2.5 text-black" />
                              <span>SUSTITUCIÓN DE {item.substitutingForLabelId}</span>
                            </span>
                          )}
                          {cond ? (
                            <span className={`text-[9px] font-black px-1 py-0.2 uppercase border rounded ${cond.color}`}>
                              {cond.emoji} [{cond.code}]
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1 py-0.2 uppercase border rounded bg-emerald-100 text-emerald-950 border-emerald-400">
                              🟢 [A]
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#555] mt-0.5 font-sans">
                          Lote: <strong className="font-mono text-[#141414]">{item.matchedLabel.lot}</strong>
                          {item.matchedLabel.warehouse && (
                            <> | Cámara: <strong className="text-[#141414]">{item.matchedLabel.subWarehouse || item.matchedLabel.warehouse}</strong></>
                          )}
                          {item.matchedLabel.tareWeight && item.matchedLabel.tareWeight > 0 && (
                            <span className="ml-1 text-[10px] font-mono text-amber-950 bg-amber-100 px-1.5 py-0.2 border border-amber-300 font-bold inline-block">
                              Tara #{item.matchedLabel.tareNumber ?? ''}: -{item.matchedLabel.tareWeight.toFixed(2)} KG
                            </span>
                          )}
                        </p>
                        {item.isSubstitution && (
                          <div className="text-[10px] text-amber-950 bg-amber-50 border border-amber-300 px-2 py-0.5 mt-1 font-sans rounded-xs flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-amber-800 shrink-0" />
                            <span>
                              Reemplaza a: <strong>{item.substitutingForLabelId}</strong> ({item.substitutingForProductName || ''}). Motivo: <em>"{item.substitutionReason || 'Caja física no localizada en rack'}"</em>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-800 font-mono block">
                          {formatSafeWeight(item.matchedLabel.weight)} {item.matchedLabel.unit || 'KG'}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {formatSafeDate(item.scannedAt)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Quitar esta caja de la lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {dispatchList.length === 0 && (
                <div className="p-8 text-center bg-white border border-dashed border-[#141414] space-y-2">
                  <Barcode className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="font-bold text-xs text-[#141414] uppercase">
                    La lista de salida está vacía
                  </p>
                  <p className="text-[11px] text-gray-500 font-sans max-w-sm mx-auto">
                    Apunte la pistola lectora a las etiquetas de las cajas para añadirlas una a una. Podrá revisar el total de kilos antes de procesar la salida.
                  </p>
                </div>
              )}
            </div>

            {/* Action Button: Confirm & Discharge Everything with Consecutive Folio or Order Voucher */}
            <div className="pt-2 border-t border-[#141414]/20 space-y-2">
              {dispatchMode === 'orders' ? (
                <div className="space-y-2">
                  <button
                    disabled={!activeOrder || dispatchList.length === 0}
                    onClick={handleExecuteOrderDischarge}
                    className={`w-full py-3.5 px-4 font-black text-sm uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-md ${
                      activeOrder && dispatchList.length > 0
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-950 hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-amber-300" />
                    <span>
                      Confirmar Salida y Emitir Comprobante de Pedido ({totalBoxesCount} Cajas — {formatSafeWeight(totalWeightKg, 2)} KG)
                    </span>
                  </button>
                  <div className="bg-amber-50 border border-amber-300 p-2 rounded text-[11px] text-amber-950 font-sans text-center">
                    ⚠️ <strong>Control de Salida:</strong> Al hacer clic se descontarán las cajas del inventario en almacén y se abrirá el Comprobante Oficial con Telemarketing, Vendedor, Cliente y Horas.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    disabled={dispatchList.length === 0}
                    onClick={handleExecuteDischarge}
                    className={`w-full py-3.5 px-4 font-black text-sm uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-md ${
                      dispatchList.length > 0
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-950 hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Send className="w-4 h-4 text-amber-300" />
                    <span>
                      Generar Salida de Almacén Directa ({totalBoxesCount} Caja{totalBoxesCount !== 1 ? 's' : ''} — {formatSafeWeight(totalWeightKg, 2)} KG)
                    </span>
                    <span className="ml-1 bg-emerald-950 text-amber-300 px-2 py-0.5 text-xs font-mono border border-emerald-500/40">
                      {nextConsecutiveFolio}
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-gray-500 font-sans">
                    Al hacer clic se registrará el despacho en Firebase asignando el consecutivo <strong>{nextConsecutiveFolio}</strong> y descontando las cajas del stock activo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Discharges History */}
          <div className="bg-[#F8F7F4] border border-[#141414] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <h3 className="font-bold text-[#141414] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#141414]" />
                <span>Historial de Salidas Realizadas</span>
              </h3>
              <span className="text-[10px] font-bold bg-[#E4E3E0] px-2 py-0.5 border border-[#141414]/30">
                {discharges.length} registros
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {discharges.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 bg-white border border-[#141414] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300 text-[10px]">
                        {d.exitFolio || d.id}
                      </span>
                      <span className="font-mono text-cyan-800 text-[10px] font-bold">
                        [{d.labelId}]
                      </span>
                      <span className="font-bold text-[#141414]">{d.productName}</span>
                    </div>
                    <span className="font-black text-emerald-800 font-mono">
                      -{formatSafeWeight(d.weight)} {d.unit || 'KG'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#555] text-[10px] font-sans">
                    <span>Lote: <strong className="font-mono text-[#141414]">{d.lot}</strong> | {d.reason} | {d.scannedBy}</span>
                    <span className="font-mono">{formatSafeDate(d.timestamp)}</span>
                  </div>
                </div>
              ))}

              {discharges.length === 0 && (
                <div className="p-4 text-center text-[#888] text-xs">
                  Sin salidas registradas recientemente.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Exit Voucher Confirmation (Comprobante de Salida) */}
      {completedExitVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/80 p-4 font-mono">
          <div className="bg-[#F8F7F4] border-2 border-[#141414] w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Voucher */}
            <div className="flex items-start justify-between border-b-2 border-[#141414] pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-400 uppercase">
                  ✓ Salida Procesada Exitosamente
                </span>
                <h3 className="text-base font-black text-[#141414] uppercase mt-1">
                  Comprobante de Salida de Almacén
                </h3>
                <p className="text-[11px] text-gray-600 font-sans">
                  Mercancía descontada correctamente del inventario en frío.
                </p>
              </div>
              <button
                onClick={() => setCompletedExitVoucher(null)}
                className="p-1 hover:bg-[#E4E3E0] text-[#141414] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Details Card */}
            <div className="bg-white border border-[#141414] p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
                <span className="text-gray-500 uppercase font-sans text-[10px]">Folio Consecutivo:</span>
                <span className="font-black text-base text-emerald-800 tracking-wider">
                  {completedExitVoucher.exitFolio}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-[#141414]/10">
                <div>
                  <span className="text-gray-500 block font-sans text-[10px]">Fecha y Hora:</span>
                  <span className="font-bold text-[#141414]">{formatFullDateTime(completedExitVoucher.timestamp)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block font-sans text-[10px]">Motivo:</span>
                  <span className="font-bold text-[#141414]">{completedExitVoucher.reason}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-[#141414]/10">
                <div>
                  <span className="text-gray-500 block font-sans text-[10px]">Total Cajas Despachadas:</span>
                  <span className="font-black text-amber-700 text-sm">{completedExitVoucher.itemsCount} Cajas</span>
                </div>
                <div>
                  <span className="text-gray-500 block font-sans text-[10px]">Peso Total Despachado:</span>
                  <span className="font-black text-emerald-800 text-sm">{formatSafeWeight(completedExitVoucher.totalWeight)} KG</span>
                </div>
              </div>

              <div className="text-[11px] py-1">
                <span className="text-gray-500 block font-sans text-[10px]">Operador Responsable:</span>
                <span className="font-bold text-gray-800">{completedExitVoucher.operator}</span>
                {completedExitVoucher.notes && (
                  <p className="text-[10px] text-gray-600 mt-1 italic font-sans">
                    Notas: &quot;{completedExitVoucher.notes}&quot;
                  </p>
                )}
              </div>

              {/* Items Summary Table */}
              <div className="mt-2 pt-2 border-t border-[#141414]/20">
                <span className="text-[10px] font-bold text-gray-700 uppercase block mb-1">
                  Desglose de Cajas Incluidas:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {completedExitVoucher.records.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between text-[10px] p-1 bg-[#F8F7F4] border border-[#141414]/10">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-500 font-bold">#{i + 1}</span>
                        <span className="font-bold bg-amber-300 px-1 text-[9px]">{r.labelId}</span>
                        <span className="truncate">{r.productName}</span>
                      </div>
                      <span className="font-bold text-emerald-800 shrink-0 ml-2">
                        {formatSafeWeight(r.weight)} {r.unit || 'KG'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141414]/20">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-bold uppercase text-[#141414] border border-[#141414] bg-white hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-gray-700" />
                <span>Imprimir Comprobante</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletedExitVoucher(null);
                  setTimeout(focusGunInput, 30);
                }}
                className="px-5 py-2 bg-[#141414] text-amber-400 font-black text-xs uppercase hover:bg-[#282828] border border-[#141414] cursor-pointer"
              >
                Aceptar e Iniciar Nueva Salida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Multiple Barcodes Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/70 p-4 font-mono">
          <div className="bg-[#F8F7F4] border border-[#141414] w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-4">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#141414]" />
                Pegar Lista de Códigos de Barras
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1 hover:bg-[#E4E3E0] text-[#141414] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-[#555] font-sans">
              Ingrese o pegue varios códigos de barras o IDs de etiquetas (un código por línea). Se agregarán a la lista de revisión:
            </p>

            <textarea
              rows={6}
              value={batchPasteInput}
              onChange={(e) => setBatchPasteInput(e.target.value)}
              placeholder={`LBL-50957\np01001l220926w0218e270917\nLBL-73601`}
              className="w-full p-2 bg-white border border-[#141414] text-xs font-mono font-bold focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141414]/20">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 text-xs font-bold uppercase text-[#141414] border border-[#141414]/30 hover:bg-[#E4E3E0] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchPasteSubmit}
                className="px-4 py-1.5 bg-[#141414] text-amber-400 font-bold text-xs uppercase hover:bg-[#282828] border border-[#141414] cursor-pointer"
              >
                Añadir a la Lista
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal to correct/synchronize physical LBL */}
      {editingLabelIdTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
          <div className="bg-white border-2 border-amber-500 w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <h3 className="font-black text-sm uppercase text-gray-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>Sincronizar Folio LBL Físico</span>
              </h3>
              <button
                onClick={() => {
                  setEditingLabelIdTarget(null);
                  setEditFolioError('');
                }}
                className="text-gray-500 hover:text-black font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-950 space-y-1">
              <p><strong>Producto:</strong> {editingLabelIdTarget.productName}</p>
              <p><strong>Lote:</strong> {editingLabelIdTarget.lot} | <strong>Peso:</strong> {formatSafeWeight(editingLabelIdTarget.weight)} {editingLabelIdTarget.unit || 'KG'}</p>
              <p><strong>Folio Actual en Sistema:</strong> <span className="bg-amber-200 px-1 font-bold">{editingLabelIdTarget.id}</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase">
                Nuevo Folio LBL (Impreso en la Etiqueta Física):
              </label>
              <input
                type="text"
                value={newFolioInput}
                onChange={(e) => setNewFolioInput(e.target.value)}
                placeholder="Ej: LBL-76467 o 76467"
                className="w-full bg-white border-2 border-gray-900 p-2.5 text-sm font-black text-gray-900 focus:outline-hidden uppercase"
                autoFocus
              />
              <p className="text-[10px] text-gray-500 font-sans">
                * Ingrese el código exacto que tiene la caja físicamente. El sistema actualizará el registro para que coincidan 100% y no haya discrepancia.
              </p>
              {editFolioError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2 border border-red-200">
                  ⚠️ {editFolioError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setEditingLabelIdTarget(null);
                  setEditFolioError('');
                }}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUpdatedFolio}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase cursor-pointer shadow-sm"
              >
                Guardar y Sincronizar Folio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Substitution Candidate from Gun Scanner */}
      {pendingSubstitutionCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
          <div className="bg-white border-4 border-amber-500 w-full max-w-xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-400 text-black rounded-xs">
                  <RefreshCw className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-gray-900 leading-tight">
                    Registro de Sustitución en Almacén
                  </h3>
                  <span className="text-[10px] text-gray-600 font-sans block">
                    La caja escaneada no figuraba en la lista original del pedido {activeOrder?.internalFolio || activeOrder?.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setPendingSubstitutionCandidate(null);
                  setTimeout(focusGunInput, 30);
                }}
                className="text-gray-500 hover:text-black font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scanned Box Info */}
            <div className="bg-emerald-50 border-2 border-emerald-500 p-3 text-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800 block">
                ✓ Caja Física Escaneada en Almacén (Sustituta):
              </span>
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-mono font-black text-sm text-emerald-950">
                  {pendingSubstitutionCandidate.scannedBox.id} — {pendingSubstitutionCandidate.scannedBox.productName}
                </span>
                <span className="font-mono font-black text-sm bg-emerald-200 px-2 py-0.5 text-emerald-950">
                  {formatSafeWeight(pendingSubstitutionCandidate.scannedBox.weight)} {pendingSubstitutionCandidate.scannedBox.unit || 'KG'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-900 font-sans">
                Lote: <strong className="font-mono">{pendingSubstitutionCandidate.scannedBox.lot}</strong> | Cámara: {pendingSubstitutionCandidate.scannedBox.subWarehouse || pendingSubstitutionCandidate.scannedBox.warehouse}
              </div>
            </div>

            {/* Target original box picker */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-900 uppercase">
                Seleccione la Caja del Pedido que NO se encontró físicamente para sustituir:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(activeOrder?.items || [])
                  .filter(
                    (it) =>
                      !dispatchList.some((d) => d.matchedLabel.id === it.labelId) &&
                      !orderSubstitutions.some((s) => s.originalLabelId === it.labelId)
                  )
                  .map((it) => {
                    const isSelected = pendingSubstitutionCandidate.targetOriginalLabelId === it.labelId;
                    const diff = Number((pendingSubstitutionCandidate.scannedBox.weight - it.weight).toFixed(2));
                    const isSameProduct = it.productCode === pendingSubstitutionCandidate.scannedBox.productCode;
                    return (
                      <div
                        key={it.labelId}
                        onClick={() =>
                          setPendingSubstitutionCandidate((prev) =>
                            prev ? { ...prev, targetOriginalLabelId: it.labelId } : null
                          )
                        }
                        className={`p-2.5 border-2 text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 shadow-xs'
                            : 'border-gray-300 hover:border-gray-500 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-black">{it.labelId}</span>
                              <span className="font-bold text-gray-900">{it.productName}</span>
                              {isSameProduct && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-900 font-bold px-1 rounded-xs border border-emerald-400">
                                  Mismo Producto
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                              Lote solicitado: <strong className="font-mono">{it.lot}</strong> | Peso solicitado: <strong>{formatSafeWeight(it.weight)} KG</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-gray-500 block uppercase">Dif. Peso:</span>
                          <span
                            className={`text-xs font-mono font-black ${
                              diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-gray-900'
                            }`}
                          >
                            {diff >= 0 ? `+${formatSafeWeight(diff)}` : formatSafeWeight(diff)} KG
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Substitution reason */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-800 uppercase">
                Motivo / Justificación de la Sustitución:
              </label>
              <input
                type="text"
                value={pendingSubstitutionCandidate.reason}
                onChange={(e) =>
                  setPendingSubstitutionCandidate((prev) =>
                    prev ? { ...prev, reason: e.target.value } : null
                  )
                }
                placeholder="Ej: Caja física no localizada en rack / Sustitución por stock equivalente"
                className="w-full bg-white border border-gray-400 p-2 text-xs font-mono focus:outline-hidden"
              />
            </div>

            <div className="bg-amber-100/90 border border-amber-300 p-2 text-[10px] text-amber-950 font-sans flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                Al confirmar, la caja escaneada se descontará de inventario y la caja no encontrada <strong>volverá a quedar disponible en stock</strong> para inventario.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-300">
              <button
                type="button"
                onClick={() => {
                  setPendingSubstitutionCandidate(null);
                  setTimeout(focusGunInput, 30);
                }}
                className="px-3 py-2 text-xs font-bold uppercase bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer"
              >
                Cancelar Escaneo
              </button>
              <button
                type="button"
                onClick={handleConfirmPendingSubstitution}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Sustitución y Cargar a Salida</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual Substitution Picker from Stock */}
      {manualSubstitutionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
          <div className="bg-white border-4 border-amber-500 w-full max-w-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-400 text-black rounded-xs">
                  <RefreshCw className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-gray-900 leading-tight">
                    Sustituir Caja No Encontrada en Almacén
                  </h3>
                  <span className="text-[10px] text-gray-600 font-sans block">
                    Seleccione una caja disponible del inventario para reemplazar la caja que no se localizó
                  </span>
                </div>
              </div>
              <button
                onClick={() => setManualSubstitutionTarget(null)}
                className="text-gray-500 hover:text-black font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Original unfound box */}
            <div className="bg-rose-50 border-2 border-rose-400 p-3 text-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800 block">
                ❌ Caja Solicitada Original No Encontrada en Rack:
              </span>
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-mono font-black text-sm text-rose-950">
                  {manualSubstitutionTarget.originalItem.labelId} — {manualSubstitutionTarget.originalItem.productName}
                </span>
                <span className="font-mono font-black text-sm bg-rose-200 px-2 py-0.5 text-rose-950">
                  {formatSafeWeight(manualSubstitutionTarget.originalItem.weight)} {manualSubstitutionTarget.originalItem.unit || 'KG'}
                </span>
              </div>
              <div className="text-[11px] text-rose-900 font-sans">
                Lote: <strong className="font-mono">{manualSubstitutionTarget.originalItem.lot}</strong> | Código: {manualSubstitutionTarget.originalItem.productCode}
              </div>
            </div>

            {/* Stock search & filter */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-black text-gray-900 uppercase">
                  Seleccionar Caja Sustituta Disponible en Stock:
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualSubstitutionTarget.filterSameProductOnly}
                    onChange={(e) =>
                      setManualSubstitutionTarget((prev) =>
                        prev ? { ...prev, filterSameProductOnly: e.target.checked } : null
                      )
                    }
                    className="accent-amber-500"
                  />
                  <span>Solo mismo producto ({manualSubstitutionTarget.originalItem.productCode})</span>
                </label>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={manualSubstitutionTarget.searchQuery}
                  onChange={(e) =>
                    setManualSubstitutionTarget((prev) =>
                      prev ? { ...prev, searchQuery: e.target.value } : null
                    )
                  }
                  placeholder="Buscar por Folio LBL, lote, producto o peso..."
                  className="w-full bg-white border-2 border-gray-900 pl-8 pr-3 py-2 text-xs font-mono font-bold focus:outline-hidden"
                />
              </div>

              {/* List of available boxes */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {labels
                  .filter((l) => !l.isDischarged)
                  .filter((l) => !l.isReserved || l.reservationId === activeOrder?.id)
                  .filter((l) => !dispatchList.some((d) => d.matchedLabel.id === l.id))
                  .filter((l) => {
                    if (manualSubstitutionTarget.filterSameProductOnly) {
                      return l.productCode === manualSubstitutionTarget.originalItem.productCode;
                    }
                    return true;
                  })
                  .filter((l) => {
                    if (!manualSubstitutionTarget.searchQuery.trim()) return true;
                    const q = manualSubstitutionTarget.searchQuery.trim().toLowerCase();
                    return (
                      l.id.toLowerCase().includes(q) ||
                      l.productName.toLowerCase().includes(q) ||
                      l.productCode.toLowerCase().includes(q) ||
                      l.lot.toLowerCase().includes(q) ||
                      l.weight.toFixed(2).includes(q)
                    );
                  })
                  .map((l) => {
                    const isSelected = manualSubstitutionTarget.selectedReplacementId === l.id;
                    const diff = Number((l.weight - manualSubstitutionTarget.originalItem.weight).toFixed(2));
                    return (
                      <div
                        key={l.id}
                        onClick={() =>
                          setManualSubstitutionTarget((prev) =>
                            prev ? { ...prev, selectedReplacementId: l.id } : null
                          )
                        }
                        className={`p-2.5 border-2 text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 shadow-xs'
                            : 'border-gray-300 hover:border-gray-500 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-emerald-600 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-black bg-gray-100 px-1 border border-gray-300">
                                {l.id}
                              </span>
                              <span className="font-bold text-gray-900">{l.productName}</span>
                            </div>
                            <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                              Lote: <strong className="font-mono">{l.lot}</strong> | Cámara: {l.subWarehouse || l.warehouse}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-xs text-black block">
                            {formatSafeWeight(l.weight)} {l.unit || 'KG'}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-gray-600'
                            }`}
                          >
                            Dif: {diff >= 0 ? `+${formatSafeWeight(diff)}` : formatSafeWeight(diff)} KG
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-800 uppercase">
                Motivo / Justificación de la Sustitución:
              </label>
              <input
                type="text"
                value={manualSubstitutionTarget.reason}
                onChange={(e) =>
                  setManualSubstitutionTarget((prev) =>
                    prev ? { ...prev, reason: e.target.value } : null
                  )
                }
                placeholder="Ej: Caja física no localizada en rack / Sustitución por stock equivalente"
                className="w-full bg-white border border-gray-400 p-2 text-xs font-mono focus:outline-hidden"
              />
            </div>

            <div className="bg-amber-100/90 border border-amber-300 p-2 text-[10px] text-amber-950 font-sans flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                Al confirmar, la caja seleccionada se añadirá a la lista de salida y la caja original no encontrada ({manualSubstitutionTarget.originalItem.labelId}) cambiará su estatus a <strong>DISPONIBLE en stock</strong>.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-300">
              <button
                type="button"
                onClick={() => setManualSubstitutionTarget(null)}
                className="px-3 py-2 text-xs font-bold uppercase bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!manualSubstitutionTarget.selectedReplacementId}
                onClick={handleConfirmManualSubstitution}
                className={`px-4 py-2 text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-md ${
                  manualSubstitutionTarget.selectedReplacementId
                    ? 'bg-amber-400 hover:bg-amber-300 text-black'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Sustitución</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Order Dispatch Voucher Modal */}
      {selectedVoucherReservation && (
        <OrderDispatchVoucherModal
          reservation={selectedVoucherReservation}
          onClose={() => setSelectedVoucherReservation(null)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
};
