import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { SifproComingSoonModal } from './SifproComingSoonModal';
import { OrderDispatchVoucherModal } from './OrderDispatchVoucherModal';
import {
  TrendingUp,
  Package,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  BookmarkPlus,
  Truck,
  ArrowRight,
  Trash2,
  PhoneCall,
  Printer,
  Sparkles,
  FileText,
  MapPin,
  ShieldCheck,
  Building2,
  ChevronRight,
  Tag,
  Warehouse as WarehouseIcon,
  Check,
  Layers,
  ShoppingBag,
  FlaskConical,
  Lock,
  AlertTriangle,
  Database,
  Settings,
  RefreshCw,
} from 'lucide-react';
import {
  PrintedLabel,
  MarketReservation,
  MarketOrderType,
  ReservationStatus,
  Warehouse,
  PRODUCT_CONDITIONS,
  SifproInventoryRecord,
  TelemarketingCancellationRecord,
} from '../types';
import { ConfirmDialog, ConfirmDialogState } from './ConfirmDialog';
import { isRootUser } from './Header';

// Helper functions for time formatting
function formatTimeOfDay(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

function formatFullDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dateStr} — ${timeStr}`;
  } catch {
    return isoString;
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h ${diffMins % 60} min`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  } catch {
    return '';
  }
}

export interface Phase4MarketDevelopmentProps {
  defaultSource?: 'non_conforming' | 'sifpro' | 'pnc';
}

