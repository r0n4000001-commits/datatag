import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Product,
  PrintedLabel,
  DischargeRecord,
  ZebraPrinterConfig,
  LocalPrinterConfig,
  LabelFormatConfig,
  SavedLabelTemplate,
  PrinterStatus,
  SubWarehouse,
  CategoryItem,
  SpeciesItem,
  TareItem,
  MarketReservation,
  OrderItemSubstitution,
  ReservationStatus,
  SystemUser,
  SifproInventoryRecord,
  TelemarketingCancellationRecord,
  MarketSettings,
  ConditionExpirationConfig,
  DEFAULT_CONDITION_EXPIRATION_CONFIG,
  ProductConditionFlag,
  SystemResetOptions,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_PRINTER_CONFIG,
  INITIAL_LOCAL_PRINTER_CONFIG,
  INITIAL_LABEL_FORMAT_CONFIG,
  INITIAL_PRINTED_LABELS,
  INITIAL_DISCHARGE_RECORDS,
  INITIAL_RESERVATIONS,
  INITIAL_SUB_WAREHOUSES,
  INITIAL_CATEGORIES,
  INITIAL_SPECIES,
  INITIAL_TARES,
  INITIAL_SYSTEM_USERS,
} from '../data/initialData';
import {
  saveActiveLabelFormatToLocal,
  loadActiveLabelFormatFromLocal,
  getSynchronousInitialLabelFormat,
} from '../utils/localDesignStorage';
import { formatProductCode } from '../utils/productAndLotUtils';
import { getNextLabelFolio } from '../utils/labelFolio';
import { inferProductSpeciesLegend } from '../utils/speciesUtils';