export const Phase4MarketDevelopment: React.FC<Phase4MarketDevelopmentProps> = ({ defaultSource = 'non_conforming' }) => {
  const {
    labels,
    products,
    reservations,
    subWarehouses,
    categories,
    systemUsers,
    activeUser,
    addMarketReservation,
    updateMarketReservationStatus,
    cancelMarketReservation,
    deleteCancellationRecord,
    deleteMarketReservation,
    updateSifproRecords,
    cancellationRecords,
    sifproRecords,
    isMarketReleased,
    marketSettings,
    toggleMarketRelease,
    updateMarketSettings,
  } = useInventory();

  // Permission checks: Telemarketing, Market Developers, Root, Sistemas, and Almacén can all access Phase 4
  const isDeveloperAllowed = useMemo(() => {
    if (!activeUser) return false;
    return true;
  }, [activeUser]);

  // Telemarketing panel is restricted: Desarrollador de Mercado and Jefe de Ventas CANNOT access Telemarketing panel
  const isTelemarketingAllowed = useMemo(() => {
    if (!activeUser) return false;
    if (isRootUser(activeUser)) return true;
    if (activeUser.role === 'Sistemas') return true;
    if (activeUser.role === 'Telemarketing') return true;
    if (activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas') {
      return false;
    }
    return false;
  }, [activeUser]);

  // Top Sub-Module Division State: 'developer' | 'telemarketing'
  const [mainSubModule, setMainSubModule] = useState<'developer' | 'telemarketing'>(() => {
    if (activeUser?.role === 'Telemarketing') return 'telemarketing';
    return 'developer';
  });

  // Telemarketing active sub-tab: 'orders' | 'cancellations'
  const [telemarketingTab, setTelemarketingTab] = useState<'orders' | 'cancellations'>('orders');

  // Cancellation Modal States
  const [cancellingReservation, setCancellingReservation] = useState<MarketReservation | null>(null);
  const [cancellationReasonSelect, setCancellationReasonSelect] = useState<string>('Cliente canceló o rechazó el pedido');
  const [cancellationReasonCustom, setCancellationReasonCustom] = useState<string>('');
  const [cancellationNotesText, setCancellationNotesText] = useState<string>('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState<boolean>(false);

  // Cancellation Audit Log Filters
  const [cancellationSearchTerm, setCancellationSearchTerm] = useState<string>('');
  const [cancellationDeveloperFilter, setCancellationDeveloperFilter] = useState<string>('ALL');
  const [cancellationSourceFilter, setCancellationSourceFilter] = useState<'ALL' | 'PEDIDO_VENTA' | 'SOLICITUD_MUESTRA'>('ALL');
  const [selectedCancellationRecordModal, setSelectedCancellationRecordModal] = useState<TelemarketingCancellationRecord | null>(null);

  // Approval Modal for PNC (Internal reference / folio)
  const [approvingReservation, setApprovingReservation] = useState<MarketReservation | null>(null);
  const [pncInternalFolioInput, setPncInternalFolioInput] = useState<string>('');
  
  // PNC Inventory Dispatch Confirmation Modal
  const [dispatchingReservation, setDispatchingReservation] = useState<MarketReservation | null>(null);
  const [pncExitFolioInput, setPncExitFolioInput] = useState<string>('');
  const [viewingVoucherReservation, setViewingVoucherReservation] = useState<MarketReservation | null>(null);
  
  // SIFPRO Coming Soon Modal state (for inactive SIFPRO notice)
  const [isSifproNoticeModalOpen, setIsSifproNoticeModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Operational Inventory Source (Fixed exclusively to Producto No Conformante; SIFPRO is inactive)
  const [inventorySource, setInventorySource] = useState<'non_conforming' | 'sifpro'>('non_conforming');

  // Active view tab inside Developer Sub-Module
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'reservations'>('stock');

  // Distinct Filter for Pedidos vs Solicitudes in Developer and Telemarketing
  const [orderTypeSelection, setOrderTypeSelection] = useState<MarketOrderType>('PEDIDO_VENTA');
  const [developerTypeFilter, setDeveloperTypeFilter] = useState<'ALL' | MarketOrderType>('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'ALL' | MarketOrderType>('ALL');

  // Search and filter states for Available Stock
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubWarehouse, setSelectedSubWarehouse] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'labels' | 'grouped'>('labels');

  // Selection state for reserving items
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // Active market reservations (not cancelled)
  const activeReservations = useMemo(() => {
    return reservations.filter((r) => r.status !== 'CANCELADO');
  }, [reservations]);

  // Calculate reserved Label IDs from active market reservations and label flags
  const reservedLabelIds = useMemo(() => {
    const idsFromReservations = activeReservations.flatMap((r) => r.labelIds || []);
    const idsFromLabels = labels.filter((l) => l.isReserved).map((l) => l.id);
    return Array.from(new Set([...idsFromReservations, ...idsFromLabels]));
  }, [activeReservations, labels]);

  // Reservation Form Modal / Panel State
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [developerName, setDeveloperName] = useState('');
  const [clientOrEvent, setClientOrEvent] = useState('');
  const [reason, setReason] = useState<MarketReservation['reason']>('Venta Directa');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Status, Zone & Developer Filters for Telemarketing
  const [reservationStatusFilter, setReservationStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [selectedDeveloperFilter, setSelectedDeveloperFilter] = useState<string>('ALL');

  // Telemarketing Chronological Sort Mode
  const [telemarketingSort, setTelemarketingSort] = useState<'latest_first' | 'oldest_first' | 'by_developer'>('latest_first');

  // Scope filter for Telemarketing in "Mis Solicitudes" ('all' or 'my_orders')
  const [telemarketingScope, setTelemarketingScope] = useState<'all' | 'my_orders'>('all');

  // Printable Ticket Slip Modal State
  const [selectedTicketReservation, setSelectedTicketReservation] = useState<MarketReservation | null>(null);

  // Auto set defaults based on activeUser safely without overriding manual tab selections
  const lastActiveUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeUser) {
      const isNewUser = lastActiveUserIdRef.current !== activeUser.id;
      lastActiveUserIdRef.current = activeUser.id;

      if (activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas') {
        // Strict protection: Desarrollador and Jefe de Ventas can never access telemarketing panel
        setMainSubModule('developer');
        setDeveloperName(activeUser.name);
      } else if (activeUser.role === 'Telemarketing') {
        setDeveloperName(activeUser.name);
        if (isNewUser) {
          // On login or user switch, set defaults but DO NOT force back on each render/tab change
          if (activeUser.assignedZone) {
            setSelectedZoneFilter(activeUser.assignedZone);
          }
        }
      } else if (!isTelemarketingAllowed && mainSubModule === 'telemarketing') {
        setMainSubModule('developer');
      }
    }
  }, [activeUser, isTelemarketingAllowed, mainSubModule]);

  // Common market developer presets
  const DEVELOPER_PRESETS = [
    'Lic. Fernando Morales (EMP-1001)',
    'Carlos M. Hinojosa (EMP-1002)',
    'María Gómez - Dev. Mercado Centro',
    'Juan Pablo Pérez - Ejecutivo Cuentas Clave',
  ];

  // Filter EXCLUSIVELY AVAILABLE STOCK (labels not discharged)
  const availableLabels = useMemo(() => {
    return labels.filter((l) => !l.isDischarged);
  }, [labels]);

  // Apply search and dropdown filters for stock
  const filteredLabels = useMemo(() => {
    return availableLabels.filter((lbl) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        lbl.productName.toLowerCase().includes(term) ||
        lbl.productCode.toLowerCase().includes(term) ||
        lbl.lot.toLowerCase().includes(term) ||
        lbl.id.toLowerCase().includes(term) ||
        (lbl.reservedBy && lbl.reservedBy.toLowerCase().includes(term));

      const matchWh = selectedWarehouse === 'ALL' || lbl.warehouse === selectedWarehouse;
      const matchCat = selectedCategory === 'ALL' || lbl.category === selectedCategory;
      const matchSubWh = selectedSubWarehouse === 'ALL' || lbl.subWarehouse === selectedSubWarehouse;

      return matchSearch && matchWh && matchCat && matchSubWh;
    });
  }, [availableLabels, searchTerm, selectedWarehouse, selectedCategory, selectedSubWarehouse]);

  // Grouped Stock Summary by Product
  const groupedStock = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productCode: string;
        productName: string;
        category: string;
        warehouse: string;
        totalWeight: number;
        unit: string;
        totalPackages: number;
        availablePackages: number;
        reservedPackages: number;
        labelIds: string[];
      }
    >();

    filteredLabels.forEach((lbl) => {
      const isReserved = lbl.isReserved || reservedLabelIds.includes(lbl.id);
      const key = `${lbl.productCode}-${lbl.warehouse}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalWeight += lbl.weight;
        existing.totalPackages += 1;
        if (isReserved) {
          existing.reservedPackages += 1;
        } else {
          existing.availablePackages += 1;
        }
        existing.labelIds.push(lbl.id);
      } else {
        map.set(key, {
          productId: lbl.productId,
          productCode: lbl.productCode,
          productName: lbl.productName,
          category: lbl.category,
          warehouse: lbl.warehouse,
          totalWeight: lbl.weight,
          unit: lbl.unit,
          totalPackages: 1,
          availablePackages: isReserved ? 0 : 1,
          reservedPackages: isReserved ? 1 : 0,
          labelIds: [lbl.id],
        });
      }
    });

    return Array.from(map.values());
  }, [filteredLabels]);

  // Total summary metrics for stock (Producto No Conformante)
  const totalStockKg = useMemo(() => {
    return availableLabels.reduce((acc, l) => acc + l.weight, 0);
  }, [availableLabels]);

  const totalReservedKg = useMemo(() => {
    return availableLabels.filter((l) => l.isReserved).reduce((acc, l) => acc + l.weight, 0);
  }, [availableLabels]);

  const totalAvailableUnreservedKg = useMemo(() => {
    return availableLabels.filter((l) => !l.isReserved).reduce((acc, l) => acc + l.weight, 0);
  }, [availableLabels]);

  // Helper to distinguish Pedidos de Venta from Solicitudes de Muestras (Producto No Conforme)
  const isOrder = useCallback((r: MarketReservation) => {
    if (r.orderType === 'PEDIDO_VENTA') return true;
    if (r.orderType === 'SOLICITUD_MUESTRA') return false;
    return (
      r.reason === 'Reserva Venta Especial' ||
      r.reason === 'Venta Directa' ||
      r.reason === 'Apartado Comercial' ||
      r.reason === 'Pedido Programado' ||
      (Boolean(r.id) && r.id.startsWith('PED-')) ||
      (Boolean(r.internalFolio) && r.internalFolio.startsWith('PED-'))
    );
  }, []);

  const pncPedidos = useMemo(() => {
    return reservations.filter((r) => isOrder(r));
  }, [reservations, isOrder]);

  const pncSolicitudes = useMemo(() => {
    return reservations.filter((r) => !isOrder(r));
  }, [reservations, isOrder]);

  const pncPedidosWeight = useMemo(() => {
    return pncPedidos.reduce((acc, r) => acc + (r.totalWeight || 0), 0);
  }, [pncPedidos]);

  const pncSolicitudesWeight = useMemo(() => {
    return pncSolicitudes.reduce((acc, r) => acc + (r.totalWeight || 0), 0);
  }, [pncSolicitudes]);

  // User profile base reservations for "2. Mis Solicitudes"
  const userBaseReservations = useMemo(() => {
    if (!activeUser) return reservations;
    if (activeUser.role === 'Desarrollador de Mercado') {
      const devNameLower = activeUser.name.toLowerCase();
      return reservations.filter((r) => {
        const rName = (r.developerName || '').toLowerCase();
        return rName.includes(devNameLower) || devNameLower.includes(rName);
      });
    }
    if (activeUser.role === 'Telemarketing') {
      if (telemarketingScope === 'my_orders') {
        const userNameLower = activeUser.name.toLowerCase();
        return reservations.filter((r) => {
          const rName = (r.developerName || '').toLowerCase();
          const rRole = (r.developerRole || '').toLowerCase();
          return rName.includes(userNameLower) || rRole.includes('telemarketing');
        });
      }
      return reservations;
    }
    return reservations;
  }, [reservations, activeUser, telemarketingScope]);

  const userPedidosCount = useMemo(() => {
    return userBaseReservations.filter((r) => isOrder(r)).length;
  }, [userBaseReservations, isOrder]);

  const userSolicitudesCount = useMemo(() => {
    return userBaseReservations.filter((r) => !isOrder(r)).length;
  }, [userBaseReservations, isOrder]);

  const myTelemarketingOrdersCount = useMemo(() => {
    if (!activeUser) return 0;
    const userNameLower = activeUser.name.toLowerCase();
    return reservations.filter((r) => {
      const rName = (r.developerName || '').toLowerCase();
      const rRole = (r.developerRole || '').toLowerCase();
      return rName.includes(userNameLower) || rRole.includes('telemarketing');
    }).length;
  }, [reservations, activeUser]);

  // Filtered reservations for display in "2. Mis Solicitudes"
  const displayedDeveloperReservations = useMemo(() => {
    let list = userBaseReservations;
    if (developerTypeFilter === 'PEDIDO_VENTA') {
      list = list.filter((r) => isOrder(r));
    } else if (developerTypeFilter === 'SOLICITUD_MUESTRA') {
      list = list.filter((r) => !isOrder(r));
    }
    return list;
  }, [userBaseReservations, developerTypeFilter, isOrder]);

  // Selection state helpers - Prevent selecting reserved labels
  const toggleSelectLabel = (labelId: string) => {
    if (reservedLabelIds.includes(labelId)) {
      return;
    }
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const selectAllFilteredUnreserved = () => {
    const unreservedIds = filteredLabels
      .filter((l) => !l.isReserved && !reservedLabelIds.includes(l.id))
      .map((l) => l.id);
    setSelectedLabelIds(unreservedIds);
  };

  const clearSelection = () => {
    setSelectedLabelIds([]);
  };

  // Open reservation modal specifically for Pedido de Venta or Solicitud de Muestras
  const handleOpenReserveModal = (type: MarketOrderType = 'PEDIDO_VENTA') => {
    if (selectedLabelIds.length === 0) {
      alert('Debe seleccionar al menos una caja disponible de Producto No Conforme.');
      return;
    }

    const alreadyReserved = selectedLabelIds.filter((id) => reservedLabelIds.includes(id));
    if (alreadyReserved.length > 0) {
      const remaining = selectedLabelIds.filter((id) => !reservedLabelIds.includes(id));
      setSelectedLabelIds(remaining);
      if (remaining.length === 0) {
        alert('⚠️ Todas las cajas seleccionadas ya han sido apartadas por otro desarrollador o telemarketing.');
        return;
      } else {
        alert(`⚠️ Se retiraron ${alreadyReserved.length} caja(s) que ya fueron apartadas por otro usuario.`);
      }
    }

    setOrderTypeSelection(type);
    if (type === 'PEDIDO_VENTA') {
      setReason('Venta Directa');
    } else {
      setReason('Muestreo / Degustación');
    }

    if (activeUser?.role === 'Desarrollador de Mercado') {
      setDeveloperName(activeUser.name);
    } else if (!developerName && activeUser) {
      setDeveloperName(activeUser.name);
    }
    setIsReserveModalOpen(true);
  };

  const selectedLabels = useMemo(() => {
    return availableLabels.filter((l) => selectedLabelIds.includes(l.id));
  }, [availableLabels, selectedLabelIds]);

  const selectedTotalWeight = useMemo(() => {
    return selectedLabels.reduce((acc, l) => acc + l.weight, 0);
  }, [selectedLabels]);

  // Handle Reservation Submission (Strictly Producto No Conforme, separated into Pedido or Solicitud)
  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const isMarketDev = activeUser?.role === 'Desarrollador de Mercado';
    const isTelemarketingUser = activeUser?.role === 'Telemarketing';

    const finalDevName = isMarketDev
      ? (activeUser?.name || 'Desarrollador')
      : isTelemarketingUser
      ? (developerName.trim() || activeUser?.name || 'Telemarketing')
      : developerName.trim();

    const finalDevZone = isMarketDev
      ? (activeUser?.assignedZone || 'Zona Norte')
      : isTelemarketingUser
      ? (activeUser?.assignedZone || 'Zona Norte')
      : (activeUser?.assignedZone || 'Zona Norte');

    const finalDevRole = isMarketDev
      ? 'Desarrollador de Mercado'
      : isTelemarketingUser
      ? (developerName.trim() && developerName !== activeUser?.name ? 'Desarrollador de Mercado' : 'Telemarketing')
      : (activeUser?.role || 'Desarrollador de Mercado');

    if (!finalDevName) {
      alert('Por favor ingrese el nombre del Solicitante o Desarrollador.');
      return;
    }
    if (!clientOrEvent.trim()) {
      alert('Por favor ingrese el Cliente, Evento o Proyecto de destino.');
      return;
    }

    if (selectedLabels.length === 0) {
      alert('Debe seleccionar al menos un paquete o caja de Producto No Conforme.');
      return;
    }

    const itemsSummary = selectedLabels.map((lbl) => ({
      labelId: lbl.id,
      productCode: lbl.productCode,
      productName: lbl.productName,
      lot: lbl.lot,
      weight: lbl.weight,
      unit: lbl.unit,
      warehouse: lbl.warehouse,
      subWarehouse: lbl.subWarehouse,
    }));

    const prefix = orderTypeSelection === 'PEDIDO_VENTA' ? 'PED' : 'SOL';
    const uniqueFolio = `${prefix}-PNC-${Date.now().toString().slice(-5)}`;

    addMarketReservation({
      orderType: orderTypeSelection,
      internalFolio: uniqueFolio,
      developerName: finalDevName,
      developerRole: finalDevRole,
      developerZone: finalDevZone,
      clientOrEvent: clientOrEvent.trim(),
      reason,
      requiredDate: requiredDate || undefined,
      notes: notes.trim() || undefined,
      labelIds: selectedLabelIds,
      items: itemsSummary,
      totalWeight: selectedTotalWeight,
      totalItems: selectedLabelIds.length,
    });

    const typeLabel = orderTypeSelection === 'PEDIDO_VENTA' ? 'Pedido de Venta' : 'Solicitud de Muestras';
    setFormSuccessMessage(`¡${typeLabel} (${uniqueFolio}) registrado exitosamente a las ${formatTimeOfDay(new Date().toISOString())} hrs para ${clientOrEvent}! ${selectedLabelIds.length} caja(s) registradas.`);

    // Clear selection
    setSelectedLabelIds([]);
    setIsReserveModalOpen(false);

    // After creation: keep user on Mis Solicitudes so they can inspect and verify their order
    setTimeout(() => {
      setMainSubModule('developer');
      setActiveSubTab('reservations');
      setFormSuccessMessage(null);
    }, 2200);
  };

  // Filtered & Chronologically Sorted Telemarketing Reservations List (Producto No Conformante)
  const telemarketingReservations = useMemo(() => {
    const list = reservations.filter((r) => {
      // Type filter (Pedidos de Venta vs Solicitudes de Muestras)
      if (orderTypeFilter !== 'ALL') {
        const orderMatches = isOrder(r);
        if (orderTypeFilter === 'PEDIDO_VENTA' && !orderMatches) return false;
        if (orderTypeFilter === 'SOLICITUD_MUESTRA' && orderMatches) return false;
      }

      // Status filter
      const matchStatus = reservationStatusFilter === 'ALL' || r.status === reservationStatusFilter;

      // Zone filter
      const matchZone =
        selectedZoneFilter === 'ALL' ||
        !r.developerZone ||
        r.developerZone === selectedZoneFilter;

      // Developer filter
      const matchDev =
        selectedDeveloperFilter === 'ALL' ||
        r.developerName.toLowerCase().includes(selectedDeveloperFilter.toLowerCase());

      // Text Search
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        r.developerName.toLowerCase().includes(term) ||
        r.clientOrEvent.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        (r.internalFolio && r.internalFolio.toLowerCase().includes(term)) ||
        r.reason.toLowerCase().includes(term) ||
        r.items.some((i) => i.productName.toLowerCase().includes(term) || i.productCode.toLowerCase().includes(term));

      return matchStatus && matchZone && matchDev && matchSearch;
    });

    // Apply Chronological Sorting according to selected mode
    return list.sort((a, b) => {
      const timeA = new Date(a.reservationDate).getTime();
      const timeB = new Date(b.reservationDate).getTime();

      if (telemarketingSort === 'latest_first') {
        return timeB - timeA; // Most recent first
      } else if (telemarketingSort === 'oldest_first') {
        return timeA - timeB; // Oldest first (priority queue)
      } else {
        // By Developer name then time
        const devCompare = a.developerName.localeCompare(b.developerName);
        if (devCompare !== 0) return devCompare;
        return timeB - timeA;
      }
    });
  }, [reservations, orderTypeFilter, isOrder, reservationStatusFilter, selectedZoneFilter, selectedDeveloperFilter, searchTerm, telemarketingSort]);

  // Unique list of Developers for Filter Dropdown
  const uniqueDevelopers = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => {
      if (r.developerName) set.add(r.developerName);
    });
    cancellationRecords.forEach((c) => {
      if (c.developerName) set.add(c.developerName);
    });
    return Array.from(set);
  }, [reservations, cancellationRecords]);

  // Filtered cancellation records for audit log view
  const filteredCancellationRecords = useMemo(() => {
    return cancellationRecords.filter((rec) => {
      const matchSource =
        cancellationSourceFilter === 'ALL' ||
        rec.sourceType === cancellationSourceFilter ||
        (cancellationSourceFilter === 'PEDIDO_VENTA' && (
          rec.sourceType === 'PEDIDO_VENTA' ||
          rec.reservationId.startsWith('PED-') ||
          rec.cancellationReason.toLowerCase().includes('pedido')
        )) ||
        (cancellationSourceFilter === 'SOLICITUD_MUESTRA' && (
          rec.sourceType === 'SOLICITUD_MUESTRA' ||
          rec.reservationId.startsWith('SOL-') ||
          rec.cancellationReason.toLowerCase().includes('muestra')
        ));

      const matchDev =
        cancellationDeveloperFilter === 'ALL' ||
        rec.developerName.toLowerCase().includes(cancellationDeveloperFilter.toLowerCase());

      const term = cancellationSearchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        rec.id.toLowerCase().includes(term) ||
        rec.reservationId.toLowerCase().includes(term) ||
        rec.clientOrEvent.toLowerCase().includes(term) ||
        rec.developerName.toLowerCase().includes(term) ||
        rec.cancellationReason.toLowerCase().includes(term) ||
        rec.cancelledBy.toLowerCase().includes(term) ||
        rec.itemsSummary.toLowerCase().includes(term);

      return matchSource && matchDev && matchSearch;
    }).sort((a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime());
  }, [cancellationRecords, cancellationSourceFilter, cancellationDeveloperFilter, cancellationSearchTerm]);

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingReservation) return;

    const finalReason =
      cancellationReasonSelect === 'Otra razón (Especificar a continuación)'
        ? cancellationReasonCustom.trim() || 'Otra razón no especificada'
        : cancellationReasonSelect;

    if (!finalReason) {
      alert('Por favor especifique el motivo de cancelación.');
      return;
    }

    setIsSubmittingCancellation(true);
    try {
      const actionBy = activeUser
        ? `${activeUser.name} (${activeUser.role || 'Telemarketing'})`
        : 'Telemarketing';

      await cancelMarketReservation(
        cancellingReservation.id,
        finalReason,
        cancellationNotesText,
        actionBy
      );

      setCancellingReservation(null);
      setCancellationReasonSelect('Cliente canceló o rechazó el pedido');
      setCancellationReasonCustom('');
      setCancellationNotesText('');
    } catch (err) {
      console.error('Error cancelling market reservation:', err);
      alert('Ocurrió un error al procesar la cancelación.');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP HEADER MODULE NAVIGATION */}
      <div className="bg-[#1C1C1A] border border-[#3A3A36] text-white p-4 rounded-xs shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-400 text-[#141414] font-black flex items-center justify-center rounded-xs shrink-0 shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono font-black text-lg text-white uppercase tracking-tight">
                  DESARROLLO DE MERCADO & TELEMARKETING
                </h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-500/50 text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider font-bold rounded-xs">
                  SISTEMA DE PEDIDOS POR HORA DE ALTA
                </span>
              </div>
              <p className="font-mono text-xs text-[#A0A09C] mt-0.5">
                Plataforma dual para la solicitud de muestras/pedidos por Desarrolladores y monitoreo en lista cronológica para Telemarketing.
              </p>
            </div>
          </div>

          {/* MAIN THREE SUB-MODULE / ACTION TABS */}
          <div className="flex flex-wrap items-center bg-[#10100E] p-1 border border-[#3A3A36] rounded-xs font-mono text-xs shrink-0 gap-1">
            <button
              type="button"
              onClick={() => {
                setMainSubModule('developer');
                setActiveSubTab('stock');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xs font-bold transition-all cursor-pointer ${
                mainSubModule === 'developer' && activeSubTab === 'stock'
                  ? 'bg-amber-400 text-[#141414] shadow-sm font-black'
                  : 'text-[#A0A09C] hover:text-white hover:bg-[#242422]'
              }`}
            >
              <Search className="w-4 h-4 text-black" />
              <span>1. Explorar Inventario</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMainSubModule('developer');
                setActiveSubTab('reservations');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xs font-bold transition-all cursor-pointer ${
                mainSubModule === 'developer' && activeSubTab === 'reservations'
                  ? 'bg-amber-400 text-[#141414] shadow-sm font-black'
                  : 'text-[#A0A09C] hover:text-white hover:bg-[#242422]'
              }`}
            >
              <BookmarkPlus className="w-4 h-4 text-amber-500" />
              <span>2. Mis Solicitudes ({userBaseReservations.length})</span>
            </button>

            {isTelemarketingAllowed && (
              <button
                type="button"
                onClick={() => setMainSubModule('telemarketing')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xs font-bold transition-all cursor-pointer relative ${
                  mainSubModule === 'telemarketing'
                    ? 'bg-purple-600 text-white shadow-sm font-black'
                    : 'text-[#A0A09C] hover:text-white hover:bg-[#242422]'
                }`}
              >
                <PhoneCall className="w-4 h-4 text-purple-200" />
                <span>3. Monitoreo Telemarketing</span>
                {reservations.filter((r) => r.status === 'PENDIENTE').length > 0 && (
                  <span className="bg-amber-400 text-black font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                    {reservations.filter((r) => r.status === 'PENDIENTE').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODULE STATUS & INVENTORY SELECTION BAR */}
      <div className="bg-[#1D1D1B] p-2.5 border-2 border-[#3A3A36] rounded-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-mono shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-400 text-[#141414] font-black text-xs uppercase tracking-wider rounded-xs border border-amber-500 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-[#141414]" />
            <span>Módulo Operativo Activo: Producto No Conforme (PNC)</span>
          </div>

          {/* SIFPRO Inactive / Coming Soon Button */}
          <button
            type="button"
            onClick={() => setIsSifproNoticeModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#252522] hover:bg-[#30302C] text-gray-400 hover:text-cyan-300 border border-[#444] rounded-xs font-bold text-xs uppercase tracking-wider transition-all cursor-pointer group"
            title="Módulo SIFPRO inactivo actualmente (En desarrollo futuro)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:text-cyan-400" />
            <span className="text-gray-400 group-hover:text-cyan-200">2. SIFPRO</span>
            <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.2 rounded font-black">
              Inactivo - Próximamente
            </span>
          </button>
        </div>

        <div className="text-[11px] text-[#A0A09C] flex items-center gap-2 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            {mainSubModule === 'telemarketing'
              ? 'Atendiendo: Pedidos y Solicitudes de Producto No Conforme (PNC)'
              : 'Gestión Comercial: Catálogo de Producto No Conforme (PNC)'}
          </span>
        </div>
      </div>

      {/* Global Summary Metric Cards (EXCLUSIVAMENTE PRODUCTO NO CONFORMANTE) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        {/* Card 1: Existencia Total PNC */}
        <div className="bg-[#141414] p-2.5 border border-[#2A2A28] rounded-xs shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-[#A0A09C] font-semibold">
              Existencia Total Almacén
            </p>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-900/80 text-amber-200 border border-amber-500/60">
              PNC ALMACÉN
            </span>
          </div>
          <p className="text-base font-bold text-white mt-0.5">
            {totalStockKg.toFixed(1)} KG
          </p>
          <p className="text-[10px] text-gray-400">
            {availableLabels.length} cajas en inventario
          </p>
        </div>

        {/* Card 2: Disponible para Muestras / Venta PNC */}
        <div className="bg-[#141414] p-2.5 border border-[#2A2A28] rounded-xs shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-emerald-400 font-semibold">
              Disponible sin Apartar
            </p>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-500/60">
              STOCK LIBRE
            </span>
          </div>
          <p className="text-base font-bold text-emerald-400 mt-0.5">
            {totalAvailableUnreservedKg.toFixed(1)} KG
          </p>
          <p className="text-[10px] text-emerald-300/70">
            {availableLabels.filter((l) => !l.isReserved).length} cajas sin apartar
          </p>
        </div>

        {/* Card 3: Pedidos de Venta PNC (Total) */}
        <div className="bg-[#141414] p-2.5 border border-[#2A2A28] rounded-xs shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-amber-400 font-semibold flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-amber-400" />
              <span>Pedidos de Venta</span>
            </p>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/60">
              VENTA PNC
            </span>
          </div>
          <p className="text-base font-bold text-amber-300 mt-0.5">
            {pncPedidos.length} Pedido{pncPedidos.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-amber-300/70">
            {pncPedidosWeight.toFixed(1)} KG apartados
          </p>
        </div>

        {/* Card 4: Solicitudes de Muestras PNC */}
        <div className="bg-[#141414] p-2.5 border border-[#2A2A28] rounded-xs shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-cyan-400 font-semibold flex items-center gap-1">
              <BookmarkPlus className="w-3 h-3 text-cyan-400" />
              <span>Solicitudes Muestras</span>
            </p>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-600/60">
              MUESTRAS PNC
            </span>
          </div>
          <p className="text-base font-bold text-cyan-300 mt-0.5">
            {pncSolicitudes.length} Solicitud{pncSolicitudes.length !== 1 ? 'es' : ''}
          </p>
          <p className="text-[10px] text-cyan-300/70">
            {pncSolicitudesWeight.toFixed(1)} KG solicitados
          </p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {formSuccessMessage && (
        <div className="bg-emerald-900/90 border-2 border-emerald-500 text-emerald-100 p-3.5 rounded-xs font-mono text-xs flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{formSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormSuccessMessage(null)}
            className="text-emerald-300 hover:text-white font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 1: MÓDULO DESARROLLADOR DE MERCADO (PRODUCTO NO CONFORME)     */}
      {/* ==================================================================== */}
      {mainSubModule === 'developer' && (
        <div className="space-y-4">
          {/* Sub-tab navigation for developer */}
          <div className="bg-white p-3 border border-[#D4D3D0] rounded-xs shadow-xs flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className={`${activeUser?.role === 'Telemarketing' ? 'bg-purple-600 text-white' : 'bg-amber-400 text-black'} font-extrabold px-2 py-0.5 rounded text-[10px] uppercase`}>
                {activeUser?.role === 'Telemarketing' ? '📞 Telemarketing' : '🛍️ Desarrollador'}
              </span>
              <span className="font-bold text-gray-800 uppercase">
                {activeUser ? `Colaborador: ${activeUser.name} (${activeUser.assignedZone || 'General'})` : 'Captura de Pedidos'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveSubTab('stock')}
                className={`px-3 py-1.5 rounded-xs font-bold cursor-pointer text-xs border ${
                  activeSubTab === 'stock'
                    ? 'bg-[#141414] text-white border-[#141414]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                📦 1. Explorar Inventario ({availableLabels.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('reservations')}
                className={`px-3 py-1.5 rounded-xs font-bold cursor-pointer text-xs border ${
                  activeSubTab === 'reservations'
                    ? 'bg-[#141414] text-white border-[#141414]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                📋 2. Mis Solicitudes ({userBaseReservations.length})
              </button>
              {isTelemarketingAllowed && (
                <button
                  type="button"
                  onClick={() => setMainSubModule('telemarketing')}
                  className="px-3 py-1.5 rounded-xs font-bold cursor-pointer text-xs bg-purple-700 hover:bg-purple-800 text-white border border-purple-800 flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Ir al panel de Monitoreo Telemarketing"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-purple-200" />
                  <span>3. Monitoreo Telemarketing</span>
                  {reservations.filter((r) => r.status === 'PENDIENTE').length > 0 && (
                    <span className="bg-amber-400 text-black font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                      {reservations.filter((r) => r.status === 'PENDIENTE').length}
                    </span>
                  )}
                </button>
              )}
              {activeUser?.role === 'Jefe de Ventas' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => toggleMarketRelease(!isMarketReleased)}
                    className={`px-3 py-1.5 rounded-xs font-bold cursor-pointer text-xs border ${
                      isMarketReleased
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                        : 'bg-rose-500 text-white border-rose-600 shadow-sm'
                    }`}
                    title={isMarketReleased ? 'Cerrar el mercado y bloquear pedidos' : 'Abrir el mercado para pedidos'}
                  >
                    {isMarketReleased ? '🔒 Cerrar Venta' : '🔓 Liberar Venta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="p-1.5 rounded-xs border bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-700 cursor-pointer"
                    title="Configurar Horario de Venta"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeSubTab === 'stock' && (
            <div className="space-y-4">
              {/* Controls & Selection Toolbar */}
              <div className="bg-white p-3 border border-[#D4D3D0] rounded-xs shadow-xs space-y-3 font-mono text-xs">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto, lote o etiqueta para el pedido..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-[#B0AFAB] rounded-xs focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs bg-[#FAF9F6]"
                    />
                  </div>

                  {/* Filters & View toggles */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value as any)}
                      className="px-2 py-1.5 border border-[#B0AFAB] rounded-xs text-xs bg-white focus:outline-none"
                    >
                      <option value="ALL">❄️ Almacén Congelado (PNC)</option>
                    </select>

                    {subWarehouses.length > 0 && (
                      <select
                        value={selectedSubWarehouse}
                        onChange={(e) => setSelectedSubWarehouse(e.target.value)}
                        className="px-2 py-1.5 border border-[#B0AFAB] rounded-xs text-xs bg-white focus:outline-none"
                      >
                        <option value="ALL">📍 Ubicación / Sub-almacén</option>
                        {subWarehouses.map((s) => (
                          <option key={s.id} value={s.code}>
                            [{s.code}] {s.name} ({s.parentWarehouse})
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex border border-[#B0AFAB] rounded-xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setViewMode('labels')}
                        className={`px-2.5 py-1 text-[11px] font-bold ${
                          viewMode === 'labels'
                            ? 'bg-[#141414] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Individual (Cajas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('grouped')}
                        className={`px-2.5 py-1 text-[11px] font-bold ${
                          viewMode === 'grouped'
                            ? 'bg-[#141414] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Agrupado x Producto
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batch Selection Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200 bg-[#FAF9F6] p-2 rounded-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredUnreserved}
                      className="text-[11px] bg-gray-200 hover:bg-gray-300 text-gray-800 px-2.5 py-1 rounded-xs font-bold cursor-pointer"
                    >
                      Seleccionar Todo ({filteredLabels.filter((l) => !l.isReserved).length})
                    </button>
                    {selectedLabelIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Limpiar Selección
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm text-gray-900">
                      Seleccionados: {selectedLabelIds.length} caja(s) ({selectedTotalWeight.toFixed(2)} KG)
                    </span>

                    <button
                      type="button"
                      disabled={selectedLabelIds.length === 0 || (!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing'))}
                      onClick={() => handleOpenReserveModal('PEDIDO_VENTA')}
                      className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-[#141414] font-black px-3.5 py-1.5 rounded-xs uppercase tracking-wider text-xs flex items-center gap-1.5 shadow-sm cursor-pointer border border-amber-500"
                      title="Crear un Pedido de Venta formal para cliente con las cajas seleccionadas"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{(!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing')) ? 'Venta Cerrada' : `1. Crear Pedido Venta (${selectedLabelIds.length})`}</span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedLabelIds.length === 0 || (!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing'))}
                      onClick={() => handleOpenReserveModal('SOLICITUD_MUESTRA')}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-3.5 py-1.5 rounded-xs uppercase tracking-wider text-xs flex items-center gap-1.5 shadow-sm cursor-pointer border border-cyan-700"
                      title="Crear una Solicitud de Muestras para degustación o pruebas técnicas"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>{(!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing')) ? 'Venta Cerrada' : `2. Crear Solicitud Muestras (${selectedLabelIds.length})`}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW MODE 1: INDIVIDUAL LABELS TABLE */}
              {viewMode === 'labels' && (
                <div className="bg-white border border-[#D4D3D0] rounded-xs shadow-xs overflow-x-auto font-mono text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#141414] text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5 text-center w-10">Sel.</th>
                        <th className="p-2.5">Estado Stock</th>
                        <th className="p-2.5">Producto</th>
                        <th className="p-2.5">Almacén / Ubicación</th>
                        <th className="p-2.5">Lote</th>
                        <th className="p-2.5 text-right">Peso</th>
                        <th className="p-2.5">Condición</th>
                        <th className="p-2.5">Hora Impresión</th>
                        <th className="p-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs">
                      {filteredLabels.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-gray-500">
                            No se encontraron etiquetas disponibles con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredLabels.map((lbl) => {
                          const isSelected = selectedLabelIds.includes(lbl.id);
                          const isReserved = lbl.isReserved || reservedLabelIds.includes(lbl.id);
                          const condInfo = lbl.conditionFlag ? PRODUCT_CONDITIONS[lbl.conditionFlag] : null;

                          return (
                            <tr
                              key={lbl.id}
                              className={`hover:bg-[#FAF9F6] transition-colors ${
                                isReserved
                                  ? 'bg-amber-50/60 text-amber-950'
                                  : isSelected
                                  ? 'bg-amber-100/70 font-semibold'
                                  : ''
                              }`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isReserved}
                                  checked={isSelected}
                                  onChange={() => toggleSelectLabel(lbl.id)}
                                  className="rounded-xs text-amber-500 focus:ring-0 cursor-pointer disabled:opacity-40"
                                />
                              </td>
                              <td className="p-2.5">
                                {isReserved ? (
                                  <span className="bg-amber-200 text-amber-900 border border-amber-400 px-2 py-0.5 rounded-xs font-bold text-[10px] inline-flex items-center gap-1">
                                    <BookmarkPlus className="w-3 h-3 text-amber-700" />
                                    <span>APARTADO ({lbl.reservedBy || 'Mkt Dev'})</span>
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 px-2 py-0.5 rounded-xs font-bold text-[10px] inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>DISPONIBLE</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-gray-900">{lbl.productName}</div>
                                <div className="text-[10px] text-gray-500 font-mono">
                                  Code: {lbl.productCode} | Cat: {lbl.category}
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold border bg-cyan-50 text-cyan-900 border-cyan-300">
                                  ❄️ Congelado
                                </span>
                                {lbl.subWarehouse && (
                                  <span className="ml-1 text-[10px] bg-gray-100 text-gray-700 px-1 py-0.5 border border-gray-300 rounded-xs">
                                    [{lbl.subWarehouse}]
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-bold text-gray-800">{lbl.lot}</td>
                              <td className="p-2.5 text-right font-extrabold text-base text-gray-900">
                                {lbl.weight.toFixed(2)} {lbl.unit}
                              </td>
                              <td className="p-2.5">
                                {condInfo ? (
                                  <span
                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-xs ${condInfo.color}`}
                                    title={condInfo.description}
                                  >
                                    {condInfo.shortLabel}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2.5 text-[11px] text-gray-600">
                                {new Date(lbl.printTimestamp).toLocaleDateString()}{' '}
                                <span className="text-[10px] text-gray-400">
                                  {new Date(lbl.printTimestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                {!isReserved ? (
                                  <button
                                    type="button"
                                    disabled={!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing')}
                                    onClick={() => {
                                      setSelectedLabelIds([lbl.id]);
                                      setIsReserveModalOpen(true);
                                    }}
                                    className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black px-2 py-1 rounded-xs font-bold text-[10px] cursor-pointer"
                                  >
                                    {(!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing')) ? 'Cerrado' : 'Apartar Este'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">En pedido</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW MODE 2: GROUPED STOCK CARDS */}
              {viewMode === 'grouped' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
                  {groupedStock.map((grp) => (
                    <div
                      key={`${grp.productCode}-${grp.warehouse}`}
                      className="bg-white border border-[#D4D3D0] rounded-xs p-4 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                          <div>
                            <span className="bg-gray-200 text-gray-800 text-[9px] font-bold px-1.5 py-0.5 rounded-xs uppercase">
                              {grp.productCode}
                            </span>
                            <h3 className="font-bold text-sm text-gray-900 mt-1">{grp.productName}</h3>
                          </div>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-xs border shrink-0 bg-cyan-50 text-cyan-900 border-cyan-300">
                            ❄️ Congelado
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          <div className="bg-[#FAF9F6] p-2 border border-gray-200 rounded-xs">
                            <span className="text-gray-500 text-[10px]">Peso Total</span>
                            <p className="font-extrabold text-base text-gray-900">
                              {grp.totalWeight.toFixed(2)} {grp.unit}
                            </p>
                          </div>
                          <div className="bg-[#FAF9F6] p-2 border border-gray-200 rounded-xs">
                            <span className="text-gray-500 text-[10px]">Cajas</span>
                            <p className="font-bold text-sm text-gray-800">{grp.totalPackages} cajas</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] mt-2 pt-1">
                          <span className="text-emerald-700 font-bold">
                            Disponible: {grp.availablePackages} cajas
                          </span>
                          <span className="text-amber-700 font-bold">
                            Apartado: {grp.reservedPackages} cajas
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing')}
                        onClick={() => {
                          const unreservedForProduct = grp.labelIds.filter((id) => {
                            const l = availableLabels.find((lbl) => lbl.id === id);
                            return l && !l.isReserved;
                          });
                          if (unreservedForProduct.length === 0) {
                            alert('No hay cajas disponibles libres para este producto.');
                            return;
                          }
                          setSelectedLabelIds(unreservedForProduct);
                          setIsReserveModalOpen(true);
                        }}
                        className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black py-1.5 rounded-xs font-bold text-center cursor-pointer mt-2"
                      >
                        {(!isMarketReleased && (activeUser?.role === 'Desarrollador de Mercado' || activeUser?.role === 'Telemarketing')) ? 'Venta Cerrada' : `Apartar (${grp.availablePackages} Disponibles)`}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Developer Requests SubTab */}
          {activeSubTab === 'reservations' && (
            <div className="space-y-4">
              <div className="bg-white p-3 border border-[#D4D3D0] rounded-xs shadow-xs font-mono text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-gray-900 uppercase">
                        {activeUser?.role === 'Telemarketing'
                          ? `Solicitudes & Pedidos Registrados (${userBaseReservations.length})`
                          : `Mis Pedidos y Solicitudes Registradas (${userBaseReservations.length})`}
                      </h3>
                      {activeUser?.role === 'Desarrollador de Mercado' && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          🔒 Mis pedidos exclusivos: {activeUser.name} ({activeUser.assignedZone || 'General'})
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Visualice de forma separada los Pedidos de Venta y las Solicitudes de Muestras de Producto No Conforme.
                    </p>
                  </div>

                  {/* Scope filter for Telemarketing + Segmented type filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeUser?.role === 'Telemarketing' && (
                      <div className="flex items-center gap-1 bg-purple-50 p-1 rounded border border-purple-200">
                        <button
                          type="button"
                          onClick={() => setTelemarketingScope('all')}
                          className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                            telemarketingScope === 'all'
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          Todos ({reservations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTelemarketingScope('my_orders')}
                          className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                            telemarketingScope === 'my_orders'
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          Mis Pedidos ({myTelemarketingOrdersCount})
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDeveloperTypeFilter('ALL')}
                        className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                          developerTypeFilter === 'ALL'
                            ? 'bg-[#141414] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Todos ({userBaseReservations.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeveloperTypeFilter('PEDIDO_VENTA')}
                        className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                          developerTypeFilter === 'PEDIDO_VENTA'
                            ? 'bg-amber-400 text-black font-black'
                            : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Pedidos Venta ({userPedidosCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeveloperTypeFilter('SOLICITUD_MUESTRA')}
                        className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                          developerTypeFilter === 'SOLICITUD_MUESTRA'
                            ? 'bg-cyan-600 text-white font-black'
                            : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100 border border-cyan-300'
                        }`}
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Solicitudes Muestras ({userSolicitudesCount})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of reservations */}
              <div className="space-y-3 font-mono text-xs">
                {displayedDeveloperReservations.length === 0 ? (
                  <div className="bg-white p-8 border border-gray-300 rounded-xs text-center text-gray-500">
                    No se encontraron registros para el filtro seleccionado.
                  </div>
                ) : (
                  displayedDeveloperReservations.map((res) => (
                    <div
                      key={res.id}
                      className="bg-white border-2 border-gray-200 rounded-xs p-4 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-gray-900">
                            Folio: {res.internalFolio || res.id}
                          </span>

                          {/* Distinct Type Badge */}
                          {isOrder(res) ? (
                            <span className="bg-amber-100 text-amber-950 border border-amber-400 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-amber-700" />
                              <span>PEDIDO DE VENTA PNC</span>
                            </span>
                          ) : (
                            <span className="bg-cyan-100 text-cyan-950 border border-cyan-400 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1">
                              <BookmarkPlus className="w-3 h-3 text-cyan-700" />
                              <span>SOLICITUD DE MUESTRAS PNC</span>
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${
                              res.status === 'PENDIENTE'
                                ? 'bg-amber-100 text-amber-900 border-amber-400'
                                : res.status === 'APROBADO'
                                ? 'bg-blue-100 text-blue-900 border-blue-400'
                                : res.status === 'DESPACHADO'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                : 'bg-rose-100 text-rose-900 border-rose-400'
                            }`}
                          >
                            {res.status === 'DESPACHADO' ? '✓ DESPACHADO / DESCONTADO' : res.status}
                          </span>

                          {res.substitutions && res.substitutions.length > 0 && (
                            <span className="text-[10px] font-black uppercase text-amber-950 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-xs flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-amber-900" />
                              <span>{res.substitutions.length} Sustitución{res.substitutions.length !== 1 ? 'es' : ''}</span>
                            </span>
                          )}

                          {res.status === 'DESPACHADO' && (
                            <button
                              type="button"
                              onClick={() => setViewingVoucherReservation(res)}
                              className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase rounded-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Ver Comprobante Oficial de Pedido y Salida de Almacén"
                            >
                              <Printer className="w-3 h-3 text-black" />
                              <span>Ver Comprobante</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500">
                          Hora de Alta: {formatFullDateTime(res.reservationDate)} ({formatRelativeTime(res.reservationDate)})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FAF9F6] p-2.5 rounded text-xs">
                        <div>
                          <span className="text-gray-500 text-[10px]">Cliente / Evento:</span>
                          <p className="font-bold text-gray-900">{res.clientOrEvent}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px]">Motivo:</span>
                          <p className="font-bold text-amber-900">{res.reason}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px]">Total Peso:</span>
                          <p className="font-extrabold text-gray-900">{res.totalWeight.toFixed(2)} KG ({res.items?.length || res.totalItems} cajas)</p>
                        </div>
                      </div>

                      {/* Substitution details if any */}
                      {res.substitutions && res.substitutions.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-xs text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-amber-950">
                            <span className="flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-amber-800" />
                              <span>Registro de Sustituciones en Almacén ({res.substitutions.length} cajas):</span>
                            </span>
                            <span className="text-[10px] text-gray-600 font-sans">
                              (Cajas no encontradas reintegradas a stock disponible)
                            </span>
                          </div>
                          <div className="space-y-1">
                            {res.substitutions.map((sub, sIdx) => (
                              <div key={sIdx} className="bg-white p-1.5 border border-amber-200 rounded-xs flex items-center justify-between gap-2 text-[10px]">
                                <div>
                                  <span className="font-mono font-bold text-rose-800">Original {sub.originalLabelId}</span>
                                  <span className="text-gray-600"> ({sub.originalProductName} - {sub.originalWeight.toFixed(2)} KG)</span>
                                  <span className="mx-1 font-bold text-gray-400">➔</span>
                                  <span className="font-mono font-bold text-emerald-800">Sustituta {sub.substitutedWithLabelId}</span>
                                  <span className="text-gray-700"> ({sub.substitutedWithProductName} - {sub.substitutedWithWeight.toFixed(2)} KG)</span>
                                </div>
                                <span className="font-mono font-bold text-amber-900 shrink-0">
                                  Dif: {sub.weightDifference && sub.weightDifference >= 0 ? '+' : ''}{sub.weightDifference?.toFixed(2) ?? '0.00'} KG
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: MÓDULO TELEMARKETING (LISTA CRONOLÓGICA POR HORA DE ALTA) */}
      {/* ==================================================================== */}
      {mainSubModule === 'telemarketing' && isTelemarketingAllowed && (
        <div className="space-y-4 font-mono text-xs">
          {/* Telemarketing Banner */}
          <div className="bg-purple-950/90 border-2 border-purple-600 text-purple-100 p-4 rounded-xs shadow-md space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-800 text-purple-100 rounded border border-purple-500">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base uppercase text-purple-200 tracking-wider">
                      PANEL TELEMARKETING — PEDIDOS Y SOLICITUDES DE PRODUCTO NO CONFORME (PNC)
                    </h3>
                    <span className="bg-purple-800 text-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">
                      {activeUser?.assignedZone ? `ZONA ${activeUser.assignedZone}` : 'TODAS LAS ZONAS'}
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90">
                    Atención de solicitudes ingresadas por Desarrolladores de Mercado ordenadas estrictamente por su hora exacta de alta.
                  </p>
                </div>
              </div>

              {/* Order stats counter */}
              <div className="flex items-center gap-2 text-xs">
                <div className="bg-purple-900/90 px-3 py-1.5 border border-purple-500/80 rounded text-center">
                  <span className="text-[10px] text-purple-300 block">PENDIENTES</span>
                  <span className="font-black text-amber-300 text-base">
                    {telemarketingReservations.filter((r) => r.status === 'PENDIENTE').length}
                  </span>
                </div>
                <div className="bg-purple-900/90 px-3 py-1.5 border border-purple-500/80 rounded text-center">
                  <span className="text-[10px] text-purple-300 block">APROBADOS</span>
                  <span className="font-black text-emerald-300 text-base">
                    {telemarketingReservations.filter((r) => r.status === 'APROBADO').length}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-purple-200 italic">
              * Revise los pedidos de cada Desarrollador, confirme las muestras o apartados en almacén y genere el ticket de despacho correspondiente.
            </p>

            {/* TELEMARKETING SUB-MODULE TABS */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-800">
              <button
                type="button"
                onClick={() => setTelemarketingTab('orders')}
                className={`px-3 py-1.5 rounded font-bold text-xs cursor-pointer flex items-center gap-1.5 ${
                  telemarketingTab === 'orders'
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'bg-purple-900 hover:bg-purple-800 text-purple-200'
                }`}
              >
                <PhoneCall className="w-4 h-4" />
                <span>Gestión de Pedidos Telemarketing ({reservations.filter((r) => r.status !== 'CANCELADO').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTelemarketingTab('cancellations')}
                className={`px-3 py-1.5 rounded font-bold text-xs cursor-pointer flex items-center gap-1.5 ${
                  telemarketingTab === 'cancellations'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-purple-900 hover:bg-purple-800 text-purple-200'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Consulta de Registro de Cancelaciones ({cancellationRecords.length})</span>
              </button>
            </div>
          </div>

          {telemarketingTab === 'cancellations' ? (
            <div className="space-y-4 font-mono text-xs">
              {/* KPI Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-rose-950 text-rose-100 p-3.5 border-2 border-rose-600 rounded-xs shadow-xs">
                  <span className="text-[10px] text-rose-300 font-bold uppercase block">Total Pedidos Cancelados</span>
                  <span className="text-2xl font-black text-white">{filteredCancellationRecords.length}</span>
                  <span className="text-[10px] text-rose-300 block mt-0.5">En historial general de Telemarketing</span>
                </div>

                <div className="bg-purple-950 text-purple-100 p-3.5 border-2 border-purple-600 rounded-xs shadow-xs">
                  <span className="text-[10px] text-purple-300 font-bold uppercase block">Volumen Total Cancelado</span>
                  <span className="text-2xl font-black text-amber-300">
                    {filteredCancellationRecords.reduce((acc, c) => acc + c.totalWeight, 0).toFixed(2)} KG
                  </span>
                  <span className="text-[10px] text-purple-300 block mt-0.5">
                    {filteredCancellationRecords.reduce((acc, c) => acc + c.totalItems, 0)} cajas reincorporadas
                  </span>
                </div>

                <div className="bg-zinc-900 text-zinc-100 p-3.5 border-2 border-zinc-700 rounded-xs shadow-xs">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Sincronización Firebase</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="font-bold text-xs text-emerald-400">En tiempo real en Firestore</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    Consulta auditable multidispositivo
                  </span>
                </div>
              </div>

              {/* Filters for Cancellation Audit Log */}
              <div className="bg-white p-3 border border-gray-300 rounded-xs shadow-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
                      🔍 Buscar por Folio / Cliente / Motivo / Usuario:
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar en cancelaciones..."
                      value={cancellationSearchTerm}
                      onChange={(e) => setCancellationSearchTerm(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-[#FAF9F6]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
                      👤 Desarrollador Solicitante:
                    </label>
                    <select
                      value={cancellationDeveloperFilter}
                      onChange={(e) => setCancellationDeveloperFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white font-bold"
                    >
                      <option value="ALL">Todos los Desarrolladores</option>
                      {uniqueDevelopers.map((dev) => (
                        <option key={dev} value={dev}>
                          {dev}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
                      📄 Tipo de Registro Cancelado:
                    </label>
                    <select
                      value={cancellationSourceFilter}
                      onChange={(e) => setCancellationSourceFilter(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white font-bold"
                    >
                      <option value="ALL">Todos los Tipos de PNC</option>
                      <option value="PEDIDO_VENTA">Solo Pedidos de Venta PNC</option>
                      <option value="SOLICITUD_MUESTRA">Solo Solicitudes de Muestras PNC</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CANCELLATIONS TABLE */}
              <div className="bg-white border border-gray-300 rounded-xs overflow-hidden shadow-xs">
                <div className="bg-rose-900 text-white px-4 py-2 flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-300" />
                    <span>HISTORIAL DE REGISTRO DE CANCELACIONES TELEMARKETING ({filteredCancellationRecords.length})</span>
                  </h4>
                  <span className="text-[10px] bg-rose-950 text-rose-200 px-2 py-0.5 rounded font-bold">
                    Sincronizado Firestore
                  </span>
                </div>

                {filteredCancellationRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 space-y-1">
                    <XCircle className="w-8 h-8 text-rose-300 mx-auto" />
                    <p className="font-bold text-xs uppercase text-gray-700">No hay registros de cancelación</p>
                    <p className="text-[11px]">No se encontraron cancelaciones con los criterios de búsqueda especificados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase text-[9px] font-extrabold">
                        <tr>
                          <th className="p-2.5">Fecha / Hora Cancelación</th>
                          <th className="p-2.5">Folio Solicitud</th>
                          <th className="p-2.5">Cliente / Evento</th>
                          <th className="p-2.5">Desarrollador</th>
                          <th className="p-2.5">Motivo de Cancelación</th>
                          <th className="p-2.5">Cancelado Por</th>
                          <th className="p-2.5 text-right">Peso (KG)</th>
                          <th className="p-2.5 text-center">Cajas</th>
                          <th className="p-2.5 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredCancellationRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-rose-50/50 transition-colors">
                            <td className="p-2.5 whitespace-nowrap">
                              <span className="font-bold text-gray-900 block">{formatFullDateTime(rec.cancelledAt)}</span>
                              <span className="text-[10px] text-gray-500 font-mono">({formatRelativeTime(rec.cancelledAt)})</span>
                            </td>

                            <td className="p-2.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-gray-900 bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded">
                                #{rec.reservationId}
                              </span>
                            </td>

                            <td className="p-2.5 font-bold text-gray-900">
                              {rec.clientOrEvent}
                            </td>

                            <td className="p-2.5">
                              <span className="font-bold text-gray-800 block">{rec.developerName}</span>
                              <span className="text-[10px] text-purple-800 font-semibold">{rec.developerZone || 'Zona Norte'}</span>
                            </td>

                            <td className="p-2.5">
                              <span className="bg-rose-100 text-rose-950 border border-rose-300 px-2 py-0.5 rounded font-extrabold text-[11px] inline-block">
                                {rec.cancellationReason}
                              </span>
                              {rec.cancellationNotes && (
                                <p className="text-[10px] text-gray-600 italic mt-0.5">"{rec.cancellationNotes}"</p>
                              )}
                            </td>

                            <td className="p-2.5 font-bold text-gray-800">
                              {rec.cancelledBy}
                            </td>

                            <td className="p-2.5 text-right font-black text-rose-900 text-xs">
                              {rec.totalWeight.toFixed(2)} KG
                            </td>

                            <td className="p-2.5 text-center font-bold text-gray-900">
                              {rec.totalItems}
                            </td>

                            <td className="p-2.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedCancellationRecordModal(rec)}
                                className="bg-gray-800 hover:bg-black text-white px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Ver Detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>

          {/* TELEMARKETING TOOLBAR & FILTERS */}
          <div className="bg-white p-3 border border-[#D4D3D0] rounded-xs shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              {/* Chronological Sorting Switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-800 uppercase text-[11px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Orden de Lista:</span>
                </span>
                <div className="flex border border-gray-300 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTelemarketingSort('latest_first')}
                    className={`px-3 py-1.5 font-bold cursor-pointer text-[11px] ${
                      telemarketingSort === 'latest_first'
                        ? 'bg-purple-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🕒 Más Recientes Primero
                  </button>
                  <button
                    type="button"
                    onClick={() => setTelemarketingSort('oldest_first')}
                    className={`px-3 py-1.5 font-bold cursor-pointer text-[11px] ${
                      telemarketingSort === 'oldest_first'
                        ? 'bg-purple-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⏳ Prioritarios (Más Antiguos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTelemarketingSort('by_developer')}
                    className={`px-3 py-1.5 font-bold cursor-pointer text-[11px] ${
                      telemarketingSort === 'by_developer'
                        ? 'bg-purple-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    👤 Por Desarrollador
                  </button>
                </div>
              </div>

              {/* Type and Status Filter buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-700 uppercase">Tipo:</span>
                  <button
                    type="button"
                    onClick={() => setOrderTypeFilter('ALL')}
                    className={`px-2.5 py-1 font-bold cursor-pointer text-[10px] rounded ${
                      orderTypeFilter === 'ALL'
                        ? 'bg-purple-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    Todos ({reservations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderTypeFilter('PEDIDO_VENTA')}
                    className={`px-2.5 py-1 font-bold cursor-pointer text-[10px] rounded flex items-center gap-1 ${
                      orderTypeFilter === 'PEDIDO_VENTA'
                        ? 'bg-amber-400 text-black font-black'
                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Pedidos Venta ({pncPedidos.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderTypeFilter('SOLICITUD_MUESTRA')}
                    className={`px-2.5 py-1 font-bold cursor-pointer text-[10px] rounded flex items-center gap-1 ${
                      orderTypeFilter === 'SOLICITUD_MUESTRA'
                        ? 'bg-cyan-600 text-white font-black'
                        : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100 border border-cyan-300'
                    }`}
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    <span>Solicitudes Muestras ({pncSolicitudes.length})</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-700 uppercase">Estado:</span>
                  {(['ALL', 'PENDIENTE', 'APROBADO', 'DESPACHADO', 'CANCELADO'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReservationStatusFilter(st)}
                      className={`px-2.5 py-1 font-bold cursor-pointer text-[10px] rounded ${
                        reservationStatusFilter === st
                          ? 'bg-[#141414] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      {st === 'ALL'
                        ? 'Todos'
                        : st === 'PENDIENTE'
                        ? '⏳ Pendientes'
                        : st === 'APROBADO'
                        ? '✅ Aprobados'
                        : st === 'DESPACHADO'
                        ? '📦 Despachados'
                        : '❌ Cancelados'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dropdown Filters & Search bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
              {/* Zone Filter */}
              <div>
                <label className="block text-[10px] font-bold text-amber-800 uppercase mb-0.5">
                  📍 Zona Asignada:
                </label>
                <select
                  value={selectedZoneFilter}
                  onChange={(e) => setSelectedZoneFilter(e.target.value)}
                  className="w-full bg-amber-50 border border-amber-300 text-gray-900 font-bold px-2 py-1.5 rounded text-xs focus:outline-none"
                >
                  <option value="ALL">Todas las Zonas Geográficas</option>
                  <option value="Zona Norte">Zona Norte</option>
                  <option value="Zona Sur">Zona Sur</option>
                  <option value="Zona Centro">Zona Centro</option>
                  <option value="Zona Bajío">Zona Bajío</option>
                  <option value="Zona Occidente">Zona Occidente</option>
                </select>
              </div>

              {/* Developer Filter */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
                  👤 Desarrollador de Mercado:
                </label>
                <select
                  value={selectedDeveloperFilter}
                  onChange={(e) => setSelectedDeveloperFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 font-bold px-2 py-1.5 rounded text-xs focus:outline-none"
                >
                  <option value="ALL">Todos los Desarrolladores</option>
                  {uniqueDevelopers.map((dev) => (
                    <option key={dev} value={dev}>
                      {dev}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5">
                  🔍 Buscar por Folio / Cliente / Producto:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Empacadora, RES-801, Carne..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-[#FAF9F6] focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>
          </div>

          {/* TELEMARKETING ORDERS CHRONOLOGICAL LIST */}
          <div className="space-y-3">
            {telemarketingReservations.length === 0 ? (
              <div className="bg-white p-12 border-2 border-dashed border-gray-300 rounded text-center space-y-2">
                <Clock className="w-8 h-8 text-purple-400 mx-auto" />
                <h4 className="font-bold text-sm text-gray-800 uppercase">
                  No hay pedidos registrados con los filtros seleccionados
                </h4>
                <p className="text-xs text-gray-500">
                  Ajuste el filtro de zona, estado o desarrollador para visualizar otros registros.
                </p>
              </div>
            ) : (
              telemarketingReservations.map((res) => {
                const isPending = res.status === 'PENDIENTE';
                const isApproved = res.status === 'APROBADO';
                const isDispatched = res.status === 'DESPACHADO';

                return (
                  <div
                    key={res.id}
                    className={`bg-white border-2 rounded-xs p-4 shadow-sm transition-all space-y-3.5 ${
                      isPending
                        ? 'border-amber-400/90 ring-1 ring-amber-300'
                        : isApproved
                        ? 'border-blue-500/80'
                        : isDispatched
                        ? 'border-emerald-500/80'
                        : 'border-rose-400/80 opacity-75'
                    }`}
                  >
                    {/* Top Row: Timestamp & Order Info */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* FOLIO */}
                        <span className="font-extrabold text-sm text-[#141414] bg-gray-200 border border-gray-400 px-2.5 py-0.5 rounded font-mono">
                          FOLIO: {res.internalFolio || res.id}
                        </span>

                        {/* TYPE BADGE (PEDIDO DE VENTA vs SOLICITUD DE MUESTRAS) */}
                        {isOrder(res) ? (
                          <span className="bg-amber-100 text-amber-950 border border-amber-400 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-amber-700" />
                            <span>PEDIDO DE VENTA PNC</span>
                          </span>
                        ) : (
                          <span className="bg-cyan-100 text-cyan-950 border border-cyan-400 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1">
                            <BookmarkPlus className="w-3 h-3 text-cyan-700" />
                            <span>SOLICITUD DE MUESTRAS PNC</span>
                          </span>
                        )}

                        {/* STATUS BADGE */}
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-black rounded uppercase tracking-wider border ${
                            isPending
                              ? 'bg-amber-100 text-amber-950 border-amber-500'
                              : isApproved
                              ? 'bg-blue-100 text-blue-950 border-blue-500'
                              : isDispatched
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-500'
                              : 'bg-rose-100 text-rose-950 border-rose-500'
                          }`}
                        >
                          {isPending
                            ? '⏳ PENDIENTE DE REVISIÓN TELEMARKETING'
                            : isApproved
                            ? '✅ APROBADO POR TELEMARKETING'
                            : isDispatched
                            ? '✓ DESPACHADO / DESCONTADO DE INVENTARIO'
                            : '❌ CANCELADO'}
                        </span>

                        {/* ZONE BADGE */}
                        <span className="bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-600" />
                          <span>{res.developerZone || 'Zona General'}</span>
                        </span>

                        {/* SOURCE BADGE */}
                        <span className="bg-amber-100 text-amber-950 border border-amber-400 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>PRODUCTO NO CONFORME (PNC)</span>
                        </span>

                        {/* SUBSTITUTION BADGE IF APPLICABLE */}
                        {res.substitutions && res.substitutions.length > 0 && (
                          <span className="bg-amber-200 text-amber-950 border border-amber-500 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1 shadow-2xs">
                            <RefreshCw className="w-3 h-3 text-amber-900" />
                            <span>SUSTITUCIONES EN EMBARQUE ({res.substitutions.length})</span>
                          </span>
                        )}
                      </div>

                      {/* EXACT TIMESTAMP DISPLAY */}
                      <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1 rounded text-purple-950">
                        <Clock className="w-4 h-4 text-purple-700 shrink-0" />
                        <div>
                          <span className="text-[10px] text-purple-700 font-bold block uppercase">
                            Hora de Alta: {formatTimeOfDay(res.reservationDate)}
                          </span>
                          <span className="text-[11px] font-bold text-gray-800">
                            {formatFullDateTime(res.reservationDate)} ({formatRelativeTime(res.reservationDate)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Developer, Client & Event Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#FAF9F6] p-3 border border-gray-200 rounded">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Desarrollador de Mercado (Solicitante)
                        </span>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5 mt-0.5">
                          <User className="w-4 h-4 text-amber-600" />
                          <span>{res.developerName}</span>
                        </div>
                        <span className="text-[10px] text-purple-800 font-semibold block mt-0.5">
                          Rol: {res.developerRole || 'Desarrollador'} | Zona: {res.developerZone || 'Zona General'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Cliente / Evento Destino
                        </span>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">
                          {res.clientOrEvent}
                        </div>
                        {res.requiredDate && (
                          <span className="text-[10px] text-cyan-800 font-bold block mt-0.5">
                            📅 Entrega requerida: {res.requiredDate}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Motivo Comercial
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold text-[11px] inline-block mt-0.5">
                          {res.reason}
                        </span>
                        {res.approvedBy && (
                          <span className="text-[10px] text-emerald-800 block mt-1 font-semibold">
                            ✓ Aprobado por: {res.approvedBy}
                          </span>
                        )}
                        {res.internalFolio && (
                          <span className="text-[11px] bg-purple-100 text-purple-950 font-black border border-purple-300 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1">
                            📋 Folio PNC: {res.internalFolio}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Products Itemized Table */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                        <span>Lotes / Cajas Solicitadas ({res.items?.length || res.labelIds.length} ítems):</span>
                        <span className="text-purple-900 font-extrabold text-xs">
                          Peso Total Orden: {res.totalWeight.toFixed(2)} KG
                        </span>
                      </div>

                      <div className="bg-white border border-gray-300 rounded overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-gray-100 text-gray-700 uppercase text-[9px] font-bold border-b border-gray-200">
                            <tr>
                              <th className="p-2">Código</th>
                              <th className="p-2">Producto Solicitado</th>
                              <th className="p-2">Lote</th>
                              <th className="p-2">Almacén</th>
                              <th className="p-2 text-right">Peso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {res.items && res.items.length > 0 ? (
                              res.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-2 font-bold text-gray-700">{item.productCode}</td>
                                  <td className="p-2 font-bold text-gray-900">{item.productName}</td>
                                  <td className="p-2 font-mono text-gray-800">{item.lot}</td>
                                  <td className="p-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-cyan-50 text-cyan-900 border-cyan-300">
                                      ❄️ Congelado
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-black text-gray-900">
                                    {item.weight.toFixed(2)} {item.unit}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-2 text-center text-gray-500">
                                  {res.labelIds.length} etiquetas vinculadas a la reserva.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Official Substitution Record in Telemarketing Panel */}
                      {res.substitutions && res.substitutions.length > 0 && (
                        <div className="mt-2.5 p-3 bg-amber-50 border-2 border-amber-400 rounded-xs space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950 border-b border-amber-300 pb-1.5">
                            <span className="flex items-center gap-1.5 uppercase tracking-wide">
                              <RefreshCw className="w-4 h-4 text-amber-800" />
                              <span>Registro Oficial de Sustituciones en Almacén ({res.substitutions.length} cajas)</span>
                            </span>
                            <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded border border-amber-400">
                              Despachado en Embarque
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-900 font-sans">
                            Durante el escaneo físico de salida, el operador no localizó en rack las cajas originales solicitadas y registró las siguientes sustituciones para completar el despacho:
                          </p>
                          <div className="space-y-1.5 bg-white border border-amber-200 p-2 rounded-xs">
                            {res.substitutions.map((sub, sIdx) => (
                              <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pb-1.5 border-b border-gray-100 last:border-b-0 last:pb-0">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-rose-800 bg-rose-50 px-1 border border-rose-200 rounded-2xs">
                                      {sub.originalLabelId}
                                    </span>
                                    <span className="text-gray-700 font-medium">({sub.originalProductName} — Lote: {sub.originalLot} — {sub.originalWeight.toFixed(2)} KG)</span>
                                    <span className="font-bold text-gray-400">➔</span>
                                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 border border-emerald-200 rounded-2xs">
                                      {sub.substitutedWithLabelId}
                                    </span>
                                    <span className="text-gray-900 font-bold">({sub.substitutedWithProductName} — Lote: {sub.substitutedWithLot} — {sub.substitutedWithWeight.toFixed(2)} KG)</span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-sans">
                                    Motivo: <em>"{sub.reason || 'Caja física no localizada en rack / Sustitución por stock equivalente'}"</em>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-bold text-amber-900 text-xs block">
                                    Dif: {sub.weightDifference && sub.weightDifference >= 0 ? '+' : ''}{sub.weightDifference?.toFixed(2) ?? '0.00'} KG
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-sans block">Por: {sub.substitutedBy || 'Operador Embarque'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-emerald-50 border border-emerald-300 p-1.5 text-[10px] text-emerald-950 rounded-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>
                              <strong>Trazabilidad de Stock:</strong> Las cajas que no se encontraron ({res.substitutions.map(s => s.originalLabelId).join(', ')}) cambiaron automáticamente su estatus a <strong>DISPONIBLES en stock</strong> para inventario.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes & Telemarketing Action Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-200">
                      <div className="text-[11px] text-gray-600 flex-1">
                        {res.notes ? (
                          <p className="italic bg-amber-50/80 p-1.5 border border-amber-200 rounded text-amber-900">
                            💬 <strong>Notas del Desarrollador:</strong> "{res.notes}"
                          </p>
                        ) : (
                          <span className="text-gray-400 italic">Sin notas adicionales</span>
                        )}
                      </div>

                      {/* Action buttons for Telemarketing */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setApprovingReservation(res);
                                setPncInternalFolioInput(res.internalFolio || '');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                              title="Aprobar pedido o solicitud de Producto No Conforme"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Aprobar {isOrder(res) ? 'Pedido' : 'Solicitud'} PNC</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDispatchingReservation(res)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                              title="Despachar y descontar cajas del stock de Producto No Conforme"
                            >
                              <Truck className="w-4 h-4" />
                              <span>Despachar y Descontar PNC</span>
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => setDispatchingReservation(res)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                            title="Despachar y descontar cajas del inventario de Producto No Conforme"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Despachar y Descontar Inventario PNC</span>
                          </button>
                        )}

                        {isDispatched && (
                          <>
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold px-2.5 py-1 rounded text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Inventario Descontado de Almacén</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewingVoucherReservation(res)}
                              className="bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1.5 rounded font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Ver e Imprimir Comprobante Oficial de Pedido y Salida de Almacén"
                            >
                              <Printer className="w-3.5 h-3.5 text-black" />
                              <span>Comprobante de Pedido</span>
                            </button>
                          </>
                        )}

                        {/* Print Ticket Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedTicketReservation(res)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-2.5 py-1.5 rounded font-bold text-xs flex items-center gap-1 cursor-pointer"
                          title="Imprimir Ficha de Salida / Vale de Despacho PNC"
                        >
                          <Printer className="w-3.5 h-3.5 text-gray-600" />
                          <span>Ficha de Salida</span>
                        </button>

                        {!isDispatched && (
                          <button
                            type="button"
                            onClick={() => setCancellingReservation(res)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              title: `Eliminar ${isOrder(res) ? 'Pedido' : 'Solicitud'} PNC`,
                              message: `¿Desea eliminar la orden #${res.id.slice(-6)} (${res.clientOrEvent} - ${res.totalWeight.toFixed(2)} KG) del historial?`,
                              confirmText: 'Sí, Eliminar Registro',
                              danger: true,
                              onConfirm: () => {
                                deleteMarketReservation(res.id);
                              },
                            });
                          }}
                          className="text-gray-400 hover:text-rose-600 p-1.5 cursor-pointer"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </>
        )}
        </div>
      )}

      {/* Access Denied Guard if unauthorized user tries to access telemarketing */}
      {mainSubModule === 'telemarketing' && !isTelemarketingAllowed && (
        <div className="bg-[#1D1D1B] border-2 border-red-500/80 p-6 rounded-xs text-white max-w-2xl mx-auto my-6 space-y-4 shadow-xl font-mono">
          <div className="flex items-center gap-3 border-b border-[#3A3A36] pb-3">
            <div className="p-2.5 rounded bg-red-950 border border-red-600 text-red-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-red-400 tracking-wider">
                Acceso Restringido — Panel Telemarketing
              </h3>
              <p className="text-xs text-gray-300 font-sans">
                El panel de monitoreo y aprobación de Telemarketing está restringido para su perfil ({activeUser?.role || 'No autorizado'}).
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed">
            Los perfiles de Desarrollador de Mercado y Jefe de Ventas no tienen autorización para acceder al panel de Telemarketing. Sus funciones autorizadas corresponden a la exploración de inventario y gestión de pedidos de su zona.
          </p>
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMainSubModule('developer');
                setActiveSubTab('stock');
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase rounded border border-amber-500 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Ir a Módulos Autorizados</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FORM MODAL: CREAR PEDIDO O SOLICITUD DE PRODUCTO NO CONFORME */}
      {isReserveModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 z-50 animate-fade-in font-mono text-xs">
          <div className="bg-white border-2 border-[#141414] rounded-xs max-w-xl w-full p-5 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                {orderTypeSelection === 'PEDIDO_VENTA' ? (
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                ) : (
                  <BookmarkPlus className="w-5 h-5 text-cyan-600" />
                )}
                <h3 className="font-bold text-base text-gray-900 uppercase">
                  {orderTypeSelection === 'PEDIDO_VENTA'
                    ? 'NUEVO PEDIDO DE VENTA — PRODUCTO NO CONFORME (PNC)'
                    : 'NUEVA SOLICITUD DE MUESTRAS — PRODUCTO NO CONFORME (PNC)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReserveModalOpen(false)}
                className="text-gray-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Document Type Selector Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 border border-gray-300 rounded">
              <button
                type="button"
                onClick={() => {
                  setOrderTypeSelection('PEDIDO_VENTA');
                  setReason('Venta Directa');
                }}
                className={`py-2 px-3 rounded font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  orderTypeSelection === 'PEDIDO_VENTA'
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>1. Pedido de Venta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderTypeSelection('SOLICITUD_MUESTRA');
                  setReason('Muestreo / Degustación');
                }}
                className={`py-2 px-3 rounded font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  orderTypeSelection === 'SOLICITUD_MUESTRA'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>2. Solicitud de Muestras</span>
              </button>
            </div>

            {/* Selection Summary Box */}
            <div className={`p-3 rounded-xs space-y-1 font-mono border ${
              orderTypeSelection === 'PEDIDO_VENTA'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-cyan-50 border-cyan-300 text-cyan-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">
                  Resumen de Cajas PNC Seleccionadas ({selectedLabels.length} cajas):
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                  orderTypeSelection === 'PEDIDO_VENTA'
                    ? 'bg-amber-200 text-amber-900 border-amber-400'
                    : 'bg-cyan-200 text-cyan-900 border-cyan-400'
                }`}>
                  {orderTypeSelection === 'PEDIDO_VENTA' ? 'PEDIDO COMERCIAL' : 'SOLICITUD MUESTREO'}
                </span>
              </div>
              <p className="font-extrabold text-sm">
                Peso Total Seleccionado: {selectedTotalWeight.toFixed(2)} KG
              </p>
              <div className="text-[11px] opacity-90 max-h-28 overflow-y-auto divide-y divide-gray-200 pt-1">
                {selectedLabels.map((l) => (
                  <div key={l.id} className="py-0.5 flex items-center justify-between">
                    <span>
                      {l.productName} (Lote: {l.lot})
                    </span>
                    <span className="font-bold">
                      {l.weight.toFixed(2)} {l.unit} [{l.warehouse}]
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-3">
              {/* Developer / Telemarketing Name Field */}
              {activeUser?.role === 'Telemarketing' ? (
                <div className="bg-purple-50 border-2 border-purple-400 p-3 rounded-xs space-y-2 font-mono shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-950 uppercase flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-purple-700" />
                      <span>Agente Telemarketing / Solicitante:</span>
                    </span>
                    <span className="bg-purple-200 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded border border-purple-300 uppercase">
                      📞 Pedido Directo Telemarketing
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>{developerName || activeUser.name}</span>
                    <span className="text-gray-600 font-bold text-xs bg-white px-1.5 py-0.5 rounded border border-gray-300">
                      [{activeUser.employeeNumber}]
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-200">
                    <button
                      type="button"
                      onClick={() => setDeveloperName(`${activeUser.name} (Telemarketing)`)}
                      className="text-[10px] text-purple-900 font-bold hover:bg-purple-200 cursor-pointer bg-white px-2 py-0.5 rounded border border-purple-300"
                    >
                      ✓ A mi nombre ({activeUser.name})
                    </button>
                    {systemUsers.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setDeveloperName(e.target.value);
                          }
                        }}
                        className="py-1 px-2 border border-purple-300 bg-white text-xs font-bold text-gray-900 rounded-xs"
                      >
                        <option value="">O asignar a nombre de vendedor...</option>
                        {systemUsers
                          .filter((u) => u.role === 'Desarrollador de Mercado' || u.role === 'Jefe de Ventas')
                          .map((u) => (
                            <option key={u.id} value={`${u.name}`}>
                              [{u.employeeNumber}] {u.name} — {u.role} ({u.assignedZone || 'Zona Norte'})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              ) : activeUser?.role === 'Desarrollador de Mercado' ? (
                <div className="bg-amber-50 border-2 border-amber-400 p-3 rounded-xs space-y-1.5 font-mono shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Desarrollador de Mercado Solicitante:</span>
                    </span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded border border-amber-300 uppercase">
                      🔒 Nombre Bloqueado al Usuario
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{activeUser.name}</span>
                    <span className="text-gray-600 font-bold text-xs bg-white px-1.5 py-0.5 rounded border border-gray-300">
                      [{activeUser.employeeNumber}]
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-900 font-sans flex items-center justify-between pt-1 border-t border-amber-200">
                    <span>Zona: <strong>{activeUser.assignedZone || 'Zona Norte'}</strong></span>
                    <span>Sucursal: <strong>{activeUser.branch || 'Planta Principal'}</strong></span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-gray-800 uppercase mb-1 flex items-center justify-between">
                    <span>Desarrollador de Mercado / Solicitante: <span className="text-rose-600">*</span></span>
                    {activeUser && (
                      <button
                        type="button"
                        onClick={() => setDeveloperName(`${activeUser.name}`)}
                        className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Usar Activo: {activeUser.name}
                      </button>
                    )}
                  </label>

                  {systemUsers.length > 0 && (
                    <div className="mb-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setDeveloperName(e.target.value);
                          }
                        }}
                        className="w-full py-1 px-2 border border-amber-400 bg-amber-50 text-xs font-bold text-gray-900 rounded-xs"
                      >
                        <option value="">-- Seleccionar Desarrollador Registrado --</option>
                        {systemUsers.map((u) => (
                          <option key={u.id} value={`${u.name}`}>
                            [{u.employeeNumber}] {u.name} — {u.role} ({u.assignedZone || 'Zona Norte'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    placeholder="Ej: Lic. Fernando Morales (EMP-1001)"
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#B0AFAB] rounded-xs focus:ring-1 focus:ring-amber-500 bg-[#FAF9F6] font-bold text-xs"
                  />
                </div>
              )}

              {/* Client or Event */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 uppercase mb-1">
                  Cliente, Evento o Proyecto Destino: <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Empacadora del Norte / Muestra Chef Ejecutivo"
                  value={clientOrEvent}
                  onChange={(e) => setClientOrEvent(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#B0AFAB] rounded-xs focus:ring-1 focus:ring-amber-500 bg-[#FAF9F6]"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 uppercase mb-1">
                  Motivo de {orderTypeSelection === 'PEDIDO_VENTA' ? 'la Venta Comercial' : 'la Solicitud de Muestra'}:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-[#B0AFAB] rounded-xs focus:ring-1 focus:ring-amber-500 bg-white font-bold text-xs"
                >
                  {orderTypeSelection === 'PEDIDO_VENTA' ? (
                    <>
                      <option value="Venta Directa">Venta Directa</option>
                      <option value="Reserva Venta Especial">Reserva para Venta Especial</option>
                      <option value="Apartado Comercial">Apartado Comercial</option>
                      <option value="Pedido Programado">Pedido Programado</option>
                      <option value="Otro">Otro Motivo Comercial</option>
                    </>
                  ) : (
                    <>
                      <option value="Muestreo / Degustación">Muestreo / Degustación</option>
                      <option value="Demostración Comercial">Demostración Comercial</option>
                      <option value="Prueba de Calidad">Prueba de Calidad / Pruebas Técnicas</option>
                      <option value="Evento / Feria">Evento / Feria Comercial</option>
                      <option value="Otro">Otro Motivo de Muestra</option>
                    </>
                  )}
                </select>
              </div>

              {/* Required Date */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 uppercase mb-1">
                  Fecha Requerida de Despacho (Opcional):
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#B0AFAB] rounded-xs focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 uppercase mb-1">
                  Notas Adicionales / Instrucciones de Empaque:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Entregar empacado en hielera con hielo seco..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#B0AFAB] rounded-xs focus:ring-1 focus:ring-amber-500 bg-[#FAF9F6]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsReserveModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xs text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black rounded-xs shadow-sm flex items-center gap-1.5 cursor-pointer uppercase ${
                    orderTypeSelection === 'PEDIDO_VENTA'
                      ? 'bg-amber-400 hover:bg-amber-500 text-black'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  {orderTypeSelection === 'PEDIDO_VENTA' ? (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Confirmar Pedido de Venta PNC</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Confirmar Solicitud de Muestras PNC</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE TICKET SLIP MODAL (TELEMARKETING DISPATCH TICKET) */}
      {selectedTicketReservation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 z-50 animate-fade-in font-mono text-xs">
          <div className="bg-white text-black border-4 border-[#141414] rounded-xs max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[95vh]">
            {/* Header Slip */}
            <div className="text-center border-b-2 border-black pb-3 space-y-1">
              <h2 className="font-black text-lg uppercase tracking-wider">
                SISTEMA INDUSTRIAL MEAT & FOODS
              </h2>
              <p className="font-bold text-xs uppercase bg-black text-white py-1">
                FICHA DE SALIDA Y DESPACHO — TELEMARKETING / MERCADO
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span>FOLIO: <strong>{selectedTicketReservation.id}</strong></span>
                <span>HORA ALTA: <strong>{formatFullDateTime(selectedTicketReservation.reservationDate)}</strong></span>
              </div>
            </div>

            {/* Ticket Metadata */}
            <div className="grid grid-cols-2 gap-3 bg-gray-100 p-3 border border-gray-300 rounded text-xs">
              <div>
                <span className="text-gray-500 text-[10px] block uppercase font-bold">Desarrollador Solicitante:</span>
                <span className="font-extrabold text-gray-900">{selectedTicketReservation.developerName}</span>
                <span className="text-[10px] text-gray-600 block">Zona: {selectedTicketReservation.developerZone || 'Zona General'}</span>
              </div>

              <div>
                <span className="text-gray-500 text-[10px] block uppercase font-bold">Cliente / Destino:</span>
                <span className="font-extrabold text-gray-900">{selectedTicketReservation.clientOrEvent}</span>
                <span className="text-[10px] text-gray-600 block">Motivo: {selectedTicketReservation.reason}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1">
              <span className="font-bold text-xs uppercase text-gray-900">
                Detalle de Productos ({selectedTicketReservation.items?.length || selectedTicketReservation.labelIds.length} paquetes):
              </span>
              <table className="w-full text-left text-xs border border-black">
                <thead className="bg-gray-200 font-bold uppercase text-[10px] border-b border-black">
                  <tr>
                    <th className="p-1.5 border-r border-black">Código</th>
                    <th className="p-1.5 border-r border-black">Producto</th>
                    <th className="p-1.5 border-r border-black">Lote</th>
                    <th className="p-1.5 border-r border-black">Almacén</th>
                    <th className="p-1.5 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {selectedTicketReservation.items && selectedTicketReservation.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-1.5 border-r border-gray-300 font-bold">{it.productCode}</td>
                      <td className="p-1.5 border-r border-gray-300 font-bold">{it.productName}</td>
                      <td className="p-1.5 border-r border-gray-300">{it.lot}</td>
                      <td className="p-1.5 border-r border-gray-300">Congelado</td>
                      <td className="p-1.5 text-right font-black">{it.weight.toFixed(2)} {it.unit}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-black border-t-2 border-black">
                  <tr>
                    <td colSpan={4} className="p-1.5 text-right uppercase">TOTAL ORDEN:</td>
                    <td className="p-1.5 text-right text-sm">{selectedTicketReservation.totalWeight.toFixed(2)} KG</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedTicketReservation.notes && (
              <div className="bg-amber-50 p-2 border border-amber-300 text-xs">
                <strong>Instrucciones:</strong> "{selectedTicketReservation.notes}"
              </div>
            )}

            {/* Signature Box */}
            <div className="grid grid-cols-3 gap-2 pt-6 border-t border-gray-400 text-center text-[10px]">
              <div>
                <div className="border-b border-black mb-1 h-8"></div>
                <span className="font-bold block">Firma Desarrollador</span>
                <span>({selectedTicketReservation.developerName})</span>
              </div>
              <div>
                <div className="border-b border-black mb-1 h-8"></div>
                <span className="font-bold block">Aprobado Telemarketing</span>
                <span>({selectedTicketReservation.approvedBy || activeUser?.name || 'Telemarketing'})</span>
              </div>
              <div>
                <div className="border-b border-black mb-1 h-8"></div>
                <span className="font-bold block">Despachado Almacén</span>
                <span>(Firma / Sello Frigorífico)</span>
              </div>
            </div>

            {/* Print & Close Controls */}
            <div className="flex items-center justify-between pt-3 border-t-2 border-black print:hidden">
              <span className="text-[10px] text-gray-500">Impresión autorizada de Ticket</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-black hover:bg-gray-800 text-white font-bold px-4 py-2 rounded text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicketReservation(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-black font-bold px-4 py-2 rounded text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL MODAL (EXCLUSIVO PRODUCTO NO CONFORME - PNC) */}
      {approvingReservation && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-mono text-xs">
          <div className="bg-white border-2 border-emerald-600 rounded-xs shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-emerald-800 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Aprobar {isOrder(approvingReservation) ? 'Pedido de Venta' : 'Solicitud de Muestras'} PNC #{approvingReservation.internalFolio || approvingReservation.id.slice(-6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovingReservation(null)}
                className="text-emerald-200 hover:text-white cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const approver = activeUser ? `${activeUser.name} (${activeUser.role || 'Telemarketing'})` : 'Telemarketing';
                updateMarketReservationStatus(
                  approvingReservation.id,
                  'APROBADO',
                  approver,
                  pncInternalFolioInput.trim() || undefined
                );
                setFormSuccessMessage(`¡${isOrder(approvingReservation) ? 'Pedido' : 'Solicitud'} PNC #${approvingReservation.internalFolio || approvingReservation.id.slice(-6)} aprobado exitosamente!`);
                setApprovingReservation(null);
                setPncInternalFolioInput('');
              }}
              className="p-4 space-y-4"
            >
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-emerald-950 text-[11px] space-y-1">
                <p>
                  <strong>Tipo:</strong> {isOrder(approvingReservation) ? 'Pedido de Venta Comercial PNC' : 'Solicitud de Muestras PNC'}
                </p>
                <p>
                  <strong>Cliente / Evento:</strong> {approvingReservation.clientOrEvent}
                </p>
                <p>
                  <strong>Desarrollador Solicitante:</strong> {approvingReservation.developerName} {approvingReservation.developerZone && `(${approvingReservation.developerZone})`}
                </p>
                <p>
                  <strong>Total Solicitado:</strong> {approvingReservation.totalWeight.toFixed(2)} KG ({approvingReservation.items?.length || approvingReservation.labelIds.length} cajas de PNC)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 uppercase">
                  Folio Interno / Referencia Comercial PNC (Opcional):
                </label>
                <input
                  type="text"
                  value={pncInternalFolioInput}
                  onChange={(e) => setPncInternalFolioInput(e.target.value)}
                  placeholder={approvingReservation.internalFolio || "Ej: PNC-VTA-104 o REF-PNC-2026"}
                  className="w-full bg-white border border-gray-300 p-2.5 rounded text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 uppercase"
                  autoFocus
                />
                <p className="text-[10px] text-gray-500 italic">
                  * Asigne una referencia interna o mantenga el folio automático de control para seguimiento y trazabilidad interna de PNC.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-2.5 rounded text-[11px] text-amber-950">
                ℹ️ Al aprobar, el pedido quedará validado para preparación física y posterior despacho con descuento de inventario en Almacén Congelado PNC.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setApprovingReservation(null)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar Orden PNC</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PNC INVENTORY DISPATCH & DISCOUNT CONFIRMATION MODAL */}
      {dispatchingReservation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-mono text-xs">
          <div className="bg-white border-2 border-indigo-600 rounded-xs shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="bg-indigo-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Despacho y Descuento de Inventario PNC #{dispatchingReservation.internalFolio || dispatchingReservation.id.slice(-6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchingReservation(null)}
                className="text-indigo-200 hover:text-white cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const dispatcher = activeUser ? `${activeUser.name} (${activeUser.role || 'Telemarketing / Almacén'})` : 'Almacén / Telemarketing';
                const now = new Date().toISOString();
                const assignedFolio = pncExitFolioInput.trim() || dispatchingReservation.internalFolio;
                updateMarketReservationStatus(
                  dispatchingReservation.id,
                  'DESPACHADO',
                  dispatcher,
                  assignedFolio || undefined
                );
                const updatedOrder: MarketReservation = {
                  ...dispatchingReservation,
                  status: 'DESPACHADO',
                  dischargedAt: now,
                  dischargedBy: dispatcher,
                  internalFolio: assignedFolio || dispatchingReservation.internalFolio,
                };
                setViewingVoucherReservation(updatedOrder);
                setFormSuccessMessage(`¡Inventario descontado exitosamente! Se despacharon ${dispatchingReservation.totalWeight.toFixed(2)} KG de Producto No Conforme (${dispatchingReservation.items?.length || dispatchingReservation.labelIds.length} cajas) para ${dispatchingReservation.clientOrEvent}.`);
                setDispatchingReservation(null);
                setPncExitFolioInput('');
              }}
              className="p-4 space-y-4"
            >
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded text-indigo-950 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-indigo-900">
                    {isOrder(dispatchingReservation) ? '🛍️ Pedido de Venta Comercial' : '🔖 Solicitud de Muestras'}
                  </span>
                  <span className="bg-indigo-200 text-indigo-950 font-black px-2 py-0.5 rounded text-[10px]">
                    PRODUCTO NO CONFORME (PNC)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-200/60">
                  <div>
                    <span className="text-gray-600 block text-[10px]">Cliente / Evento:</span>
                    <strong className="text-gray-900">{dispatchingReservation.clientOrEvent}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600 block text-[10px]">Desarrollador:</span>
                    <strong className="text-gray-900">{dispatchingReservation.developerName}</strong>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-gray-600 block text-[10px]">Total a Descontar:</span>
                  <strong className="text-indigo-950 text-sm">
                    {dispatchingReservation.totalWeight.toFixed(2)} KG en {dispatchingReservation.items?.length || dispatchingReservation.labelIds.length} caja(s)
                  </strong>
                </div>
              </div>

              {/* Items preview */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 uppercase mb-1">
                  Cajas que serán descontadas de Almacén Congelado:
                </label>
                <div className="bg-gray-50 border border-gray-300 rounded max-h-32 overflow-y-auto divide-y divide-gray-200 p-2 text-[10px]">
                  {dispatchingReservation.items?.map((it, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between">
                      <span className="font-mono text-gray-800">
                        [{it.productCode}] {it.productName} (Lote: {it.lot})
                      </span>
                      <span className="font-black text-gray-900">
                        {it.weight.toFixed(2)} {it.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 uppercase">
                  Folio de Salida / Remisión / Vale de Despacho (Opcional):
                </label>
                <input
                  type="text"
                  value={pncExitFolioInput}
                  onChange={(e) => setPncExitFolioInput(e.target.value)}
                  placeholder={`REM-PNC-${dispatchingReservation.id.slice(-5)}`}
                  className="w-full bg-white border border-gray-300 p-2 rounded text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="bg-amber-50 p-2.5 rounded border border-amber-300 text-[11px] text-amber-950 font-semibold space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Descuento Definitivo en Inventario PNC</span>
                </div>
                <p className="text-[10px] text-amber-900/90 font-normal">
                  Al confirmar, las etiquetas cambiarán inmediatamente a estado <strong>DESPACHADO</strong> en Firebase, se descontarán del stock físico disponible y se generará el registro de salida correspondiente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setDispatchingReservation(null)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer flex items-center gap-1.5 shadow-md uppercase text-xs"
                >
                  <Truck className="w-4 h-4" />
                  <span>Confirmar Salida y Descontar Cajas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCELLATION REASON MANDATORY MODAL */}
      {cancellingReservation && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-mono text-xs">
          <div className="bg-white border-2 border-rose-600 rounded-xs shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-rose-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Cancelar Solicitud de Pedido #{cancellingReservation.id.slice(-6)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingReservation(null)}
                className="text-rose-200 hover:text-white cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCancellation} className="p-4 space-y-4">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded text-rose-950 text-[11px] space-y-1">
                <p>
                  <strong>Cliente / Evento:</strong> {cancellingReservation.clientOrEvent}
                </p>
                <p>
                  <strong>Desarrollador Solicitante:</strong> {cancellingReservation.developerName} {cancellingReservation.developerZone && `(${cancellingReservation.developerZone})`}
                </p>
                <p>
                  <strong>Total Solicitado:</strong> {cancellingReservation.totalWeight.toFixed(2)} KG ({cancellingReservation.items?.length || cancellingReservation.labelIds.length} ítems)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 uppercase">
                  Motivo Obligatorio de Cancelación: <span className="text-rose-600">*</span>
                </label>
                <select
                  value={cancellationReasonSelect}
                  onChange={(e) => setCancellationReasonSelect(e.target.value)}
                  className="w-full bg-white border border-gray-300 p-2 rounded text-xs font-bold text-gray-900 focus:ring-2 focus:ring-rose-500"
                  required
                >
                  <option value="Cliente canceló o rechazó el pedido">Cliente canceló o rechazó el pedido</option>
                  <option value="Sin existencias / Faltante en almacén Producto No Conforme">Sin existencias / Faltante en almacén Producto No Conforme</option>
                  <option value="Error de captura de cajas / Pedido duplicado">Error de captura de cajas / Pedido duplicado</option>
                  <option value="Condición comercial o precio no autorizado">Condición comercial o precio no autorizado</option>
                  <option value="Fecha de entrega vencida / No factible">Fecha de entrega vencida / No factible</option>
                  <option value="Otra razón (Especificar a continuación)">Otra razón (Especificar a continuación)</option>
                </select>

                {cancellationReasonSelect === 'Otra razón (Especificar a continuación)' && (
                  <input
                    type="text"
                    value={cancellationReasonCustom}
                    onChange={(e) => setCancellationReasonCustom(e.target.value)}
                    placeholder="Especifique la razón de cancelación..."
                    className="w-full bg-white border border-rose-300 p-2 rounded text-xs font-bold text-gray-900 mt-1 focus:ring-2 focus:ring-rose-500"
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Observaciones o Notas Adicionales (Opcional):
                </label>
                <textarea
                  value={cancellationNotesText}
                  onChange={(e) => setCancellationNotesText(e.target.value)}
                  rows={2}
                  placeholder="Detalles para la consulta en el Registro de Cancelaciones de Firebase..."
                  className="w-full bg-white border border-gray-300 p-2 rounded text-xs text-gray-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="bg-amber-50 p-2 rounded border border-amber-300 text-[10px] text-amber-950 font-semibold">
                ⚠️ Al confirmar la cancelación, el pedido cambiará a estatus <strong>CANCELADO</strong>, las existencias apartadas se liberarán inmediatamente en Firebase y se guardará un registro permanente en el historial de cancelaciones.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCancellingReservation(null)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-bold cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancellation}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isSubmittingCancellation ? 'Procesando...' : 'Confirmar Cancelación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCELLATION AUDIT RECORD DETAIL MODAL */}
      {selectedCancellationRecordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 z-50 font-mono text-xs animate-fade-in">
          <div className="bg-white border-4 border-rose-600 rounded-xs max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <div className="flex items-center gap-2 text-rose-900">
                <XCircle className="w-6 h-6" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  REGISTRO AUDITABLE DE CANCELACIÓN DE PEDIDO
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCancellationRecordModal(null)}
                className="text-gray-500 hover:text-black font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded space-y-2 text-rose-950">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Folio Solicitud:</span>
                  <span className="font-mono font-bold text-sm">#{selectedCancellationRecordModal.reservationId}</span>
                </div>

                <div>
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Fecha / Hora Cancelación:</span>
                  <span className="font-bold">{formatFullDateTime(selectedCancellationRecordModal.cancelledAt)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Cliente / Evento:</span>
                  <span className="font-bold">{selectedCancellationRecordModal.clientOrEvent}</span>
                </div>

                <div>
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Desarrollador:</span>
                  <span className="font-bold">{selectedCancellationRecordModal.developerName} ({selectedCancellationRecordModal.developerZone || 'Zona General'})</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 p-3 rounded bg-gray-50 space-y-2">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Motivo Registrado:</span>
                <span className="bg-rose-600 text-white px-2.5 py-1 rounded font-black text-xs inline-block mt-0.5">
                  {selectedCancellationRecordModal.cancellationReason}
                </span>
              </div>

              {selectedCancellationRecordModal.cancellationNotes && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Observaciones:</span>
                  <p className="italic text-gray-800 bg-white p-2 border border-gray-200 rounded text-[11px]">
                    "{selectedCancellationRecordModal.cancellationNotes}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-[11px]">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Cancelado Por:</span>
                  <span className="font-bold text-gray-900">{selectedCancellationRecordModal.cancelledBy}</span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Origen de Producto:</span>
                  <span className="font-bold text-gray-900">{selectedCancellationRecordModal.sourceType}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-gray-700 block mb-1">
                Resumen de ítems liberados al inventario ({selectedCancellationRecordModal.totalItems} ítems - {selectedCancellationRecordModal.totalWeight.toFixed(2)} KG):
              </span>
              <div className="bg-gray-100 p-2.5 border border-gray-300 rounded font-mono text-[10px] text-gray-800 max-h-28 overflow-y-auto">
                {selectedCancellationRecordModal.itemsSummary}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedCancellationRecordModal(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white font-bold rounded cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL: MARKET SCHEDULE CONFIGURATION */}
      {isScheduleModalOpen && activeUser?.role === 'Jefe de Ventas' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 z-50 animate-fade-in font-mono text-xs">
          <div className="bg-white border-2 border-[#141414] rounded-xs max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-800" />
                <h3 className="font-bold text-base text-gray-900 uppercase">
                  Horario de Venta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-gray-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 pt-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer bg-gray-50 p-3 rounded-xs border border-gray-200">
                <input
                  type="checkbox"
                  checked={marketSettings?.scheduleEnabled}
                  onChange={(e) => updateMarketSettings({ scheduleEnabled: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <span>Habilitar Horario Automático</span>
              </label>

              {marketSettings?.scheduleEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-gray-600 font-bold uppercase text-[10px]">Apertura</label>
                    <input
                      type="time"
                      value={marketSettings?.openTime}
                      onChange={(e) => updateMarketSettings({ openTime: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-2 rounded-xs focus:ring-1 focus:ring-black outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-gray-600 font-bold uppercase text-[10px]">Cierre</label>
                    <input
                      type="time"
                      value={marketSettings?.closeTime}
                      onChange={(e) => updateMarketSettings({ closeTime: e.target.value })}
                      className="w-full bg-white border border-gray-300 p-2 rounded-xs focus:ring-1 focus:ring-black outline-none font-bold"
                    />
                  </div>
                </div>
              )}

              <p className="text-gray-500 text-[10px] italic leading-tight">
                Nota: El botón "Liberar/Cerrar Venta" permite forzar o adelantar la apertura y cierre en cualquier momento.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-200 mt-2">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-6 py-2 bg-[#141414] hover:bg-[#282824] text-amber-400 font-black uppercase text-xs rounded-xs cursor-pointer shadow-sm"
              >
                Cerrar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {/* Official Order Dispatch Voucher Modal */}
      {viewingVoucherReservation && (
        <OrderDispatchVoucherModal
          reservation={viewingVoucherReservation}
          onClose={() => setViewingVoucherReservation(null)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
};