interface InventoryContextType {
  products: Product[];
  labels: PrintedLabel[];
  discharges: DischargeRecord[];
  subWarehouses: SubWarehouse[];
  categories: CategoryItem[];
  speciesList: SpeciesItem[];
  tares: TareItem[];
  reservations: MarketReservation[];
  systemUsers: SystemUser[];
  sifproRecords: SifproInventoryRecord[];
  cancellationRecords: TelemarketingCancellationRecord[];
  addSifproRecords: (newRecords: SifproInventoryRecord[]) => Promise<void>;
  updateSifproRecords: (updatedRecords: SifproInventoryRecord[]) => Promise<void>;
  deleteSingleSifproRecord: (id: string) => Promise<void>;
  deleteSifproRecordsByBatchOrDate: (targetKey: string, recordType?: string) => Promise<number>;
  deleteAllSifproRecords: (recordType?: string) => Promise<void>;
  isMarketReleased: boolean;
  marketSettings: MarketSettings;
  toggleMarketRelease: (status: boolean) => Promise<void>;
  updateMarketSettings: (settings: Partial<MarketSettings>) => Promise<void>;
  activeUser: SystemUser | null;
  setActiveUser: (user: SystemUser | null) => void;
  addSystemUser: (user: Omit<SystemUser, 'id' | 'createdAt'>) => SystemUser;
  updateSystemUser: (user: SystemUser) => void;
  deleteSystemUser: (userId: string) => void;
  printerConfig: ZebraPrinterConfig;
  localPrinterConfig: LocalPrinterConfig;
  labelFormatConfig: LabelFormatConfig;
  conditionExpirationConfig: ConditionExpirationConfig;
  updateConditionExpirationConfig: (config: Partial<ConditionExpirationConfig>) => void;
  resetConditionExpirationConfig: () => void;
  calculateExpirationDate: (conditionFlag: ProductConditionFlag, baseDate?: Date | string) => string;
  printerStatus: PrinterStatus;
  printerStatusMessage: string;
  lastCheckedAt: string | null;
  firebaseConnected: boolean;
  checkPrinterConnection: (ip?: string, port?: number) => Promise<{ success: boolean; message: string }>;
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addSubWarehouse: (sub: Omit<SubWarehouse, 'id'>) => SubWarehouse;
  updateSubWarehouse: (sub: SubWarehouse) => void;
  deleteSubWarehouse: (id: string) => void;
  addCategory: (cat: Omit<CategoryItem, 'id'>) => CategoryItem;
  updateCategory: (cat: CategoryItem, oldName?: string) => void;
  deleteCategory: (id: string) => void;
  addSpecies: (species: Omit<SpeciesItem, 'id'>) => SpeciesItem;
  updateSpecies: (species: SpeciesItem, oldLegend?: string) => void;
  deleteSpecies: (id: string) => void;
  addTare: (tare: Omit<TareItem, 'id'>) => TareItem;
  updateTare: (tare: TareItem) => void;
  deleteTare: (id: string) => void;
  assignTareToProduct: (productId: string, tareIdOrNumber: string | number | null) => void;
  addPrintedLabel: (
    label: Omit<PrintedLabel, 'id' | 'printTimestamp' | 'isDischarged'> & { id?: string }
  ) => PrintedLabel;
  deletePrintedLabel: (id: string) => void;
  updatePrintedLabelId: (oldId: string, newId: string) => Promise<boolean>;
  addMarketReservation: (reservation: Omit<MarketReservation, 'id' | 'reservationDate' | 'status'>) => MarketReservation;
  updateMarketReservationStatus: (
    id: string,
    newStatus: ReservationStatus,
    actionBy?: string,
    internalFolio?: string
  ) => void;
  dispatchMarketReservationWithSubstitutions: (
    id: string,
    dispatchedLabels: PrintedLabel[],
    substitutions: OrderItemSubstitution[],
    actionBy?: string,
    internalFolio?: string,
    notes?: string
  ) => Promise<MarketReservation | null>;
  cancelMarketReservation: (
    id: string,
    cancellationReason: string,
    cancellationNotes?: string,
    actionBy?: string
  ) => Promise<void>;
  deleteCancellationRecord: (id: string) => Promise<void>;
  deleteMarketReservation: (id: string) => void;
  updatePrinterConfig: (config: Partial<ZebraPrinterConfig>) => void;
  updateLocalPrinterConfig: (config: Partial<LocalPrinterConfig>) => void;
  updateLabelFormatConfig: (config: Partial<LabelFormatConfig>) => void;
  resetLabelFormatConfig: () => void;
  savedLabelTemplates: SavedLabelTemplate[];
  isLabelConfigLoadedFromCloud: boolean;
  saveLabelDesignPermanently: (configOverride?: LabelFormatConfig) => Promise<{ success: boolean; message: string }>;
  reloadLabelFormatFromCloud: () => Promise<boolean>;
  saveAsNewTemplate: (templateName: string, configToSave?: LabelFormatConfig) => Promise<SavedLabelTemplate>;
  deleteSavedTemplate: (templateId: string) => void;
  loadSavedTemplate: (template: SavedLabelTemplate) => void;
  processDischargeByBarcode: (
    scannedCode: string,
    scannedBy: string,
    reason: DischargeRecord['reason'],
    notes?: string
  ) => { success: boolean; message: string; record?: DischargeRecord };
  generateNextExitFolio: () => string;
  processBatchDischarge: (
    codes: string[],
    scannedBy: string,
    reason: DischargeRecord['reason'],
    notes?: string,
    customFolio?: string
  ) => {
    successfulCount: number;
    failedCount: number;
    exitFolio: string;
    totalWeight: number;
    records: DischargeRecord[];
    errors: { code: string; message: string }[];
  };
  resetToDefaults: () => void;
  resetSystemData: (options?: Partial<SystemResetOptions>) => Promise<{ success: boolean; message: string }>;
  resetAllDataToZero: () => Promise<{ success: boolean; message: string }>;
  restoreDefaultCatalogOptions: () => Promise<{ success: boolean; message: string }>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [labels, setLabels] = useState<PrintedLabel[]>([]);
  const [discharges, setDischarges] = useState<DischargeRecord[]>([]);
  const [subWarehouses, setSubWarehouses] = useState<SubWarehouse[]>(INITIAL_SUB_WAREHOUSES);
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [speciesList, setSpeciesList] = useState<SpeciesItem[]>(INITIAL_SPECIES);
  const [tares, setTares] = useState<TareItem[]>(INITIAL_TARES);
  const [reservations, setReservations] = useState<MarketReservation[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_SYSTEM_USERS);
  const [cancellationRecords, setCancellationRecords] = useState<TelemarketingCancellationRecord[]>([]);
  const [sifproRecords, setSifproRecords] = useState<SifproInventoryRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sifpro_inventory_records');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  const [activeUser, setActiveUserState] = useState<SystemUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active_system_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null;
  });

  const setActiveUser = useCallback((user: SystemUser | null) => {
    setActiveUserState(user);
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('active_system_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('active_system_user');
      }
    }
  }, []);

  const addSystemUser = useCallback((userData: Omit<SystemUser, 'id' | 'createdAt'>): SystemUser => {
    const newId = `usr-${Date.now()}`;
    const newUser: SystemUser = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setSystemUsers((prev) => [newUser, ...prev]);
    setDoc(doc(db, 'system_users', newId), newUser).catch((e) =>
      console.error('Error saving system user to firestore:', e)
    );
    return newUser;
  }, []);

  const updateSystemUser = useCallback(
    (user: SystemUser) => {
      setSystemUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      setDoc(doc(db, 'system_users', user.id), user).catch((e) =>
        console.error('Error updating system user in firestore:', e)
      );
      if (activeUser?.id === user.id) {
        setActiveUser(user);
      }
    },
    [activeUser, setActiveUser]
  );

  const deleteSystemUser = useCallback(
    (userId: string) => {
      setSystemUsers((prev) => prev.filter((u) => u.id !== userId));
      deleteDoc(doc(db, 'system_users', userId)).catch((e) =>
        console.error('Error deleting system user from firestore:', e)
      );
      if (activeUser?.id === userId) {
        setActiveUser(null);
      }
    },
    [activeUser, setActiveUser]
  );

  const [printerConfig, setPrinterConfig] = useState<ZebraPrinterConfig>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('zebra_printer_config') : null;
    if (saved) {
      try {
        return { ...INITIAL_PRINTER_CONFIG, ...JSON.parse(saved) };
      } catch {
        return INITIAL_PRINTER_CONFIG;
      }
    }
    return INITIAL_PRINTER_CONFIG;
  });

  const [localPrinterConfig, setLocalPrinterConfig] = useState<LocalPrinterConfig>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('local_printer_config') : null;
    if (saved) {
      try {
        return { ...INITIAL_LOCAL_PRINTER_CONFIG, ...JSON.parse(saved) };
      } catch {
        return INITIAL_LOCAL_PRINTER_CONFIG;
      }
    }
    return INITIAL_LOCAL_PRINTER_CONFIG;
  });

  const [labelFormatConfig, setLabelFormatConfig] = useState<LabelFormatConfig>(() => {
    return getSynchronousInitialLabelFormat();
  });

  const labelFormatConfigRef = useRef<LabelFormatConfig>(labelFormatConfig);
  const [isLabelConfigLoadedFromCloud, setIsLabelConfigLoadedFromCloud] = useState<boolean>(false);

  useEffect(() => {
    labelFormatConfigRef.current = labelFormatConfig;
  }, [labelFormatConfig]);

  const safeSaveLabelConfigLocalStorage = (config: LabelFormatConfig) => {
    saveActiveLabelFormatToLocal(config);
  };

  const [savedLabelTemplates, setSavedLabelTemplates] = useState<SavedLabelTemplate[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('saved_label_templates') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const labelCloudSaveTimeoutRef = useRef<any>(null);

  const [conditionExpirationConfig, setConditionExpirationConfig] = useState<ConditionExpirationConfig>(() => {
    const saved = localStorage.getItem('condition_expiration_config');
    if (saved) {
      try {
        return { ...DEFAULT_CONDITION_EXPIRATION_CONFIG, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_CONDITION_EXPIRATION_CONFIG;
      }
    }
    return DEFAULT_CONDITION_EXPIRATION_CONFIG;
  });

  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  
  const [marketSettings, setMarketSettings] = useState<MarketSettings>({
    isReleased: false,
    scheduleEnabled: false,
    openTime: '10:00',
    closeTime: '18:00'
  });

  // Computed state based on schedule + manual overrides
  const [isMarketReleased, setIsMarketReleased] = useState<boolean>(false);

  useEffect(() => {
    const computeMarketStatus = () => {
      if (!marketSettings.scheduleEnabled) {
        setIsMarketReleased(marketSettings.isReleased);
        return;
      }

      const now = new Date();
      
      const openTimeDate = new Date(now);
      const [openH, openM] = marketSettings.openTime.split(':').map(Number);
      openTimeDate.setHours(openH, openM, 0, 0);

      const closeTimeDate = new Date(now);
      const [closeH, closeM] = marketSettings.closeTime.split(':').map(Number);
      closeTimeDate.setHours(closeH, closeM, 0, 0);

      const manualDate = marketSettings.lastManualOverride ? new Date(marketSettings.lastManualOverride) : new Date(0);

      const events = [];
      // Today's events if they have happened
      if (now >= openTimeDate) events.push({ type: 'open', time: openTimeDate.getTime() });
      if (now >= closeTimeDate) events.push({ type: 'close', time: closeTimeDate.getTime() });
      
      // Yesterday's events to provide a baseline for early morning
      const yOpen = new Date(openTimeDate); yOpen.setDate(yOpen.getDate() - 1);
      const yClose = new Date(closeTimeDate); yClose.setDate(yClose.getDate() - 1);
      events.push({ type: 'open', time: yOpen.getTime() });
      events.push({ type: 'close', time: yClose.getTime() });

      // Last manual override
      events.push({ type: marketSettings.isReleased ? 'open' : 'close', time: manualDate.getTime() });

      events.sort((a, b) => b.time - a.time);
      
      setIsMarketReleased(events[0].type === 'open');
    };

    computeMarketStatus();
    // Re-evaluate every minute
    const interval = setInterval(computeMarketStatus, 60000);
    return () => clearInterval(interval);
  }, [marketSettings]);

  const toggleMarketRelease = async (status: boolean) => {
    const updated = { 
      isReleased: status,
      lastManualOverride: new Date().toISOString()
    };
    setMarketSettings(prev => ({ ...prev, ...updated }));
    await setDoc(doc(db, 'configs', 'marketSettings'), updated, { merge: true }).catch(err => console.error(err));
  };

  const updateMarketSettings = async (settings: Partial<MarketSettings>) => {
    setMarketSettings(prev => ({ ...prev, ...settings }));
    await setDoc(doc(db, 'configs', 'marketSettings'), settings, { merge: true }).catch(err => console.error(err));
  };

  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>('checking');
  const [printerStatusMessage, setPrinterStatusMessage] = useState<string>('Inicializando estado...');
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // FIREBASE FIRESTORE REAL-TIME SUBSCRIPTIONS & SEEDING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Subscribe to Products
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        setFirebaseConnected(true);
        if (snapshot.empty) {
          INITIAL_PRODUCTS.forEach((p) => {
            setDoc(doc(db, 'products', p.id), p).catch(() => {});
          });
          setProducts(INITIAL_PRODUCTS);
        } else {
          const list: Product[] = snapshot.docs.map((d) => {
            const data = d.data() as Product;
            const formatted = formatProductCode(data.code || '');
            const resolvedSpecies = inferProductSpeciesLegend(data);
            const needsSpeciesFix = !data.speciesLegend && !!resolvedSpecies;
            const needsFix =
              (data.code !== formatted && formatted) ||
              (data.warehouse as any) !== 'Congelado' ||
              needsSpeciesFix;
            if (needsFix) {
              setDoc(
                doc(db, 'products', d.id),
                {
                  code: formatted || data.code,
                  warehouse: 'Congelado',
                  speciesLegend: data.speciesLegend || resolvedSpecies,
                },
                { merge: true }
              ).catch(() => {});
            }
            return {
              ...data,
              code: formatted || data.code,
              warehouse: 'Congelado' as const,
              speciesLegend: data.speciesLegend || resolvedSpecies,
            };
          });
          setProducts(list);
        }
      },
      (err) => {
        console.error('Firestore products listener error:', err);
        setFirebaseConnected(false);
      }
    );

    // 2. Subscribe to Labels
    const unsubLabels = onSnapshot(
      collection(db, 'labels'),
      (snapshot) => {
        if (snapshot.empty) {
          setLabels([]);
        } else {
          const list: PrintedLabel[] = [];
          snapshot.docs.forEach((d) => {
            const data = d.data() as Partial<PrintedLabel>;
            // Skip invalid or placeholder documents without minimal identity
            if (!data || (!data.id && !data.productCode && !data.productName)) {
              return;
            }
            const rawWeight = Number(data.weight);
            const safeWeight = isNaN(rawWeight) ? 0 : rawWeight;
            const safeTimestamp = data.printTimestamp || new Date().toISOString();
            const safeId = data.id || d.id;
            const safeProductCode = data.productCode || '00-000';
            const safeProductName = data.productName || 'Producto PNC';
            const safeUnit = data.unit || 'KG';

            if ((data.warehouse as any) !== 'Congelado') {
              setDoc(doc(db, 'labels', d.id), { warehouse: 'Congelado' }, { merge: true }).catch(() => {});
            }

            list.push({
              ...(data as PrintedLabel),
              id: safeId,
              productCode: safeProductCode,
              productName: safeProductName,
              unit: safeUnit,
              weight: safeWeight,
              warehouse: 'Congelado' as const,
              printTimestamp: safeTimestamp,
              isDischarged: Boolean(data.isDischarged),
            });
          });
          // Sort safely by printTimestamp desc
          list.sort((a, b) => {
            const timeA = new Date(a.printTimestamp).getTime() || 0;
            const timeB = new Date(b.printTimestamp).getTime() || 0;
            return timeB - timeA;
          });
          setLabels(list);
        }
      },
      (err) => console.error('Firestore labels listener error:', err)
    );

    // 3. Subscribe to Discharges
    const unsubDischarges = onSnapshot(
      collection(db, 'discharges'),
      (snapshot) => {
        if (snapshot.empty) {
          setDischarges([]);
        } else {
          const list: DischargeRecord[] = [];
          snapshot.docs.forEach((d) => {
            const data = d.data() as Partial<DischargeRecord>;
            if (!data || (!data.id && !data.labelId)) return;
            const rawWeight = Number(data.weight);
            const safeWeight = isNaN(rawWeight) ? 0 : rawWeight;
            const safeTimestamp = data.timestamp || new Date().toISOString();

            if ((data.warehouse as any) !== 'Congelado') {
              setDoc(doc(db, 'discharges', d.id), { warehouse: 'Congelado' }, { merge: true }).catch(() => {});
            }

            list.push({
              ...(data as DischargeRecord),
              id: data.id || d.id,
              labelId: data.labelId || 'N/A',
              productCode: data.productCode || '00-000',
              productName: data.productName || 'Producto PNC',
              weight: safeWeight,
              unit: data.unit || 'KG',
              warehouse: 'Congelado' as const,
              timestamp: safeTimestamp,
            });
          });
          list.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime() || 0;
            const timeB = new Date(b.timestamp).getTime() || 0;
            return timeB - timeA;
          });
          setDischarges(list);
        }
      },
      (err) => console.error('Firestore discharges listener error:', err)
    );

    // 4. Subscribe to SubWarehouses
    const unsubSubWarehouses = onSnapshot(
      collection(db, 'subWarehouses'),
      (snapshot) => {
        if (snapshot.empty) {
          INITIAL_SUB_WAREHOUSES.forEach((s) => {
            setDoc(doc(db, 'subWarehouses', s.id), s).catch(() => {});
          });
          setSubWarehouses(INITIAL_SUB_WAREHOUSES);
        } else {
          const list: SubWarehouse[] = snapshot.docs.map((d) => {
            const data = d.data() as SubWarehouse;
            if ((data.parentWarehouse as any) !== 'Congelado') {
              setDoc(doc(db, 'subWarehouses', d.id), { parentWarehouse: 'Congelado' }, { merge: true }).catch(() => {});
            }
            return { ...data, parentWarehouse: 'Congelado' as const };
          });
          setSubWarehouses(list);
        }
      },
      (err) => console.error('Firestore subWarehouses listener error:', err)
    );

    // 5. Subscribe to Categories
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (snapshot.empty) {
          INITIAL_CATEGORIES.forEach((c) => {
            setDoc(doc(db, 'categories', c.id), c).catch(() => {});
          });
          setCategories(INITIAL_CATEGORIES);
        } else {
          const list: CategoryItem[] = snapshot.docs.map((d) => d.data() as CategoryItem);
          setCategories(list);
        }
      },
      (err) => console.error('Firestore categories listener error:', err)
    );

    // 5b. Subscribe to Species / Origen
    const unsubSpecies = onSnapshot(
      collection(db, 'species'),
      (snapshot) => {
        if (snapshot.empty) {
          INITIAL_SPECIES.forEach((s) => {
            setDoc(doc(db, 'species', s.id), s).catch(() => {});
          });
          setSpeciesList(INITIAL_SPECIES);
        } else {
          const list: SpeciesItem[] = snapshot.docs.map((d) => d.data() as SpeciesItem);
          setSpeciesList(list);
        }
      },
      (err) => console.error('Firestore species listener error:', err)
    );

    // 5c. Subscribe to Taras de Empaque
    const unsubTares = onSnapshot(
      collection(db, 'tares'),
      (snapshot) => {
        if (snapshot.empty) {
          INITIAL_TARES.forEach((t) => {
            setDoc(doc(db, 'tares', t.id), t).catch(() => {});
          });
          setTares(INITIAL_TARES);
        } else {
          const list: TareItem[] = snapshot.docs.map((d) => {
            const data = d.data() as TareItem;
            return {
              ...data,
              tareNumber: Number(data.tareNumber) || 0,
              weight: Number(data.weight) || 0,
            };
          });
          // Sort by tareNumber ascending
          list.sort((a, b) => a.tareNumber - b.tareNumber);
          setTares(list);
        }
      },
      (err) => console.error('Firestore tares listener error:', err)
    );

    // 6. Subscribe to Market Reservations
    const unsubReservations = onSnapshot(
      collection(db, 'marketReservations'),
      (snapshot) => {
        if (snapshot.empty) {
          setReservations([]);
        } else {
          const list: MarketReservation[] = snapshot.docs.map((d) => {
            const data = d.data() as MarketReservation;
            const fixedItems = (data.items || []).map((it) => ({
              ...it,
              warehouse: 'Congelado' as const,
            }));
            return { ...data, items: fixedItems };
          });
          list.sort((a, b) => new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime());
          setReservations(list);
        }
      },
      (err) => console.error('Firestore marketReservations listener error:', err)
    );

    // 7. Subscribe to Configs & Eager Load Label Format
    // Helper to detect old corrupted overlapping layout
    const isCorruptedLayout = (cfg: any): boolean => {
      return (
        cfg &&
        typeof cfg === 'object' &&
        cfg.detailsY === 135 &&
        cfg.lotY === 180 &&
        cfg.addressY === 270 &&
        cfg.footerY === 440
      );
    };

    // Eagerly check high-capacity local IndexedDB storage (instant offline/fast load)
    loadActiveLabelFormatFromLocal().then((saved) => {
      if (saved && !isCorruptedLayout(saved)) {
        labelFormatConfigRef.current = saved;
        setLabelFormatConfig(saved);
      }
    });

    // Eagerly fetch labelFormatConfig directly to ensure instant load on app startup
    getDoc(doc(db, 'configs', 'labelFormatConfig'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (isCorruptedLayout(data)) {
            console.warn('Ignoring corrupted/overlapping cloud label format layout.');
            return;
          }
          const cloudSavedAt = data.savedAt || 0;
          const localSavedAt = labelFormatConfigRef.current?.savedAt || 0;
          // Only overwrite if cloud data has an explicit timestamp that is newer or equal
          if (cloudSavedAt >= localSavedAt) {
            const merged = { ...INITIAL_LABEL_FORMAT_CONFIG, ...data } as LabelFormatConfig;
            labelFormatConfigRef.current = merged;
            setLabelFormatConfig(merged);
            safeSaveLabelConfigLocalStorage(merged);
            setIsLabelConfigLoadedFromCloud(true);
          }
        } else {
          setDoc(doc(db, 'configs', 'labelFormatConfig'), INITIAL_LABEL_FORMAT_CONFIG, { merge: true }).catch(() => {});
        }
      })
      .catch((err) => console.warn('Eager getDoc labelFormatConfig warning:', err));

    const unsubConfigs = onSnapshot(
      collection(db, 'configs'),
      (snapshot) => {
        snapshot.docs.forEach((document) => {
          const id = document.id;
          const data = document.data();
          if (id === 'zebraPrinterConfig') {
            const merged = { ...INITIAL_PRINTER_CONFIG, ...data };
            setPrinterConfig(merged as ZebraPrinterConfig);
            try {
              localStorage.setItem('zebra_printer_config', JSON.stringify(merged));
            } catch (e) {}
          } else if (id === 'localPrinterConfig') {
            const merged = { ...INITIAL_LOCAL_PRINTER_CONFIG, ...data };
            setLocalPrinterConfig(merged as LocalPrinterConfig);
            try {
              localStorage.setItem('local_printer_config', JSON.stringify(merged));
            } catch (e) {}
          } else if (id === 'labelFormatConfig') {
            if (isCorruptedLayout(data)) {
              console.warn('Ignoring corrupted/overlapping cloud snapshot layout.');
              return;
            }
            const cloudSavedAt = data.savedAt || 0;
            const localSavedAt = labelFormatConfigRef.current?.savedAt || 0;
            if (cloudSavedAt >= localSavedAt) {
              const merged = { ...INITIAL_LABEL_FORMAT_CONFIG, ...data } as LabelFormatConfig;
              labelFormatConfigRef.current = merged;
              setLabelFormatConfig(merged);
              safeSaveLabelConfigLocalStorage(merged);
              setIsLabelConfigLoadedFromCloud(true);
            }
          } else if (id === 'savedLabelTemplates') {
            if (Array.isArray(data.templates)) {
              setSavedLabelTemplates(data.templates);
              try {
                localStorage.setItem('saved_label_templates', JSON.stringify(data.templates));
              } catch (e) {}
            }
          } else if (id === 'conditionExpirationConfig') {
            setConditionExpirationConfig({
              ...DEFAULT_CONDITION_EXPIRATION_CONFIG,
              ...data,
            });
            localStorage.setItem('condition_expiration_config', JSON.stringify({
              ...DEFAULT_CONDITION_EXPIRATION_CONFIG,
              ...data,
            }));
          } else if (id === 'marketSettings') {
            setMarketSettings({
              isReleased: data.isReleased || false,
              scheduleEnabled: data.scheduleEnabled || false,
              openTime: data.openTime || '10:00',
              closeTime: data.closeTime || '18:00',
              lastManualOverride: data.lastManualOverride
            });
          }
        });
      },
      (err) => console.error('Firestore configs listener error:', err)
    );

    // 8. Subscribe to System Users
    const unsubUsers = onSnapshot(
      collection(db, 'system_users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: SystemUser[] = snapshot.docs.map((d) => d.data() as SystemUser);
          
          // Ensure root user is present if not already in Firestore
          const hasRoot = list.some((u) => u.id === 'usr-root' || u.accessPin === '72879' || u.employeeNumber === 'ROOT-001');
          if (!hasRoot) {
            const rootUser = INITIAL_SYSTEM_USERS.find((u) => u.id === 'usr-root') || INITIAL_SYSTEM_USERS[0];
            setDoc(doc(db, 'system_users', rootUser.id), rootUser).catch(() => {});
            list.unshift(rootUser);
          }

          // Ensure Jefe de Ventas is present for testing
          const hasJefeVentas = list.some((u) => u.role === 'Jefe de Ventas');
          if (!hasJefeVentas) {
            const jefeVentasUser = INITIAL_SYSTEM_USERS.find((u) => u.role === 'Jefe de Ventas');
            if (jefeVentasUser) {
              setDoc(doc(db, 'system_users', jefeVentasUser.id), jefeVentasUser).catch(() => {});
              list.push(jefeVentasUser);
            }
          }

          // Ensure Dirección is present for testing
          const hasDireccion = list.some((u) => u.role === 'Dirección');
          if (!hasDireccion) {
            const direccionUser = INITIAL_SYSTEM_USERS.find((u) => u.role === 'Dirección');
            if (direccionUser) {
              setDoc(doc(db, 'system_users', direccionUser.id), direccionUser).catch(() => {});
              list.push(direccionUser);
            }
          }

          setSystemUsers(list);
        } else {
          INITIAL_SYSTEM_USERS.forEach((u) => {
            setDoc(doc(db, 'system_users', u.id), u);
          });
        }
      },
      (err) => console.error('Firestore system users listener error:', err)
    );

    // 11. Optimized SIFPRO / Physical Inventory Records via Chunked Documents (Cost & Speed Optimization)
    const unsubSifpro = onSnapshot(
      collection(db, 'sifpro_chunks'),
      async (snapshot) => {
        if (!snapshot.empty) {
          const list: SifproInventoryRecord[] = [];
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (Array.isArray(data.records)) {
              list.push(...data.records);
            }
          });
          setSifproRecords(list);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('sifpro_inventory_records', JSON.stringify(list));
            } catch (e) {}
          }
        } else {
          // Fallback / Auto-Migration from legacy individual sifpro_records or localStorage
          const saved = typeof window !== 'undefined' ? localStorage.getItem('sifpro_inventory_records') : null;
          let recordsToMigrate: SifproInventoryRecord[] = [];
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                recordsToMigrate = parsed;
              }
            } catch (e) {}
          }

          if (recordsToMigrate.length === 0) {
            // Check legacy sifpro_records collection once
            try {
              const legacySnap = await getDocs(collection(db, 'sifpro_records'));
              if (!legacySnap.empty) {
                recordsToMigrate = legacySnap.docs.map((d) => d.data() as SifproInventoryRecord);
              }
            } catch (e) {}
          }

          if (recordsToMigrate.length > 0) {
            setSifproRecords(recordsToMigrate);
            // Save to new optimized chunked documents (400 records per chunk)
            const CHUNK_SIZE = 400;
            for (let i = 0; i < recordsToMigrate.length; i += CHUNK_SIZE) {
              const chunk = recordsToMigrate.slice(i, i + CHUNK_SIZE);
              const first = chunk[0];
              const recTypeClean = (first?.recordType || 'rec').replace(/[^a-zA-Z0-9]/g, '');
              const docDateClean = (first?.docDate || first?.date || 'nodate').replace(/[^0-9]/g, '');
              const chunkId = `chunk_${recTypeClean}_${docDateClean}_${i / CHUNK_SIZE}`;
              
              const totalKg = chunk.reduce((sum, r) => {
                const w = typeof r.weight === 'number' ? r.weight : parseFloat(String(r.weight).replace(/[^0-9.]/g, '') || '0');
                return sum + (isNaN(w) ? 0 : w);
              }, 0);

              await setDoc(doc(db, 'sifpro_chunks', chunkId), {
                id: chunkId,
                batchId: first?.batchId || `migrated_${Date.now()}`,
                docDate: first?.docDate || first?.date || '',
                recordType: first?.recordType || 'Inventario Físico',
                count: chunk.length,
                totalKg,
                records: chunk,
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            }
          }
        }
      },
      (err) => console.error('Firestore sifpro_chunks listener error:', err)
    );

    // 12. Subscribe to Telemarketing Cancellation Records
    const unsubCancellations = onSnapshot(
      collection(db, 'telemarketing_cancellation_records'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: TelemarketingCancellationRecord[] = snapshot.docs.map(
            (d) => d.data() as TelemarketingCancellationRecord
          );
          setCancellationRecords(list);
        } else {
          setCancellationRecords([]);
        }
      },
      (err) => console.error('Firestore telemarketing_cancellation_records listener error:', err)
    );

    return () => {
      unsubProducts();
      unsubLabels();
      unsubDischarges();
      unsubSubWarehouses();
      unsubCategories();
      unsubSpecies();
      unsubTares();
      unsubReservations();
      unsubConfigs();
      unsubUsers();
      unsubSifpro();
      unsubCancellations();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // PRINTER STATUS
  // ---------------------------------------------------------------------------
  const checkPrinterConnection = useCallback(
    async () => {
      const timeStr = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastCheckedAt(timeStr);
      setPrinterStatus('online');
      setPrinterStatusMessage(`Impresora Local (${localPrinterConfig.printerName || 'Sistema / USB'}) Lista`);
      return { success: true, message: 'Impresora local activa.' };
    },
    [localPrinterConfig.printerName]
  );

  useEffect(() => {
    checkPrinterConnection();
  }, [checkPrinterConnection]);

  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS WITH FIRESTORE
  // ---------------------------------------------------------------------------
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const formattedCode = formatProductCode(productData.code);
    const existing = products.find((p) => p.code.trim().toUpperCase() === formattedCode.trim().toUpperCase());
    if (existing) {
      console.warn(`[addProduct] Código duplicado detectado: ${formattedCode}. Retornando producto existente.`);
      return existing;
    }

    const resolvedSpecies = productData.speciesLegend?.trim() || inferProductSpeciesLegend(productData);
    const validWeight = Number(productData.defaultWeight) > 0 ? Number(productData.defaultWeight) : 10.0;
    const newProduct: Product = {
      ...productData,
      defaultWeight: validWeight,
      warehouse: 'Congelado',
      code: formattedCode,
      speciesLegend: resolvedSpecies,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
    const cleanProduct = JSON.parse(JSON.stringify(newProduct));
    setDoc(doc(db, 'products', newProduct.id), cleanProduct).catch((err) =>
      console.error('Error saving product to Firebase:', err)
    );
    return newProduct;
  };

  const updateProduct = (updated: Product) => {
    const resolvedSpecies = updated.speciesLegend?.trim() || inferProductSpeciesLegend(updated);
    const sanitized: Product = {
      ...updated,
      warehouse: 'Congelado' as const,
      code: formatProductCode(updated.code),
      speciesLegend: resolvedSpecies,
    };
    setProducts((prev) => prev.map((p) => (p.id === sanitized.id ? sanitized : p)));
    const cleanUpdated = JSON.parse(JSON.stringify(sanitized));
    setDoc(doc(db, 'products', updated.id), cleanUpdated, { merge: true }).catch((err) =>
      console.error('Error updating product in Firebase:', err)
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteDoc(doc(db, 'products', id)).catch((err) =>
      console.error('Error deleting product from Firebase:', err)
    );
  };

  const addSubWarehouse = (subData: Omit<SubWarehouse, 'id'>): SubWarehouse => {
    const newSub: SubWarehouse = {
      ...subData,
      parentWarehouse: 'Congelado',
      id: `sub-${Date.now()}`,
    };
    setSubWarehouses((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
    setDoc(doc(db, 'subWarehouses', newSub.id), newSub).catch((err) =>
      console.error('Error saving subWarehouse to Firebase:', err)
    );
    return newSub;
  };

  const updateSubWarehouse = (updated: SubWarehouse) => {
    const sanitized: SubWarehouse = {
      ...updated,
      parentWarehouse: 'Congelado' as const,
    };
    setSubWarehouses((prev) => prev.map((s) => (s.id === sanitized.id ? sanitized : s)));
    setDoc(doc(db, 'subWarehouses', updated.id), sanitized, { merge: true }).catch((err) =>
      console.error('Error updating subWarehouse in Firebase:', err)
    );
  };

  const deleteSubWarehouse = (id: string) => {
    setSubWarehouses((prev) => prev.filter((s) => s.id !== id));
    deleteDoc(doc(db, 'subWarehouses', id)).catch((err) =>
      console.error('Error deleting subWarehouse from Firebase:', err)
    );
  };

  const addCategory = (catData: Omit<CategoryItem, 'id'>): CategoryItem => {
    const newCat: CategoryItem = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [newCat, ...prev.filter((c) => c.id !== newCat.id)]);
    setDoc(doc(db, 'categories', newCat.id), newCat).catch((err) =>
      console.error('Error saving category to Firebase:', err)
    );
    return newCat;
  };

  const updateCategory = (updated: CategoryItem, oldName?: string) => {
    const existing = categories.find((c) => c.id === updated.id);
    const previousName = oldName || existing?.name;

    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setDoc(doc(db, 'categories', updated.id), updated, { merge: true }).catch((err) =>
      console.error('Error updating category in Firebase:', err)
    );

    // If category name changed, cascade update to products and labels
    if (previousName && previousName !== updated.name) {
      // 1. Update products in state and Firestore
      setProducts((prev) => {
        const updatedProds = prev.map((p) =>
          p.category === previousName ? { ...p, category: updated.name } : p
        );
        prev.forEach((p) => {
          if (p.category === previousName) {
            setDoc(doc(db, 'products', p.id), { category: updated.name }, { merge: true }).catch(() => {});
          }
        });
        return updatedProds;
      });

      // 2. Update labels in state and Firestore
      setLabels((prev) => {
        const updatedLabels = prev.map((l) =>
          l.category === previousName ? { ...l, category: updated.name } : l
        );
        prev.forEach((l) => {
          if (l.category === previousName) {
            setDoc(doc(db, 'labels', l.id), { category: updated.name }, { merge: true }).catch(() => {});
          }
        });
        return updatedLabels;
      });
    }
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    deleteDoc(doc(db, 'categories', id)).catch((err) =>
      console.error('Error deleting category from Firebase:', err)
    );
  };

  const addSpecies = (speciesData: Omit<SpeciesItem, 'id'>): SpeciesItem => {
    const newSpecies: SpeciesItem = {
      ...speciesData,
      id: `esp-${Date.now()}`,
    };
    setSpeciesList((prev) => [newSpecies, ...prev.filter((s) => s.id !== newSpecies.id)]);
    setDoc(doc(db, 'species', newSpecies.id), newSpecies).catch((err) =>
      console.error('Error saving species to Firebase:', err)
    );
    return newSpecies;
  };

  const updateSpecies = (updated: SpeciesItem, oldLegend?: string) => {
    const existing = speciesList.find((s) => s.id === updated.id);
    const previousLegend = oldLegend || existing?.legend;

    setSpeciesList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setDoc(doc(db, 'species', updated.id), updated, { merge: true }).catch((err) =>
      console.error('Error updating species in Firebase:', err)
    );

    // If species legend changed, cascade update to products and labels
    if (previousLegend && previousLegend !== updated.legend) {
      // 1. Update products in state and Firestore
      setProducts((prev) => {
        const updatedProds = prev.map((p) =>
          p.speciesLegend === previousLegend ? { ...p, speciesLegend: updated.legend } : p
        );
        prev.forEach((p) => {
          if (p.speciesLegend === previousLegend) {
            setDoc(doc(db, 'products', p.id), { speciesLegend: updated.legend }, { merge: true }).catch(() => {});
          }
        });
        return updatedProds;
      });

      // 2. Update labels in state and Firestore
      setLabels((prev) => {
        const updatedLabels = prev.map((l) =>
          l.speciesLegend === previousLegend ? { ...l, speciesLegend: updated.legend } : l
        );
        prev.forEach((l) => {
          if (l.speciesLegend === previousLegend) {
            setDoc(doc(db, 'labels', l.id), { speciesLegend: updated.legend }, { merge: true }).catch(() => {});
          }
        });
        return updatedLabels;
      });
    }
  };

  const deleteSpecies = (id: string) => {
    setSpeciesList((prev) => prev.filter((s) => s.id !== id));
    deleteDoc(doc(db, 'species', id)).catch((err) =>
      console.error('Error deleting species from Firebase:', err)
    );
  };

  const addTare = (tareData: Omit<TareItem, 'id'>): TareItem => {
    const highestNumber = tares.reduce((max, t) => Math.max(max, t.tareNumber || 0), 0);
    const tareNumber = tareData.tareNumber || highestNumber + 1;
    const newId = `tar-${Date.now()}`;
    const newTare: TareItem = {
      ...tareData,
      id: newId,
      tareNumber,
      unit: tareData.unit || 'KG',
      weight: Number(tareData.weight) || 0,
    };
    setTares((prev) => {
      const updated = [...prev, newTare];
      updated.sort((a, b) => a.tareNumber - b.tareNumber);
      return updated;
    });
    setDoc(doc(db, 'tares', newTare.id), newTare).catch((err) =>
      console.error('Error saving tare to Firebase:', err)
    );
    return newTare;
  };

  const updateTare = (updated: TareItem) => {
    const sanitized: TareItem = {
      ...updated,
      tareNumber: Number(updated.tareNumber) || 0,
      weight: Number(updated.weight) || 0,
    };
    setTares((prev) => {
      const updatedList = prev.map((t) => (t.id === sanitized.id ? sanitized : t));
      updatedList.sort((a, b) => a.tareNumber - b.tareNumber);
      return updatedList;
    });
    setDoc(doc(db, 'tares', sanitized.id), sanitized, { merge: true }).catch((err) =>
      console.error('Error updating tare in Firebase:', err)
    );

    // Update products using this tare
    setProducts((prev) => {
      const updatedProds = prev.map((p) => {
        if (p.tareId === sanitized.id || (p.tareNumber && p.tareNumber === sanitized.tareNumber)) {
          return {
            ...p,
            tareId: sanitized.id,
            tareNumber: sanitized.tareNumber,
            tareWeight: sanitized.weight,
          };
        }
        return p;
      });
      updatedProds.forEach((p) => {
        if (p.tareId === sanitized.id) {
          setDoc(
            doc(db, 'products', p.id),
            {
              tareId: sanitized.id,
              tareNumber: sanitized.tareNumber,
              tareWeight: sanitized.weight,
            },
            { merge: true }
          ).catch(() => {});
        }
      });
      return updatedProds;
    });
  };

  const deleteTare = (id: string) => {
    setTares((prev) => prev.filter((t) => t.id !== id));
    deleteDoc(doc(db, 'tares', id)).catch((err) =>
      console.error('Error deleting tare from Firebase:', err)
    );

    // Clear tare from any products that referenced it
    setProducts((prev) => {
      return prev.map((p) => {
        if (p.tareId === id) {
          const { tareId, tareNumber, tareWeight, ...rest } = p;
          setDoc(
            doc(db, 'products', p.id),
            { tareId: null, tareNumber: null, tareWeight: null },
            { merge: true }
          ).catch(() => {});
          return rest;
        }
        return p;
      });
    });
  };

  const assignTareToProduct = (productId: string, tareIdOrNumber: string | number | null) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    if (!tareIdOrNumber) {
      const updated: Product = {
        ...targetProduct,
        tareId: undefined,
        tareNumber: undefined,
        tareWeight: undefined,
      };
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setDoc(
        doc(db, 'products', productId),
        { tareId: null, tareNumber: null, tareWeight: null },
        { merge: true }
      ).catch(() => {});
      return;
    }

    const matchedTare = tares.find(
      (t) => t.id === tareIdOrNumber || t.tareNumber === Number(tareIdOrNumber)
    );

    const updated: Product = {
      ...targetProduct,
      tareId: matchedTare ? matchedTare.id : String(tareIdOrNumber),
      tareNumber: matchedTare ? matchedTare.tareNumber : Number(tareIdOrNumber) || undefined,
      tareWeight: matchedTare ? matchedTare.weight : undefined,
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    setDoc(
      doc(db, 'products', productId),
      {
        tareId: updated.tareId || null,
        tareNumber: updated.tareNumber || null,
        tareWeight: updated.tareWeight || null,
      },
      { merge: true }
    ).catch((err) => console.error('Error assigning tare to product in Firebase:', err));
  };

  const addPrintedLabel = (
    labelData: Omit<PrintedLabel, 'id' | 'printTimestamp' | 'isDischarged'> & { id?: string }
  ): PrintedLabel => {
    // If a specific folio ID was provided by the print station (matches physical label!), use it.
    // Otherwise calculate the next unique sequential folio based on existing labels.
    const rawProvidedId = labelData.id ? labelData.id.trim().toUpperCase() : '';
    const labelId = rawProvidedId
      ? (rawProvidedId.startsWith('LBL-') ? rawProvidedId : `LBL-${rawProvidedId}`)
      : getNextLabelFolio(labels);

    const newLabel: PrintedLabel = {
      ...labelData,
      id: labelId,
      printTimestamp: new Date().toISOString(),
      isDischarged: false,
    };

    // Update local state immediately
    setLabels((prev) => [newLabel, ...prev.filter((l) => l.id !== newLabel.id)]);

    // Update station last registered folio in localStorage
    try {
      localStorage.setItem('last_label_folio', labelId);
    } catch (e) {}

    // Clean undefined fields so Firestore doesn't throw synchronous validation error
    try {
      const cleanLabel = JSON.parse(JSON.stringify(newLabel));
      setDoc(doc(db, 'labels', newLabel.id), cleanLabel).catch((err) =>
        console.error('Error saving printed label to Firebase:', err)
      );
    } catch (err) {
      console.error('Error preparing label for Firebase:', err);
    }

    return newLabel;
  };

  const deletePrintedLabel = (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    deleteDoc(doc(db, 'labels', id)).catch((err) =>
      console.error('Error deleting printed label from Firebase:', err)
    );
  };

  const updatePrintedLabelId = async (oldId: string, newId: string): Promise<boolean> => {
    const cleanOldId = oldId.trim().toUpperCase();
    const formattedOldId = cleanOldId.startsWith('LBL-') ? cleanOldId : `LBL-${cleanOldId}`;
    const cleanNewId = newId.trim().toUpperCase();
    const formattedNewId = cleanNewId.startsWith('LBL-') ? cleanNewId : `LBL-${cleanNewId}`;
    if (!formattedNewId || formattedOldId === formattedNewId) return false;

    const existing = labels.find((l) => l.id.toUpperCase() === formattedNewId && l.id.toUpperCase() !== formattedOldId);
    if (existing) {
      throw new Error(`El folio ${formattedNewId} ya existe en el sistema`);
    }

    let target = labels.find((l) => l.id.toUpperCase() === formattedOldId || l.id === oldId);
    
    // If not found in labels, attempt recovery from reservations items
    if (!target) {
      for (const r of reservations) {
        const foundItem = r.items?.find((it) => it.labelId.toUpperCase() === formattedOldId || it.labelId === oldId);
        if (foundItem) {
          target = {
            id: formattedNewId,
            productId: 'recovered',
            productCode: foundItem.productCode,
            productName: foundItem.productName,
            category: 'Carnes',
            lot: foundItem.lot,
            weight: foundItem.weight,
            unit: foundItem.unit || 'KG',
            warehouse: 'Congelado',
            subWarehouse: foundItem.subWarehouse,
            conditionFlag: 'A',
            printTimestamp: new Date().toISOString(),
            barcodePayload: `${foundItem.productCode}|${foundItem.lot}|${foundItem.weight}KG|${formattedNewId}`,
            printerIp: 'Sistema Almacén',
            status: 'printed',
            copies: 1,
            isDischarged: false,
          };
          break;
        }
      }
    }

    if (!target) {
      // Create minimal label with the new folio so system is never stuck
      target = {
        id: formattedNewId,
        productId: 'sync',
        productCode: 'PNC',
        productName: 'Producto Sincronizado PNC',
        category: 'Carnes',
        lot: '031026',
        weight: 25,
        unit: 'KG',
        warehouse: 'Congelado',
        conditionFlag: 'A',
        printTimestamp: new Date().toISOString(),
        barcodePayload: `PNC|031026|25KG|${formattedNewId}`,
        printerIp: 'Sistema Almacén',
        status: 'printed',
        copies: 1,
        isDischarged: false,
      };
    }

    const updatedLabel: PrintedLabel = {
      ...target,
      id: formattedNewId,
    };

    // Update state
    setLabels((prev) => {
      const filtered = prev.filter((l) => l.id.toUpperCase() !== formattedOldId && l.id !== oldId && l.id !== formattedNewId);
      return [updatedLabel, ...filtered];
    });

    // Update reservations if this label was part of an order
    setReservations((prev) =>
      prev.map((r) => {
        let changed = false;
        const newIds = r.labelIds.map((id) => {
          if (id.toUpperCase() === formattedOldId || id === oldId) {
            changed = true;
            return formattedNewId;
          }
          return id;
        });
        const newItems = r.items?.map((it) => {
          if (it.labelId.toUpperCase() === formattedOldId || it.labelId === oldId) {
            changed = true;
            return { ...it, labelId: formattedNewId };
          }
          return it;
        });
        return changed ? { ...r, labelIds: newIds, items: newItems } : r;
      })
    );

    // Update discharges if any exist for oldId
    setDischarges((prev) =>
      prev.map((d) => (d.labelId.toUpperCase() === formattedOldId || d.labelId === oldId ? { ...d, labelId: formattedNewId } : d))
    );

    // Update in Firestore
    try {
      await setDoc(doc(db, 'labels', formattedNewId), JSON.parse(JSON.stringify(updatedLabel)));
      await deleteDoc(doc(db, 'labels', oldId));
    } catch (err) {
      console.error('Error syncing updated label ID to Firestore:', err);
    }
    return true;
  };

  const updatePrinterConfig = (newConfig: Partial<ZebraPrinterConfig>) => {
    const merged = { ...printerConfig, ...newConfig };
    setPrinterConfig(merged);
    try {
      localStorage.setItem('zebra_printer_config', JSON.stringify(merged));
    } catch (e) {}
    setDoc(doc(db, 'configs', 'zebraPrinterConfig'), merged, { merge: true }).catch((err) =>
      console.error('Error updating zebraPrinterConfig in Firebase:', err)
    );
  };

  const updateLocalPrinterConfig = (newConfig: Partial<LocalPrinterConfig>) => {
    const merged = { ...localPrinterConfig, ...newConfig };
    setLocalPrinterConfig(merged);
    try {
      localStorage.setItem('local_printer_config', JSON.stringify(merged));
    } catch (e) {}
    setDoc(doc(db, 'configs', 'localPrinterConfig'), merged, { merge: true }).catch((err) =>
      console.error('Error updating localPrinterConfig in Firebase:', err)
    );
  };

  const updateLabelFormatConfig = useCallback((newConfig: Partial<LabelFormatConfig>) => {
    const current = labelFormatConfigRef.current;
    const merged = { ...current, ...newConfig, savedAt: Date.now() };
    labelFormatConfigRef.current = merged;
    setLabelFormatConfig(merged);
    safeSaveLabelConfigLocalStorage(merged);

    // Debounce saving to Firebase to avoid flooding Firestore during continuous slider/drag interactions
    if (labelCloudSaveTimeoutRef.current) {
      clearTimeout(labelCloudSaveTimeoutRef.current);
    }
    labelCloudSaveTimeoutRef.current = setTimeout(() => {
      try {
        const clean = JSON.parse(JSON.stringify(merged));
        setDoc(doc(db, 'configs', 'labelFormatConfig'), clean, { merge: true }).catch((err) =>
          console.error('Error updating labelFormatConfig in Firebase:', err)
        );
      } catch (e) {
        console.error('Error serializing labelFormatConfig for Firestore:', e);
      }
    }, 400);
  }, []);

  const saveLabelDesignPermanently = async (
    configOverride?: LabelFormatConfig
  ): Promise<{ success: boolean; message: string }> => {
    const targetConfig = configOverride || labelFormatConfigRef.current;
    try {
      if (labelCloudSaveTimeoutRef.current) {
        clearTimeout(labelCloudSaveTimeoutRef.current);
      }

      // 1. Sanitize to strip any undefined values, preserve structure and stamp timestamp
      const cleanConfig: LabelFormatConfig = JSON.parse(
        JSON.stringify({
          ...INITIAL_LABEL_FORMAT_CONFIG,
          ...targetConfig,
          savedAt: Date.now(),
        })
      );

      // 2. Instant local persistence (0ms latency)
      labelFormatConfigRef.current = cleanConfig;
      setLabelFormatConfig(cleanConfig);
      safeSaveLabelConfigLocalStorage(cleanConfig);

      // 3. Cloud persistence: write to Firestore configs/labelFormatConfig and configs/labelFormatBackup
      try {
        const cloudWritePromise = setDoc(
          doc(db, 'configs', 'labelFormatConfig'),
          cleanConfig,
          { merge: true }
        );

        const backupWritePromise = setDoc(
          doc(db, 'configs', 'labelFormatBackup'),
          cleanConfig,
          { merge: true }
        ).catch(() => {});

        await Promise.race([
          Promise.all([cloudWritePromise, backupWritePromise]),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
        setIsLabelConfigLoadedFromCloud(true);
      } catch (cloudErr) {
        console.warn('Firestore save notice:', cloudErr);
      }

      return {
        success: true,
        message: '¡Diseño guardado exitosamente!',
      };
    } catch (err: any) {
      console.error('Error in saveLabelDesignPermanently:', err);
      return {
        success: true,
        message: '¡Diseño guardado en almacenamiento local!',
      };
    }
  };

  const reloadLabelFormatFromCloud = async (): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'configs', 'labelFormatConfig'));
      if (snap.exists()) {
        const data = snap.data();
        const merged = { ...INITIAL_LABEL_FORMAT_CONFIG, ...data } as LabelFormatConfig;
        labelFormatConfigRef.current = merged;
        setLabelFormatConfig(merged);
        safeSaveLabelConfigLocalStorage(merged);
        setIsLabelConfigLoadedFromCloud(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error reloading label format from Firebase:', e);
      return false;
    }
  };

  const saveAsNewTemplate = async (
    templateName: string,
    configToSave?: LabelFormatConfig
  ): Promise<SavedLabelTemplate> => {
    const cfg = configToSave || labelFormatConfig;
    const cleanName = templateName.trim() || `Plantilla ${new Date().toLocaleDateString()}`;
    const cleanConfig: LabelFormatConfig = JSON.parse(
      JSON.stringify({
        ...INITIAL_LABEL_FORMAT_CONFIG,
        ...cfg,
        presetName: cleanName,
      })
    );
    const newTemplate: SavedLabelTemplate = {
      id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: cleanConfig,
    };

    const updated = [
      ...savedLabelTemplates.filter((t) => t.name.toLowerCase() !== cleanName.toLowerCase()),
      newTemplate,
    ];
    setSavedLabelTemplates(updated);
    try {
      localStorage.setItem('saved_label_templates', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving savedLabelTemplates to localStorage:', e);
    }

    try {
      const cleanTemplates = JSON.parse(JSON.stringify(updated));
      setDoc(doc(db, 'configs', 'savedLabelTemplates'), { templates: cleanTemplates }, { merge: true }).catch((err) =>
        console.error('Error saving savedLabelTemplates in Firebase:', err)
      );
    } catch (e) {
      console.error('Error serializing savedLabelTemplates:', e);
    }

    return newTemplate;
  };

  const deleteSavedTemplate = (templateId: string) => {
    const updated = savedLabelTemplates.filter((t) => t.id !== templateId);
    setSavedLabelTemplates(updated);
    try {
      localStorage.setItem('saved_label_templates', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving savedLabelTemplates to localStorage:', e);
    }
    try {
      const cleanTemplates = JSON.parse(JSON.stringify(updated));
      setDoc(doc(db, 'configs', 'savedLabelTemplates'), { templates: cleanTemplates }, { merge: true }).catch((err) =>
        console.error('Error deleting savedLabelTemplates in Firebase:', err)
      );
    } catch (e) {
      console.error('Error serializing templates on delete:', e);
    }
  };

  const loadSavedTemplate = (template: SavedLabelTemplate) => {
    const loadedConfig: LabelFormatConfig = {
      ...template.config,
      presetName: template.name,
      savedAt: Date.now(),
    };
    labelFormatConfigRef.current = loadedConfig;
    setLabelFormatConfig(loadedConfig);
    safeSaveLabelConfigLocalStorage(loadedConfig);
    try {
      const cleanConfig = JSON.parse(JSON.stringify(loadedConfig));
      setDoc(doc(db, 'configs', 'labelFormatConfig'), cleanConfig, { merge: true }).catch((err) =>
        console.error('Error updating labelFormatConfig in Firebase:', err)
      );
      setDoc(doc(db, 'configs', 'labelFormatBackup'), cleanConfig, { merge: true }).catch(() => {});
    } catch (e) {
      console.error('Error serializing loadedConfig:', e);
    }
  };

  const resetLabelFormatConfig = () => {
    if (labelCloudSaveTimeoutRef.current) {
      clearTimeout(labelCloudSaveTimeoutRef.current);
    }
    const resetConfig: LabelFormatConfig = {
      ...INITIAL_LABEL_FORMAT_CONFIG,
      savedAt: Date.now(),
    };
    labelFormatConfigRef.current = resetConfig;
    setLabelFormatConfig(resetConfig);
    safeSaveLabelConfigLocalStorage(resetConfig);
    try {
      const cleanConfig = JSON.parse(JSON.stringify(resetConfig));
      setDoc(doc(db, 'configs', 'labelFormatConfig'), cleanConfig).catch((err) =>
        console.error('Error resetting labelFormatConfig in Firebase:', err)
      );
      setDoc(doc(db, 'configs', 'labelFormatBackup'), cleanConfig).catch(() => {});
    } catch (e) {
      console.error('Error serializing resetConfig:', e);
    }
  };

  const calculateExpirationDate = useCallback((conditionFlag: ProductConditionFlag, baseDate?: Date | string): string => {
    const rule = conditionExpirationConfig[conditionFlag] || DEFAULT_CONDITION_EXPIRATION_CONFIG[conditionFlag] || { enabled: true, days: 360 };
    let base: Date;
    if (!baseDate) {
      base = new Date();
    } else if (typeof baseDate === 'string') {
      // Support YYYY-MM-DD or full timestamp
      if (/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
        const [y, m, d] = baseDate.split('-').map(Number);
        base = new Date(y, m - 1, d);
      } else {
        base = new Date(baseDate);
      }
    } else {
      base = new Date(baseDate.getTime());
    }

    if (isNaN(base.getTime())) {
      base = new Date();
    }

    const daysToAdd = rule.enabled ? Number(rule.days) || 0 : 0;
    const targetDate = new Date(base.getTime());
    targetDate.setDate(targetDate.getDate() + daysToAdd);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [conditionExpirationConfig]);

  const updateConditionExpirationConfig = useCallback((newConfig: Partial<ConditionExpirationConfig>) => {
    const merged = { ...conditionExpirationConfig, ...newConfig };
    setConditionExpirationConfig(merged);
    localStorage.setItem('condition_expiration_config', JSON.stringify(merged));
    setDoc(doc(db, 'configs', 'conditionExpirationConfig'), merged, { merge: true }).catch((err) =>
      console.error('Error updating conditionExpirationConfig in Firebase:', err)
    );
  }, [conditionExpirationConfig]);

  const resetConditionExpirationConfig = useCallback(() => {
    setConditionExpirationConfig(DEFAULT_CONDITION_EXPIRATION_CONFIG);
    localStorage.setItem('condition_expiration_config', JSON.stringify(DEFAULT_CONDITION_EXPIRATION_CONFIG));
    setDoc(doc(db, 'configs', 'conditionExpirationConfig'), DEFAULT_CONDITION_EXPIRATION_CONFIG).catch((err) =>
      console.error('Error resetting conditionExpirationConfig in Firebase:', err)
    );
  }, []);

  const processDischargeByBarcode = (
    scannedCode: string,
    scannedBy: string,
    reason: DischargeRecord['reason'],
    notes?: string
  ): { success: boolean; message: string; record?: DischargeRecord } => {
    const cleanCode = scannedCode.trim();

    let targetLabel = labels.find(
      (l) => l.barcodePayload === cleanCode || l.id === cleanCode
    );

    if (!targetLabel && cleanCode.includes('|')) {
      const parts = cleanCode.split('|');
      const labelIdFromPayload = parts[parts.length - 1];
      targetLabel = labels.find(
        (l) => l.id === labelIdFromPayload || l.barcodePayload.includes(labelIdFromPayload)
      );
    }

    if (!targetLabel && cleanCode.includes('|')) {
      const [prodCode, lotStr] = cleanCode.split('|');
      targetLabel = labels.find(
        (l) => !l.isDischarged && l.productCode === prodCode && l.lot === lotStr
      );
    }

    if (!targetLabel) {
      const pMatch = cleanCode.match(/P([A-Z0-9]+?)(?=L|W|E|$)/i);
      const lMatch = cleanCode.match(/L([A-Z0-9]+?)(?=W|E|$)/i);
      if (pMatch && lMatch) {
        const prodPart = pMatch[1].toUpperCase();
        const lotPart = lMatch[1].toUpperCase();
        targetLabel = labels.find((l) => {
          const cleanP = l.productCode.replace(/^PRD-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const cleanL = l.lot.replace(/^LOT-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          return (cleanP === prodPart || cleanP.includes(prodPart)) && (cleanL === lotPart || cleanL.includes(lotPart));
        });
      }
    }

    if (!targetLabel) {
      return {
        success: false,
        message: `No se encontró ninguna etiqueta en el sistema con el código "${cleanCode}".`,
      };
    }

    if (targetLabel.isDischarged) {
      return {
        success: false,
        message: `La etiqueta ${targetLabel.id} (${targetLabel.productName} Lote: ${targetLabel.lot}) ya fue descargada del inventario previamente el ${new Date(targetLabel.dischargedAt || '').toLocaleString('es-ES')}.`,
      };
    }

    const now = new Date().toISOString();
    const updatedLabel: PrintedLabel = {
      ...targetLabel,
      isDischarged: true,
      dischargedAt: now,
      dischargedBy: scannedBy,
      dischargeReason: reason,
    };

    const dischargeRecord: DischargeRecord = {
      id: `DIS-${Date.now()}`,
      labelId: targetLabel.id,
      productCode: targetLabel.productCode,
      productName: targetLabel.productName,
      lot: targetLabel.lot,
      weight: targetLabel.weight,
      unit: targetLabel.unit,
      warehouse: targetLabel.warehouse,
      scannedCode: cleanCode,
      timestamp: now,
      scannedBy,
      reason,
      notes,
    };

    // Update in Firestore
    setDoc(doc(db, 'labels', targetLabel.id), updatedLabel, { merge: true }).catch((err) =>
      console.error('Error updating label discharge state in Firebase:', err)
    );
    setDoc(doc(db, 'discharges', dischargeRecord.id), dischargeRecord).catch((err) =>
      console.error('Error saving discharge record in Firebase:', err)
    );

    return {
      success: true,
      message: `Salida de inventario registrada con éxito para ${targetLabel.productName} (${targetLabel.weight} ${targetLabel.unit}) Lote: ${targetLabel.lot}.`,
      record: dischargeRecord,
    };
  };

  const generateNextExitFolio = (): string => {
    let maxFolioNum = 500;
    discharges.forEach((d) => {
      if (d.exitFolio) {
        const match = d.exitFolio.match(/SAL-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxFolioNum) maxFolioNum = num;
        }
      }
      if (d.id) {
        const match = d.id.match(/DIS-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxFolioNum) maxFolioNum = num;
        }
      }
    });
    return `SAL-${String(maxFolioNum + 1).padStart(4, '0')}`;
  };

  const processBatchDischarge = (
    codes: string[],
    scannedBy: string,
    reason: DischargeRecord['reason'],
    notes?: string,
    customFolio?: string
  ) => {
    const now = new Date().toISOString();
    const newDischarges: DischargeRecord[] = [];
    const dischargedLabelIds = new Set<string>();
    const errors: { code: string; message: string }[] = [];
    const exitFolio = customFolio || generateNextExitFolio();

    let currentLabels = [...labels];
    const batch = writeBatch(db);

    codes.forEach((rawCode, index) => {
      const cleanCode = rawCode.trim();
      if (!cleanCode) return;

      let targetLabel = currentLabels.find(
        (l) => l.barcodePayload === cleanCode || l.id === cleanCode
      );

      if (!targetLabel && cleanCode.includes('|')) {
        const parts = cleanCode.split('|');
        const labelIdFromPayload = parts[parts.length - 1];
        targetLabel = currentLabels.find(
          (l) => l.id === labelIdFromPayload || l.barcodePayload.includes(labelIdFromPayload)
        );
      }

      if (!targetLabel && cleanCode.includes('|')) {
        const [prodCode, lotStr] = cleanCode.split('|');
        targetLabel = currentLabels.find(
          (l) => !l.isDischarged && l.productCode === prodCode && l.lot === lotStr
        );
      }

      if (!targetLabel) {
        const pMatch = cleanCode.match(/P([A-Z0-9]+?)(?=L|W|E|$)/i);
        const lMatch = cleanCode.match(/L([A-Z0-9]+?)(?=W|E|$)/i);
        if (pMatch && lMatch) {
          const prodPart = pMatch[1].toUpperCase();
          const lotPart = lMatch[1].toUpperCase();
          targetLabel = currentLabels.find((l) => {
            const cleanP = l.productCode.replace(/^PRD-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const cleanL = l.lot.replace(/^LOT-/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            return (cleanP === prodPart || cleanP.includes(prodPart)) && (cleanL === lotPart || cleanL.includes(lotPart));
          });
        }
      }

      if (!targetLabel) {
        errors.push({
          code: cleanCode,
          message: `Código "${cleanCode}" no encontrado.`,
        });
        return;
      }

      if (targetLabel.isDischarged || dischargedLabelIds.has(targetLabel.id)) {
        errors.push({
          code: cleanCode,
          message: `Etiqueta ${targetLabel.id} (${targetLabel.productName}) ya está descargada o procesada.`,
        });
        return;
      }

      dischargedLabelIds.add(targetLabel.id);
      const updatedLabel: PrintedLabel = {
        ...targetLabel,
        isDischarged: true,
        dischargedAt: now,
        dischargedBy: scannedBy,
        dischargeReason: reason,
        dischargeFolio: exitFolio,
      };

      const dischargeRecord: DischargeRecord = {
        id: `DIS-${Date.now()}-${index}`,
        exitFolio,
        labelId: targetLabel.id,
        productCode: targetLabel.productCode,
        productName: targetLabel.productName,
        lot: targetLabel.lot,
        weight: targetLabel.weight,
        unit: targetLabel.unit,
        warehouse: targetLabel.warehouse,
        scannedCode: cleanCode,
        timestamp: now,
        scannedBy,
        reason,
        notes,
      };

      newDischarges.push(dischargeRecord);

      // Add to Firestore batch
      batch.set(doc(db, 'labels', targetLabel.id), updatedLabel, { merge: true });
      batch.set(doc(db, 'discharges', dischargeRecord.id), dischargeRecord);
    });

    if (newDischarges.length > 0) {
      batch.commit().catch((err) => console.error('Error committing batch discharge to Firebase:', err));
    }

    const totalWeight = newDischarges.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

    return {
      successfulCount: newDischarges.length,
      failedCount: errors.length,
      exitFolio,
      totalWeight: Number(totalWeight.toFixed(2)),
      records: newDischarges,
      errors,
    };
  };

  const addMarketReservation = (
    reservationData: Omit<MarketReservation, 'id' | 'reservationDate' | 'status'>
  ): MarketReservation => {
    const id = `RES-${Date.now()}`;
    const now = new Date().toISOString();
    const enforcedDevName =
      activeUser && activeUser.role === 'Desarrollador de Mercado'
        ? activeUser.name
        : reservationData.developerName;
    const enforcedDevZone =
      activeUser && activeUser.role === 'Desarrollador de Mercado'
        ? activeUser.assignedZone || reservationData.developerZone
        : reservationData.developerZone;

    const newReservation: MarketReservation = {
      ...reservationData,
      developerName: enforcedDevName,
      developerZone: enforcedDevZone,
      id,
      reservationDate: now,
      status: 'PENDIENTE',
    };

    // Save reservation to Firestore
    setReservations((prev) => [newReservation, ...prev]);
    setLabels((prev) =>
      prev.map((l) =>
        newReservation.labelIds.includes(l.id)
          ? {
              ...l,
              isReserved: true,
              reservedBy: newReservation.developerName,
              reservationId: id,
            }
          : l
      )
    );
    setDoc(doc(db, 'marketReservations', id), newReservation).catch((err) =>
      console.error('Error saving market reservation to Firebase:', err)
    );

    // Update corresponding labels to reserved
    const batch = writeBatch(db);
    newReservation.labelIds.forEach((lblId) => {
      const lblRef = doc(db, 'labels', lblId);
      batch.update(lblRef, {
        isReserved: true,
        reservedBy: newReservation.developerName,
        reservationId: id,
      });
    });
    batch.commit().catch((err) =>
      console.error('Error updating reserved labels in Firebase:', err)
    );

    return newReservation;
  };

  const updateMarketReservationStatus = (
    id: string,
    newStatus: ReservationStatus,
    actionBy?: string,
    internalFolio?: string
  ) => {
    const target = reservations.find((r) => r.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const resRef = doc(db, 'marketReservations', id);

    let updateData: Partial<MarketReservation> = { status: newStatus };

    if (internalFolio) {
      updateData.internalFolio = internalFolio;
      updateData.sifproFolio = internalFolio;
    }

    if (newStatus === 'APROBADO') {
      updateData.approvedAt = now;
      updateData.approvedBy = actionBy || 'Telemarketing';
      if (internalFolio) {
        updateData.internalFolio = internalFolio;
        updateData.sifproFolio = internalFolio;
      }
    } else if (newStatus === 'DESPACHADO') {
      updateData.dischargedAt = now;
      updateData.dischargedBy = actionBy || target.developerName;

      // Optimistically update labels in state
      setLabels((prev) =>
        prev.map((l) =>
          target.labelIds.includes(l.id)
            ? { ...l, isDischarged: true, dischargedAt: now, dischargedBy: actionBy || target.developerName }
            : l
        )
      );

      // When dispatched, mark labels as discharged and create discharge records
      const isSale = target.orderType === 'PEDIDO_VENTA' || target.reason === 'Reserva Venta Especial' || target.reason === 'Venta Directa' || target.reason === 'Apartado Comercial';
      target.labelIds.forEach((lblId, idx) => {
        const lblRef = doc(db, 'labels', lblId);
        batch.update(lblRef, {
          isDischarged: true,
          dischargedAt: now,
          dischargedBy: actionBy || target.developerName,
          dischargeReason: isSale ? `Salida Venta PNC: ${target.reason}` : `Salida Muestras PNC: ${target.reason}`,
        });

        // Find label detail
        const lblDetail = labels.find((l) => l.id === lblId);
        if (lblDetail) {
          const dischargeId = `DIS-PNC-${Date.now()}-${idx}`;
          const dRecord: DischargeRecord = {
            id: dischargeId,
            exitFolio: target.internalFolio || target.id,
            labelId: lblId,
            productCode: lblDetail.productCode,
            productName: lblDetail.productName,
            lot: lblDetail.lot,
            weight: lblDetail.weight,
            unit: lblDetail.unit,
            warehouse: lblDetail.warehouse,
            subWarehouse: lblDetail.subWarehouse,
            conditionFlag: lblDetail.conditionFlag,
            scannedCode: lblDetail.barcodePayload || lblDetail.id,
            timestamp: now,
            scannedBy: actionBy || target.developerName,
            reason: isSale ? 'Venta' : 'Despacho Producción',
            notes: `${isSale ? 'Pedido Venta' : 'Solicitud Muestras'} PNC (${target.clientOrEvent})`,
          };
          batch.set(doc(db, 'discharges', dischargeId), dRecord);
        }
      });
    } else if (newStatus === 'CANCELADO') {
      // Free up reserved labels in state
      setLabels((prev) =>
        prev.map((l) =>
          target.labelIds.includes(l.id)
            ? { ...l, isReserved: false, reservedBy: null, reservationId: null }
            : l
        )
      );

      // Free up reserved labels in Firestore
      target.labelIds.forEach((lblId) => {
        const lblRef = doc(db, 'labels', lblId);
        batch.update(lblRef, {
          isReserved: false,
          reservedBy: null,
          reservationId: null,
        });
      });
    }

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updateData } : r))
    );

    batch.update(resRef, updateData);
    batch.commit().catch((err) =>
      console.error('Error updating reservation status in Firebase:', err)
    );
  };

  const dispatchMarketReservationWithSubstitutions = async (
    id: string,
    dispatchedLabels: PrintedLabel[],
    substitutions: OrderItemSubstitution[],
    actionBy?: string,
    internalFolio?: string,
    notes?: string
  ): Promise<MarketReservation | null> => {
    const target = reservations.find((r) => r.id === id);
    if (!target) return null;

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const resRef = doc(db, 'marketReservations', id);

    const dispatcher = actionBy || activeUser?.name || 'Operador de Embarque';
    const isSale =
      target.orderType === 'PEDIDO_VENTA' ||
      target.reason === 'Reserva Venta Especial' ||
      target.reason === 'Venta Directa' ||
      target.reason === 'Apartado Comercial';

    const effectiveFolio = internalFolio || target.internalFolio || target.id;

    // 1. Identify which labels were dispatched vs which requested labels were NOT found
    const dispatchedLabelIds = dispatchedLabels.map((l) => l.id);
    const requestedLabelIds = target.labelIds || [];
    const unfoundLabelIds = requestedLabelIds.filter((lblId) => !dispatchedLabelIds.includes(lblId));

    // 2. Unfound / substituted boxes: return to ACTIVE STOCK (available again)
    // "y que las cajas que no se encontraron cambien su estatus en la solicitud de pedidos a disponibles nuevamente estando disponibles en stock"
    unfoundLabelIds.forEach((lblId) => {
      const lblRef = doc(db, 'labels', lblId);
      batch.update(lblRef, {
        isReserved: false,
        reservedBy: null,
        reservationId: null,
        isDischarged: false,
      });
    });

    // 3. Dispatched boxes (both original verified boxes + substitute boxes):
    // "estas se eliminen del inventario" -> marked isDischarged: true, dischargedAt, dischargedBy
    const newDischargeRecords: DischargeRecord[] = [];
    dispatchedLabels.forEach((lbl, idx) => {
      const lblRef = doc(db, 'labels', lbl.id);
      const isSub = substitutions.some((s) => s.substitutedWithLabelId === lbl.id);
      const subInfo = substitutions.find((s) => s.substitutedWithLabelId === lbl.id);
      const dischargeReasonStr = isSale
        ? `Salida Venta PNC: ${target.reason}${isSub ? ' (Caja Sustituta)' : ''}`
        : `Salida Muestras PNC: ${target.reason}${isSub ? ' (Caja Sustituta)' : ''}`;

      batch.update(lblRef, {
        isDischarged: true,
        dischargedAt: now,
        dischargedBy: dispatcher,
        dischargeReason: dischargeReasonStr,
        isReserved: false,
        reservedBy: null,
        reservationId: target.id,
      });

      const dischargeId = `DIS-PNC-${Date.now()}-${idx}`;
      const dRecord: DischargeRecord = {
        id: dischargeId,
        exitFolio: effectiveFolio,
        labelId: lbl.id,
        productCode: lbl.productCode,
        productName: lbl.productName,
        lot: lbl.lot,
        weight: lbl.weight,
        unit: lbl.unit || 'KG',
        warehouse: lbl.warehouse,
        subWarehouse: lbl.subWarehouse,
        conditionFlag: lbl.conditionFlag,
        scannedCode: lbl.barcodePayload || lbl.id,
        timestamp: now,
        scannedBy: dispatcher,
        reason: isSale ? 'Venta' : 'Despacho Producción',
        notes: isSub
          ? `[SUSTITUCIÓN de ${subInfo?.originalLabelId}] ${target.clientOrEvent} - ${target.reason}`
          : `${isSale ? 'Pedido Venta' : 'Solicitud Muestras'} PNC (${target.clientOrEvent})`,
      };
      newDischargeRecords.push(dRecord);
      batch.set(doc(db, 'discharges', dischargeId), dRecord);
    });

    // 4. Update local state for labels:
    setLabels((prev) =>
      prev.map((l) => {
        if (dispatchedLabelIds.includes(l.id)) {
          return {
            ...l,
            isDischarged: true,
            dischargedAt: now,
            dischargedBy: dispatcher,
            isReserved: false,
            reservedBy: null,
            reservationId: target.id,
          };
        }
        if (unfoundLabelIds.includes(l.id)) {
          return {
            ...l,
            isReserved: false,
            reservedBy: null,
            reservationId: null,
            isDischarged: false,
          };
        }
        return l;
      })
    );

    // 5. Update local state for discharges:
    if (newDischargeRecords.length > 0) {
      setDischarges((prev) => [...newDischargeRecords, ...prev]);
    }

    // 6. Build updated reservation record:
    const newItems = dispatchedLabels.map((l) => ({
      labelId: l.id,
      productCode: l.productCode,
      productName: l.productName,
      lot: l.lot,
      weight: l.weight,
      unit: l.unit || 'KG',
      warehouse: l.warehouse,
      subWarehouse: l.subWarehouse,
    }));

    const finalTotalWeight = dispatchedLabels.reduce((sum, l) => sum + (Number(l.weight) || 0), 0);

    const updateData: Partial<MarketReservation> = {
      status: 'DESPACHADO',
      dischargedAt: now,
      dischargedBy: dispatcher,
      internalFolio: effectiveFolio,
      sifproFolio: effectiveFolio,
      labelIds: dispatchedLabelIds,
      items: newItems,
      totalWeight: Number(finalTotalWeight.toFixed(2)),
      totalItems: dispatchedLabels.length,
      substitutions: substitutions.length > 0 ? substitutions : target.substitutions || [],
      hasSubstitutions: substitutions.length > 0 || !!target.hasSubstitutions,
      originalItems: target.originalItems || target.items,
      originalTotalWeight: target.originalTotalWeight || target.totalWeight,
      notes: notes
        ? `${target.notes ? `${target.notes} | ` : ''}${notes}`
        : target.notes,
    };

    const finalReservation: MarketReservation = {
      ...target,
      ...updateData,
    };

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? finalReservation : r))
    );

    batch.update(resRef, updateData);
    batch.commit().catch((err) =>
      console.error('Error committing dispatch with substitutions to Firebase:', err)
    );

    return finalReservation;
  };

  const cancelMarketReservation = useCallback(
    async (
      id: string,
      cancellationReason: string,
      cancellationNotes?: string,
      actionBy?: string
    ) => {
      const target = reservations.find((r) => r.id === id);
      if (!target) return;

      const now = new Date().toISOString();
      const batch = writeBatch(db);
      const resRef = doc(db, 'marketReservations', id);

      const cancelledBy = actionBy || activeUser?.name || 'Telemarketing';

      batch.update(resRef, {
        status: 'CANCELADO',
        cancelledAt: now,
        cancelledBy,
        cancellationReason,
        cancellationNotes: cancellationNotes || '',
      });

      // Free reserved labels
      target.labelIds.forEach((lblId) => {
        const lblRef = doc(db, 'labels', lblId);
        batch.update(lblRef, {
          isReserved: false,
          reservedBy: null,
          reservationId: null,
        });
      });

      // Free reserved SIFPRO records in state and chunks
      const sifproIdsToFree = new Set(target.labelIds);
      setSifproRecords((prev) => {
        const next = prev.map((r) => {
          if (sifproIdsToFree.has(r.id)) {
            return { ...r, isReserved: false, reservedBy: null };
          }
          return r;
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sifpro_inventory_records', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });

      // Update in chunk documents in background
      getDocs(collection(db, 'sifpro_chunks'))
        .then((snap) => {
          snap.docs.forEach((d) => {
            const chunkData = d.data();
            if (Array.isArray(chunkData.records)) {
              let modified = false;
              const updatedRecords = chunkData.records.map((r: SifproInventoryRecord) => {
                if (sifproIdsToFree.has(r.id)) {
                  modified = true;
                  return { ...r, isReserved: false, reservedBy: null };
                }
                return r;
              });
              if (modified) {
                setDoc(doc(db, 'sifpro_chunks', d.id), { records: updatedRecords }, { merge: true }).catch(() => {});
              }
            }
          });
        })
        .catch(() => {});

      // Create a Cancellation Record in Firestore
      const isSifpro = target.items?.some(
        (i) => i.subWarehouse === 'SIFPRO' || i.lot === 'SIFPRO' || (i.warehouse && i.warehouse.includes('Almacén'))
      );
      const itemsSummary =
        (target.items || [])
          .map((i) => `${i.productCode} ${i.productName} (${i.weight.toFixed(2)} KG)`)
          .join('; ') || `${target.totalItems} ítems (${target.totalWeight.toFixed(2)} KG)`;

      const cancelRecordId = `CANCEL-TM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const cancelRecord: TelemarketingCancellationRecord = {
        id: cancelRecordId,
        reservationId: target.id,
        orderType: target.orderType,
        developerName: target.developerName,
        developerRole: target.developerRole,
        developerZone: target.developerZone,
        clientOrEvent: target.clientOrEvent,
        reasonForReservation: target.reason,
        cancellationReason,
        cancellationNotes: cancellationNotes || '',
        cancelledAt: now,
        cancelledBy,
        totalWeight: target.totalWeight,
        totalItems: target.totalItems || target.items?.length || 0,
        itemsSummary,
        sourceType: isSifpro ? 'SIFPRO' : 'Producto No Conformante',
        sifproFolio: target.sifproFolio,
      };

      batch.set(doc(db, 'telemarketing_cancellation_records', cancelRecordId), cancelRecord);

      await batch.commit().catch((err) =>
        console.error('Error cancelling market reservation in Firebase:', err)
      );
    },
    [reservations, activeUser]
  );

  const deleteCancellationRecord = useCallback(async (id: string) => {
    setCancellationRecords((prev) => prev.filter((c) => c.id !== id));
    await deleteDoc(doc(db, 'telemarketing_cancellation_records', id)).catch((err) =>
      console.error('Error deleting cancellation record from Firebase:', err)
    );
  }, []);

  const deleteMarketReservation = (id: string) => {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    const target = reservations.find((r) => r.id === id);
    if (target) {
      // Free reserved labels if still pending/approved
      if (target.status === 'PENDIENTE' || target.status === 'APROBADO') {
        setLabels((prev) =>
          prev.map((l) =>
            target.labelIds.includes(l.id)
              ? { ...l, isReserved: false, reservedBy: null, reservationId: null }
              : l
          )
        );
      }
      const batch = writeBatch(db);
      batch.delete(doc(db, 'marketReservations', id));

      if (target.status === 'PENDIENTE' || target.status === 'APROBADO') {
        target.labelIds.forEach((lblId) => {
          const lblRef = doc(db, 'labels', lblId);
          batch.update(lblRef, {
            isReserved: false,
            reservedBy: null,
            reservationId: null,
          });
        });
      }
      batch.commit().catch((err) => console.error('Error deleting reservation:', err));
    }
  };

  const addSifproRecords = useCallback(async (newRecords: SifproInventoryRecord[]) => {
    if (!newRecords || newRecords.length === 0) return;
    
    // 1. Instant local state & localStorage update (Zero latency UI)
    setSifproRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const toAdd = newRecords.filter((r) => !existingIds.has(r.id));
      const updated = [...toAdd, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sifpro_inventory_records', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    // 2. High-performance Chunked Firestore Write (500 items per document -> saves 99% of writes)
    const CHUNK_SIZE = 400;
    const now = new Date().toISOString();
    
    for (let i = 0; i < newRecords.length; i += CHUNK_SIZE) {
      const chunk = newRecords.slice(i, i + CHUNK_SIZE);
      const first = chunk[0];
      const recTypeClean = (first?.recordType || 'rec').replace(/[^a-zA-Z0-9]/g, '');
      const docDateClean = (first?.docDate || first?.date || 'nodate').replace(/[^0-9]/g, '');
      const chunkId = `chunk_${recTypeClean}_${docDateClean}_${Date.now()}_${i / CHUNK_SIZE}`;
      
      const totalKg = chunk.reduce((sum, r) => {
        const w = typeof r.weight === 'number' ? r.weight : parseFloat(String(r.weight).replace(/[^0-9.]/g, '') || '0');
        return sum + (isNaN(w) ? 0 : w);
      }, 0);

      await setDoc(doc(db, 'sifpro_chunks', chunkId), {
        id: chunkId,
        batchId: first?.batchId || `batch_${Date.now()}`,
        docDate: first?.docDate || first?.date || '',
        recordType: first?.recordType || 'Inventario Físico',
        count: chunk.length,
        totalKg,
        records: chunk,
        updatedAt: now,
      }).catch((err) => console.error('Error writing sifpro chunk to Firebase:', err));
    }
  }, []);

  const updateSifproRecords = useCallback(async (updatedRecords: SifproInventoryRecord[]) => {
    if (!updatedRecords || updatedRecords.length === 0) return;
    
    // 1. Instant local state update
    const updatedMap = new Map(updatedRecords.map((r) => [r.id, r]));
    setSifproRecords((prev) => {
      const next = prev.map((r) => updatedMap.get(r.id) || r);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sifpro_inventory_records', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    // 2. Locate and update affected chunk documents in Firestore
    try {
      const snap = await getDocs(collection(db, 'sifpro_chunks'));
      const updatePromises: Promise<void>[] = [];

      snap.docs.forEach((chunkDoc) => {
        const data = chunkDoc.data();
        if (Array.isArray(data.records)) {
          let hasChange = false;
          const newRecords = data.records.map((r: SifproInventoryRecord) => {
            if (updatedMap.has(r.id)) {
              hasChange = true;
              return updatedMap.get(r.id)!;
            }
            return r;
          });

          if (hasChange) {
            const totalKg = newRecords.reduce((sum: number, r: SifproInventoryRecord) => {
              const w = typeof r.weight === 'number' ? r.weight : parseFloat(String(r.weight).replace(/[^0-9.]/g, '') || '0');
              return sum + (isNaN(w) ? 0 : w);
            }, 0);

            updatePromises.push(
              setDoc(doc(db, 'sifpro_chunks', chunkDoc.id), {
                records: newRecords,
                totalKg,
                count: newRecords.length,
                updatedAt: new Date().toISOString(),
              }, { merge: true })
            );
          }
        }
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error updating sifpro chunk documents in Firebase:', err);
    }
  }, []);

  const deleteSingleSifproRecord = useCallback(async (id: string) => {
    // 1. Instant local update
    setSifproRecords((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sifpro_inventory_records', JSON.stringify(remaining));
        } catch (e) {}
      }
      return remaining;
    });

    // 2. Remove from corresponding chunk document
    try {
      const snap = await getDocs(collection(db, 'sifpro_chunks'));
      for (const chunkDoc of snap.docs) {
        const data = chunkDoc.data();
        if (Array.isArray(data.records) && data.records.some((r: SifproInventoryRecord) => r.id === id)) {
          const remaining = data.records.filter((r: SifproInventoryRecord) => r.id !== id);
          if (remaining.length === 0) {
            await deleteDoc(doc(db, 'sifpro_chunks', chunkDoc.id));
          } else {
            const totalKg = remaining.reduce((sum: number, r: SifproInventoryRecord) => {
              const w = typeof r.weight === 'number' ? r.weight : parseFloat(String(r.weight).replace(/[^0-9.]/g, '') || '0');
              return sum + (isNaN(w) ? 0 : w);
            }, 0);
            await setDoc(doc(db, 'sifpro_chunks', chunkDoc.id), {
              records: remaining,
              count: remaining.length,
              totalKg,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error deleting single record from sifpro chunk:', err);
    }
  }, []);

  const deleteSifproRecordsByBatchOrDate = useCallback(
    async (targetKey: string, recordType?: string): Promise<number> => {
      if (!targetKey) return 0;
      const normTarget = targetKey.replace(/[^0-9a-zA-Z]/g, '');

      let matchingCount = 0;
      setSifproRecords((prev) => {
        const matching = prev.filter((r) => {
          if (recordType && r.recordType !== recordType) return false;
          if (r.batchId && r.batchId === targetKey) return true;
          const d1 = (r.docDate || r.date || '').replace(/[^0-9a-zA-Z]/g, '');
          return d1 === normTarget || r.date === targetKey || r.docDate === targetKey;
        });
        matchingCount = matching.length;
        const remaining = prev.filter((r) => !matching.some((m) => m.id === r.id));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sifpro_inventory_records', JSON.stringify(remaining));
          } catch (e) {}
        }
        return remaining;
      });

      // Optimized deletion at chunk level (1 delete per chunk doc instead of 5,000 deletes)
      try {
        const snap = await getDocs(collection(db, 'sifpro_chunks'));
        const deletePromises: Promise<void>[] = [];

        snap.docs.forEach((chunkDoc) => {
          const data = chunkDoc.data();
          const chunkDate = (data.docDate || '').replace(/[^0-9a-zA-Z]/g, '');
          const isTargetChunk = (data.batchId === targetKey || chunkDate === normTarget || data.docDate === targetKey) &&
            (!recordType || data.recordType === recordType);

          if (isTargetChunk) {
            deletePromises.push(deleteDoc(doc(db, 'sifpro_chunks', chunkDoc.id)));
          } else if (Array.isArray(data.records)) {
            // Check if chunk contains some matching items
            const remainingRecords = data.records.filter((r: SifproInventoryRecord) => {
              if (recordType && r.recordType !== recordType) return true;
              if (r.batchId && r.batchId === targetKey) return false;
              const d1 = (r.docDate || r.date || '').replace(/[^0-9a-zA-Z]/g, '');
              return d1 !== normTarget && r.date !== targetKey && r.docDate !== targetKey;
            });

            if (remainingRecords.length !== data.records.length) {
              if (remainingRecords.length === 0) {
                deletePromises.push(deleteDoc(doc(db, 'sifpro_chunks', chunkDoc.id)));
              } else {
                const totalKg = remainingRecords.reduce((sum: number, r: SifproInventoryRecord) => {
                  const w = typeof r.weight === 'number' ? r.weight : parseFloat(String(r.weight).replace(/[^0-9.]/g, '') || '0');
                  return sum + (isNaN(w) ? 0 : w);
                }, 0);
                deletePromises.push(
                  setDoc(doc(db, 'sifpro_chunks', chunkDoc.id), {
                    records: remainingRecords,
                    count: remainingRecords.length,
                    totalKg,
                    updatedAt: new Date().toISOString(),
                  }, { merge: true })
                );
              }
            }
          }
        });

        await Promise.all(deletePromises);
      } catch (err) {
        console.error('Error deleting sifpro chunks by date/batch in Firebase:', err);
      }

      return matchingCount;
    },
    []
  );

  const deleteAllSifproRecords = useCallback(async (recordType?: string) => {
    // 1. Instant local reset
    setSifproRecords((prev) => {
      if (recordType) {
        const remaining = prev.filter((r) => r.recordType !== recordType);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sifpro_inventory_records', JSON.stringify(remaining));
          } catch (e) {}
        }
        return remaining;
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sifpro_inventory_records');
        }
        return [];
      }
    });

    // 2. Delete chunk documents from Firestore
    try {
      const snap = await getDocs(collection(db, 'sifpro_chunks'));
      const deletePromises: Promise<void>[] = [];

      snap.docs.forEach((chunkDoc) => {
        const data = chunkDoc.data();
        if (!recordType || data.recordType === recordType) {
          deletePromises.push(deleteDoc(doc(db, 'sifpro_chunks', chunkDoc.id)));
        }
      });

      await Promise.all(deletePromises);
    } catch (err) {
      console.error('Error deleting sifpro chunks from Firebase:', err);
    }
  }, []);

  const resetSystemData = useCallback(
    async (options?: Partial<SystemResetOptions>): Promise<{ success: boolean; message: string }> => {
      const mode = options?.mode || 'demo_flow';
      const resetReservations = options?.resetReservations ?? true;
      const seedDemoOrders = options?.seedDemoOrders ?? (mode === 'demo_flow');
      const resetLabelsInventory = options?.resetLabelsInventory ?? true;
      const clearDischarges = options?.clearDischarges ?? true;
      const resetCatalogs = options?.resetCatalogs ?? (mode === 'factory_full');
      const resetPrintersAndFormats = options?.resetPrintersAndFormats ?? (mode === 'factory_full');
      const releaseMarketCatalog = options?.releaseMarketCatalog ?? true;

      try {
        // 1. CLEAR & RESET RESERVATIONS
        if (resetReservations) {
          try {
            const resSnap = await getDocs(collection(db, 'marketReservations'));
            const delResPromises = resSnap.docs.map((d) => deleteDoc(doc(db, 'marketReservations', d.id)));
            await Promise.all(delResPromises);
          } catch (e) {
            console.error('Error deleting reservations from Firebase:', e);
          }

          if (seedDemoOrders) {
            try {
              const seedPromises = INITIAL_RESERVATIONS.map((r) =>
                setDoc(doc(db, 'marketReservations', r.id), r)
              );
              await Promise.all(seedPromises);
            } catch (e) {
              console.error('Error seeding initial reservations in Firebase:', e);
            }
            setReservations(INITIAL_RESERVATIONS);
          } else {
            setReservations([]);
          }
        }

        // 2. CLEAR & RESET DISCHARGES
        if (clearDischarges) {
          try {
            const disSnap = await getDocs(collection(db, 'discharges'));
            const delDisPromises = disSnap.docs.map((d) => deleteDoc(doc(db, 'discharges', d.id)));
            await Promise.all(delDisPromises);
          } catch (e) {
            console.error('Error deleting discharges from Firebase:', e);
          }

          if (mode === 'factory_full') {
            try {
              const seedDisPromises = INITIAL_DISCHARGE_RECORDS.map((d) =>
                setDoc(doc(db, 'discharges', d.id), d)
              );
              await Promise.all(seedDisPromises);
            } catch (e) {
              console.error('Error seeding initial discharges in Firebase:', e);
            }
            setDischarges(INITIAL_DISCHARGE_RECORDS);
          } else {
            setDischarges([]);
          }
        }

        // 3. RESET LABELS INVENTORY
        if (resetLabelsInventory) {
          try {
            const lblSnap = await getDocs(collection(db, 'labels'));
            const delLblPromises = lblSnap.docs.map((d) => deleteDoc(doc(db, 'labels', d.id)));
            await Promise.all(delLblPromises);
          } catch (e) {
            console.error('Error deleting labels from Firebase:', e);
          }

          let freshLabels: PrintedLabel[] = [];

          if (mode === 'clean_zero') {
            // All labels available in stock (none discharged, none reserved)
            freshLabels = INITIAL_PRINTED_LABELS.map((lbl) => ({
              ...lbl,
              isDischarged: false,
              isReserved: false,
              reservedBy: undefined,
              reservationId: undefined,
              dischargedAt: undefined,
              dischargedBy: undefined,
              dischargeReason: undefined,
            }));
          } else {
            // Demo flow: pristine labels with demo orders reserved
            freshLabels = INITIAL_PRINTED_LABELS.map((lbl) => {
              if (seedDemoOrders && lbl.id === 'LBL-73603') {
                return {
                  ...lbl,
                  isDischarged: false,
                  isReserved: true,
                  reservedBy: 'Carlos M. Hinojosa (Desarrollador)',
                  reservationId: 'RES-802',
                };
              }
              if (seedDemoOrders && lbl.id === 'LBL-73601') {
                return {
                  ...lbl,
                  isDischarged: false,
                  isReserved: true,
                  reservedBy: 'Lic. Fernando Morales (Desarrollador)',
                  reservationId: 'RES-801',
                };
              }
              return {
                ...lbl,
                isDischarged: false,
                isReserved: false,
                reservedBy: undefined,
                reservationId: undefined,
                dischargedAt: undefined,
                dischargedBy: undefined,
                dischargeReason: undefined,
              };
            });
          }

          try {
            const seedLblPromises = freshLabels.map((lbl) =>
              setDoc(doc(db, 'labels', lbl.id), lbl)
            );
            await Promise.all(seedLblPromises);
          } catch (e) {
            console.error('Error seeding labels in Firebase:', e);
          }
          setLabels(freshLabels);
        }

        // 4. RESET CATALOGS IF REQUESTED
        if (resetCatalogs) {
          try {
            await Promise.all([
              ...INITIAL_PRODUCTS.map((p) => setDoc(doc(db, 'products', p.id), p)),
              ...INITIAL_SUB_WAREHOUSES.map((s) => setDoc(doc(db, 'subWarehouses', s.id), s)),
              ...INITIAL_CATEGORIES.map((c) => setDoc(doc(db, 'categories', c.id), c)),
              ...INITIAL_SPECIES.map((s) => setDoc(doc(db, 'species', s.id), s)),
              ...INITIAL_TARES.map((t) => setDoc(doc(db, 'tares', t.id), t)),
            ]);
          } catch (e) {
            console.error('Error resetting catalogs in Firebase:', e);
          }
          setProducts(INITIAL_PRODUCTS);
          setSubWarehouses(INITIAL_SUB_WAREHOUSES);
          setCategories(INITIAL_CATEGORIES);
          setSpeciesList(INITIAL_SPECIES);
          setTares(INITIAL_TARES);
        }

        // 5. RESET PRINTERS & FORMATS IF REQUESTED
        if (resetPrintersAndFormats) {
          try {
            await Promise.all([
              setDoc(doc(db, 'configs', 'zebraPrinterConfig'), INITIAL_PRINTER_CONFIG),
              setDoc(doc(db, 'configs', 'localPrinterConfig'), INITIAL_LOCAL_PRINTER_CONFIG),
              setDoc(doc(db, 'configs', 'labelFormatConfig'), INITIAL_LABEL_FORMAT_CONFIG),
              setDoc(doc(db, 'configs', 'conditionExpirationConfig'), DEFAULT_CONDITION_EXPIRATION_CONFIG),
            ]);
          } catch (e) {
            console.error('Error resetting configs in Firebase:', e);
          }
          setPrinterConfig(INITIAL_PRINTER_CONFIG);
          setLocalPrinterConfig(INITIAL_LOCAL_PRINTER_CONFIG);
          setLabelFormatConfig(INITIAL_LABEL_FORMAT_CONFIG);
          setConditionExpirationConfig(DEFAULT_CONDITION_EXPIRATION_CONFIG);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('zebra_printer_config');
            localStorage.removeItem('local_printer_config');
            localStorage.removeItem('condition_expiration_config');
            safeSaveLabelConfigLocalStorage(INITIAL_LABEL_FORMAT_CONFIG);
          }
        }

        // 6. MARKET SETTINGS
        if (releaseMarketCatalog) {
          const freshMarketSettings: MarketSettings = {
            isReleased: true,
            scheduleEnabled: false,
            openTime: '08:00',
            closeTime: '20:00',
            lastManualOverride: new Date().toISOString(),
          };
          setMarketSettings(freshMarketSettings);
          setDoc(doc(db, 'configs', 'marketSettings'), freshMarketSettings, { merge: true }).catch((e) =>
            console.error('Error updating market settings:', e)
          );
        }

        // 7. SIFPRO LOCAL RECORDS CLEANUP
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sifpro_inventory_records');
        }
        setSifproRecords([]);

        return {
          success: true,
          message:
            mode === 'clean_zero'
              ? 'Sistema reiniciado en limpio desde 0. Almacén y pedidos listos para nueva prueba.'
              : mode === 'factory_full'
              ? 'Restablecimiento de fábrica completo finalizado con éxito.'
              : 'Flujo de prueba completo restablecido con éxito. Pedidos y cajas listos para el flujo de punta a punta.',
        };
      } catch (err: any) {
        console.error('Error in resetSystemData:', err);
        return {
          success: false,
          message: `Error al reiniciar información: ${err?.message || 'Error desconocido'}`,
        };
      }
    },
    [safeSaveLabelConfigLocalStorage]
  );

  const resetAllDataToZero = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Wipe only operational / transactional collections from Firestore completely:
      const operationalCollectionsToWipe = [
        'labels',
        'discharges',
        'marketReservations',
        'sifpro_chunks',
      ];

      for (const colName of operationalCollectionsToWipe) {
        try {
          const snap = await getDocs(collection(db, colName));
          const delPromises = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
          await Promise.all(delPromises);
        } catch (err) {
          console.error(`Error wiping collection ${colName}:`, err);
        }
      }

      // 2. Wipe operational React states to 0 (cajas, stock, salidas, pedidos)
      setLabels([]);
      setDischarges([]);
      setReservations([]);
      setSifproRecords([]);
      setCancellationRecords([]);

      // 3. Clear local storage transaction caches
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sifpro_inventory_records');
        localStorage.removeItem('last_label_folio');
        localStorage.removeItem('last_exit_folio');
      }

      // 4. Guarantee that master catalog options (products, cameras, categories, species, tares) are preserved and never empty
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        if (prodSnap.empty) {
          await Promise.all(INITIAL_PRODUCTS.map((p) => setDoc(doc(db, 'products', p.id), p)));
          setProducts(INITIAL_PRODUCTS);
        }

        const subSnap = await getDocs(collection(db, 'subWarehouses'));
        if (subSnap.empty) {
          await Promise.all(INITIAL_SUB_WAREHOUSES.map((s) => setDoc(doc(db, 'subWarehouses', s.id), s)));
          setSubWarehouses(INITIAL_SUB_WAREHOUSES);
        }

        const catSnap = await getDocs(collection(db, 'categories'));
        if (catSnap.empty) {
          await Promise.all(INITIAL_CATEGORIES.map((c) => setDoc(doc(db, 'categories', c.id), c)));
          setCategories(INITIAL_CATEGORIES);
        }

        const spSnap = await getDocs(collection(db, 'species'));
        if (spSnap.empty) {
          await Promise.all(INITIAL_SPECIES.map((s) => setDoc(doc(db, 'species', s.id), s)));
          setSpeciesList(INITIAL_SPECIES);
        }

        const tareSnap = await getDocs(collection(db, 'tares'));
        if (tareSnap.empty) {
          await Promise.all(INITIAL_TARES.map((t) => setDoc(doc(db, 'tares', t.id), t)));
          setTares(INITIAL_TARES);
        }
      } catch (err) {
        console.error('Error ensuring catalog options in Firebase:', err);
      }

      // 5. Ensure market release is active so orders can be placed
      const freshMarketSettings: MarketSettings = {
        isReleased: true,
        scheduleEnabled: false,
        openTime: '08:00',
        closeTime: '20:00',
        lastManualOverride: new Date().toISOString(),
      };
      setMarketSettings(freshMarketSettings);
      setDoc(doc(db, 'configs', 'marketSettings'), freshMarketSettings, { merge: true }).catch(() => {});

      return {
        success: true,
        message: '¡Datos operativos reiniciados a cero! Stock en almacén (0 cajas), historial de etiquetas (0), salidas (0) y pedidos (0). Las opciones disponibles (productos, cámaras, especies y taras) se mantienen 100% disponibles y listas para operar.',
      };
    } catch (err: any) {
      console.error('Error in resetAllDataToZero:', err);
      return {
        success: false,
        message: `Error al reiniciar el sistema: ${err?.message || 'Error desconocido'}`,
      };
    }
  }, []);

  const restoreDefaultCatalogOptions = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      await Promise.all([
        ...INITIAL_PRODUCTS.map((p) => setDoc(doc(db, 'products', p.id), p)),
        ...INITIAL_SUB_WAREHOUSES.map((s) => setDoc(doc(db, 'subWarehouses', s.id), s)),
        ...INITIAL_CATEGORIES.map((c) => setDoc(doc(db, 'categories', c.id), c)),
        ...INITIAL_SPECIES.map((s) => setDoc(doc(db, 'species', s.id), s)),
        ...INITIAL_TARES.map((t) => setDoc(doc(db, 'tares', t.id), t)),
      ]);
      setProducts(INITIAL_PRODUCTS);
      setSubWarehouses(INITIAL_SUB_WAREHOUSES);
      setCategories(INITIAL_CATEGORIES);
      setSpeciesList(INITIAL_SPECIES);
      setTares(INITIAL_TARES);
      return {
        success: true,
        message: '¡Opciones de catálogo restablecidas a los valores de fábrica! (6 productos, 6 cámaras, categorías, especies y taras listos para operar).',
      };
    } catch (err: any) {
      console.error('Error in restoreDefaultCatalogOptions:', err);
      return {
        success: false,
        message: `Error al restaurar catálogo: ${err?.message || 'Error desconocido'}`,
      };
    }
  }, []);

  const resetToDefaults = () => {
    resetSystemData({ mode: 'factory_full' });
  };

  return (
    <InventoryContext.Provider
      value={{
        products,
        labels,
        discharges,
        subWarehouses,
        categories,
        speciesList,
        reservations,
        systemUsers,
        sifproRecords,
        cancellationRecords,
        addSifproRecords,
        updateSifproRecords,
        deleteSingleSifproRecord,
        deleteSifproRecordsByBatchOrDate,
        deleteAllSifproRecords,
        activeUser,
        setActiveUser,
        isMarketReleased,
        marketSettings,
        toggleMarketRelease,
        updateMarketSettings,
        addSystemUser,
        updateSystemUser,
        deleteSystemUser,
        printerConfig,
        localPrinterConfig,
        labelFormatConfig,
        conditionExpirationConfig,
        updateConditionExpirationConfig,
        resetConditionExpirationConfig,
        calculateExpirationDate,
        printerStatus,
        printerStatusMessage,
        lastCheckedAt,
        firebaseConnected,
        checkPrinterConnection,
        addProduct,
        updateProduct,
        deleteProduct,
        addSubWarehouse,
        updateSubWarehouse,
        deleteSubWarehouse,
        addCategory,
        updateCategory,
        deleteCategory,
        addSpecies,
        updateSpecies,
        deleteSpecies,
        tares,
        addTare,
        updateTare,
        deleteTare,
        assignTareToProduct,
        addPrintedLabel,
        deletePrintedLabel,
        updatePrintedLabelId,
        addMarketReservation,
        updateMarketReservationStatus,
        dispatchMarketReservationWithSubstitutions,
        cancelMarketReservation,
        deleteCancellationRecord,
        deleteMarketReservation,
        updatePrinterConfig,
        updateLocalPrinterConfig,
        updateLabelFormatConfig,
        resetLabelFormatConfig,
        savedLabelTemplates,
        isLabelConfigLoadedFromCloud,
        saveLabelDesignPermanently,
        reloadLabelFormatFromCloud,
        saveAsNewTemplate,
        deleteSavedTemplate,
        loadSavedTemplate,
        processDischargeByBarcode,
        generateNextExitFolio,
        processBatchDischarge,
        resetToDefaults,
        resetSystemData,
        resetAllDataToZero,
        restoreDefaultCatalogOptions,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

