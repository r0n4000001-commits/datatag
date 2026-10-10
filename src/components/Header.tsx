import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserManagementModal } from './UserManagementModal';
import { UserLoginModal } from './UserLoginModal';
import { ConditionExpirationModal } from './ConditionExpirationModal';
import {
  Printer,
  Barcode,
  Package,
  QrCode,
  Settings,
  Wifi,
  Database,
  Sliders,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cloud,
  TrendingUp,
  Users,
  UserCheck,
  Lock,
  MapPin,
  Shield,
  KeyRound,
  LogOut,
  LayoutGrid,
  FileSpreadsheet,
  Building2,
  RotateCcw,
  Scale,
  Layers,
  CalendarClock,
  Clock,
  Dna,
} from 'lucide-react';
import { SpeciesCatalogModal } from './SpeciesCatalogModal';
import { SystemResetModal } from './SystemResetModal';
import { SystemUser } from '../types';

export const isRootUser = (user: SystemUser | { role?: string; employeeNumber?: string; accessPin?: string; id?: string } | null | undefined): boolean => {
  if (!user) return false;
  return (
    user.role === 'Sistemas' ||
    user.employeeNumber === 'ROOT-001' ||
    user.accessPin === '72879' ||
    user.id === 'usr-root'
  );
};

export const isAdminUser = (user: SystemUser | { role?: string; employeeNumber?: string; accessPin?: string; id?: string } | null | undefined): boolean => {
  if (!user) return false;
  return (
    isRootUser(user) ||
    user.role === 'Sistemas' ||
    user.role === 'Administrador Almacén'
  );
};

export const canAccessPncSettings = (user: SystemUser | null | undefined): boolean => {
  if (!user) return false;
  if (isRootUser(user)) return true;
  return (
    user.role === 'Sistemas' ||
    user.role === 'Administrador Almacén' ||
    user.role === 'Operador de Embarque'
  );
};

export const isTabAllowedForRole = (
  userOrRole: string | SystemUser | null | undefined,
  tab: 'fase1' | 'fase2' | 'fase3' | 'desarrollo' | 'reportes'
): boolean => {
  if (typeof userOrRole === 'object' && userOrRole !== null) {
    if (isRootUser(userOrRole)) return true;
  }
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  if (role === 'Sistemas') return true;
  if (!role) return true;

  switch (role) {
    case 'Dirección':
      return tab === 'reportes';

    case 'Desarrollador de Mercado':
    case 'Jefe de Ventas':
    case 'Telemarketing':
      return tab === 'desarrollo';

    case 'Operador de Embarque':
    case 'Operador de Etiquetado':
      return tab === 'fase1' || tab === 'fase2' || tab === 'fase3';

    case 'Administrador Almacén':
      return tab === 'fase1' || tab === 'fase2' || tab === 'fase3';

    case 'Gerente Sucursal':
      return tab !== 'desarrollo';

    case 'Sistemas':
      return true;

    default:
      return true;
  }
};

export interface HeaderProps {
  activeModule: 'pnc' | 'sifpro';
  activeTab: 'fase1' | 'fase2' | 'fase3' | 'desarrollo' | 'reportes';
  setActiveTab: (tab: 'fase1' | 'fase2' | 'fase3' | 'desarrollo' | 'reportes') => void;
  sifproTab?: 'physical' | 'reception' | 'sales' | 'returns' | 'available' | 'telemarketing' | 'reportes';
  setSifproTab?: (tab: 'physical' | 'reception' | 'sales' | 'returns' | 'available' | 'telemarketing' | 'reportes') => void;
  onReturnToMainMenu: () => void;
  onOpenSettings: () => void;
  onOpenFormatEditor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  activeTab,
  setActiveTab,
  sifproTab = 'physical',
  setSifproTab,
  onReturnToMainMenu,
  onOpenSettings,
  onOpenFormatEditor,
}) => {
  const {
    labels,
    printerConfig,
    localPrinterConfig,
    printerStatus,
    printerStatusMessage,
    lastCheckedAt,
    firebaseConnected,
    systemUsers,
    activeUser,
    setActiveUser,
    addSystemUser,
    updateSystemUser,
    deleteSystemUser,
    checkPrinterConnection,
    resetToDefaults,
    speciesList,
    products,
    addSpecies,
    updateSpecies,
    deleteSpecies,
  } = useInventory();

  const [isPrinterMenuOpen, setIsPrinterMenuOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isExpirationModalOpen, setIsExpirationModalOpen] = useState(false);
  const [isSpeciesCatalogOpen, setIsSpeciesCatalogOpen] = useState(false);
  const [speciesModalTab, setSpeciesModalTab] = useState<'species' | 'tares'>('species');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const isAdmin = isAdminUser(activeUser);

  return (
    <header className="bg-[#141414] text-white border-b border-[#2A2A28] sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-5">
        {/* Top bar */}
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Logo, Title & Return to Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onReturnToMainMenu}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#222220] hover:bg-amber-400 hover:text-[#141414] text-amber-300 border border-amber-500/50 rounded text-xs font-mono font-bold uppercase transition-all shadow-xs cursor-pointer group"
              title="Volver a la Selección de Módulos (Menú Principal)"
            >
              <LayoutGrid className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Menú Principal</span>
            </button>

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 flex items-center justify-center text-[#141414] font-black border border-[#141414] shrink-0 rounded-xs ${
                activeModule === 'pnc' ? 'bg-amber-400' : 'bg-cyan-400'
              }`}>
                {activeModule === 'pnc' ? <Package className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-mono font-bold text-xs sm:text-sm tracking-tight text-white uppercase leading-none truncate max-w-[140px] sm:max-w-none">
                    {activeModule === 'pnc' ? 'PRODUCTO NO CONFORME' : 'INVENTARIOS SIFPRO'}
                  </h1>
                  <span className={`hidden md:inline-block text-[10px] font-mono font-extrabold px-1.5 py-0.5 uppercase tracking-wider rounded-xs ${
                    activeModule === 'pnc' ? 'bg-amber-400 text-[#141414]' : 'bg-cyan-400 text-[#0E1726]'
                  }`}>
                    {activeModule === 'pnc' ? 'MÓDULO PNC' : 'MÓDULO SIFPRO'}
                  </span>

                  {/* Menú Especie/Origen con opción de Taras (Solo visible para Administradores y Operador de Embarque) */}
                  {activeModule === 'pnc' && canAccessPncSettings(activeUser) && (
                    <div className="flex items-center gap-0.5 bg-[#222220] border border-[#3A3A36] p-0.5 rounded shadow-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSpeciesModalTab('species');
                          setIsSpeciesCatalogOpen(true);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-rose-600 hover:text-white text-rose-300 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer group"
                        title="Catálogo de Especie / Origen (Crear, Editar y Administrar Especies)"
                      >
                        <Dna className="w-3.5 h-3.5 text-rose-400 group-hover:text-white transition-transform" />
                        <span className="hidden sm:inline">Especie/Origen</span>
                      </button>

                      <div className="w-[1px] h-3 bg-[#444] my-auto" />

                      <button
                        type="button"
                        onClick={() => {
                          setSpeciesModalTab('tares');
                          setIsSpeciesCatalogOpen(true);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-amber-400 hover:text-[#141414] text-amber-300 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer group"
                        title="Catálogo de Taras de Empaque (-KG a descontar del peso total al asignar tara)"
                      >
                        <Scale className="w-3.5 h-3.5 text-amber-400 group-hover:text-[#141414] transition-transform" />
                        <span className="hidden sm:inline">Taras</span>
                      </button>
                    </div>
                  )}

                  {/* Icono de Caducidades a la derecha de MÓDULO PNC (Solo visible para Administradores y Operador de Embarque) */}
                  {activeModule === 'pnc' && canAccessPncSettings(activeUser) && (
                    <button
                      type="button"
                      onClick={() => setIsExpirationModalOpen(true)}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-[#222220] hover:bg-amber-400 hover:text-[#141414] text-amber-300 border border-amber-500/60 rounded text-[10px] font-mono font-bold uppercase transition-all shadow-xs cursor-pointer group"
                      title="Configurar Días de Caducidad por Estado de Producto (Cálculo automático: Fecha de Impresión + Días de Estado)"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-400 group-hover:text-[#141414] group-hover:scale-110 transition-transform" />
                      <span className="hidden sm:inline">Caducidades</span>
                    </button>
                  )}
                </div>
                <p className="font-mono text-[10px] text-[#A0A09C] hidden lg:block mt-0.5">
                  {activeModule === 'pnc'
                    ? 'PESAJE BÁSCULA TORREY | ETIQUETADO ZPL | SALIDAS Y MERMAS'
                    : 'INVENTARIO FÍSICO | RECEPCIONES MATRIZ | VENTAS | DEVOLUCIONES YOREME 29D'}
                </p>
              </div>
            </div>
          </div>

          {/* Right action controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
            {/* Firebase Status Badge */}
            <div className="hidden sm:flex items-center bg-[#1F1F1D] px-2 py-1 border border-[#3A3A36] text-[11px] rounded-xs">
              <span
                className={`px-1.5 py-0.5 rounded-xs font-bold flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${
                  firebaseConnected
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80'
                    : 'bg-gray-900 text-gray-400 border border-gray-700'
                }`}
                title={firebaseConnected ? 'Base de datos Firestore sincronizada en tiempo real' : 'Conectando con Firebase...'}
              >
                <Cloud className={`w-3 h-3 shrink-0 ${firebaseConnected ? 'text-amber-400' : 'text-gray-400'}`} />
                <span className="hidden xl:inline">{firebaseConnected ? 'Online' : 'Offline'}</span>
              </span>
            </div>

            {/* Impresora Local Windows Settings button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPrinterMenuOpen(!isPrinterMenuOpen)}
                className="flex items-center gap-1.5 font-bold px-2 sm:px-2.5 py-1.5 rounded-md text-xs tracking-wider transition-colors border shadow-xs bg-[#242422] hover:bg-[#2E2E2A] text-gray-200 border-[#3A3A36] cursor-pointer"
                title="Configurar Impresora Zebra / Medidas de Etiqueta"
              >
                <Printer className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="hidden sm:inline uppercase">Impresora</span>
              </button>

              {isPrinterMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPrinterMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-72 bg-[#222220] border border-[#3A3A36] rounded-xs shadow-2xl p-3 z-50 space-y-3 font-mono">
                    <div className="border-b border-[#333] pb-2">
                      <span className="text-amber-400 font-black text-xs uppercase flex items-center gap-1.5">
                        <Printer className="w-4 h-4" />
                        Impresora Térmica
                      </span>
                      <p className="text-[10px] text-gray-300">
                        {localPrinterConfig.printerName || 'Predeterminada de Windows'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPrinterMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase rounded border border-amber-500 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                    >
                      <Settings className="w-4 h-4 text-[#141414]" />
                      <span>Configurar Impresora</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Key / PIN Login Launcher Button */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 font-extrabold px-2 sm:px-2.5 py-1.5 rounded-md text-xs tracking-wider transition-colors bg-amber-400 hover:bg-amber-300 text-[#141414] border border-amber-500 shadow-xs shrink-0 cursor-pointer"
              title="Ingresar con Código o PIN de 5 dígitos"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0 text-[#141414]" />
              <span className="hidden sm:inline uppercase">PIN</span>
            </button>

            {/* Directorio de Usuarios / Operador Activo Launcher */}
            <button
              type="button"
              onClick={() => setIsUserModalOpen(true)}
              className={`flex items-center gap-1.5 font-extrabold px-2 sm:px-2.5 py-1.5 rounded-md text-xs tracking-wider transition-colors border shadow-xs shrink-0 cursor-pointer ${
                activeUser
                  ? 'bg-[#282824] hover:bg-[#343430] text-amber-300 border-amber-400/60'
                  : 'bg-red-950/80 hover:bg-red-900 text-red-200 border-red-600 animate-pulse'
              }`}
              title="Gestión de usuarios y operadores"
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="hidden sm:inline uppercase">
                {activeUser ? `${activeUser.employeeNumber}` : 'Usuarios'}
              </span>
            </button>

            {/* Botón Reiniciar para Pruebas (Solo visible para Administradores) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 font-black px-2 sm:px-2.5 py-1.5 rounded-md text-xs tracking-wider transition-all bg-rose-950 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-600 shadow-xs shrink-0 cursor-pointer group"
                title="Reiniciar datos y pedidos del sistema para iniciar una prueba desde 0"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0 text-rose-400 group-hover:-rotate-45 transition-transform" />
                <span className="hidden xl:inline uppercase">Reiniciar Datos (Prueba 0)</span>
                <span className="xl:hidden uppercase">Reiniciar 0</span>
              </button>
            )}
          </div>
        </div>

        {/* Active User / Profile Info Bar */}
        {activeUser && (
          <div className="bg-[#1A1A18] px-3 py-1.5 border-t border-[#2A2A28] flex flex-wrap items-center justify-between text-[11px] font-mono gap-2 text-[#D4D3D0]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-400 font-bold flex items-center gap-1 uppercase">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Operador Activo:</span>
              </span>
              <strong className="text-white bg-[#282824] px-1.5 py-0.5 rounded border border-[#444]">
                [{activeUser.employeeNumber}] {activeUser.name}
              </strong>
              <span className="text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 text-[10px]">
                {activeUser.role}
              </span>
              <span className="text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 text-[10px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>Zona: {activeUser.assignedZone || 'General'}</span>
              </span>

              {/* Botón de acceso rápido para administrador en la barra de usuario */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-600/90 text-rose-200 hover:text-white rounded text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all shadow-xs ml-1"
                  title="Reiniciar datos de la app para iniciar una prueba desde 0"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Reiniciar para Prueba (0)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(true)}
                className="text-[10px] text-amber-400 hover:underline uppercase font-bold cursor-pointer"
              >
                Cambiar Rol / Usuario
              </button>

              <button
                type="button"
                onClick={() => setActiveUser(null)}
                className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-700/80 text-red-200 hover:text-white text-[10px] font-mono font-bold uppercase rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Cerrar Sesión actual e ir a la ventana de inicio de usuario"
              >
                <LogOut className="w-3 h-3 text-red-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Navigation Tabs based on Active Module */}
        {activeModule === 'pnc' ? (
          // PNC TABS (5 PHASES)
          (() => {
            const isFase1Allowed = isTabAllowedForRole(activeUser, 'fase1');
            const isFase2Allowed = isTabAllowedForRole(activeUser, 'fase2');
            const isFase3Allowed = isTabAllowedForRole(activeUser, 'fase3');
            const isDesarrolloAllowed = isTabAllowedForRole(activeUser, 'desarrollo');
            const isReportesAllowed = isTabAllowedForRole(activeUser, 'reportes');

            const allowedTabs = [
              isFase1Allowed && { id: 'fase1' as const, label: 'Fase 1: Creación Etiquetas & Báscula', shortLabel: 'Fase 1: Etiquetas', icon: Barcode },
              isFase2Allowed && { id: 'fase2' as const, label: 'Fase 2: Almacén PNC', shortLabel: 'Fase 2: Almacén', icon: Package },
              isFase3Allowed && { id: 'fase3' as const, label: 'Fase 3: Salidas / Mermas', shortLabel: 'Fase 3: Salidas', icon: QrCode },
              isDesarrolloAllowed && {
                id: 'desarrollo' as const,
                label:
                  activeUser?.role === 'Telemarketing'
                    ? 'Fase 4: Telemarketing & Pedidos'
                    : 'Fase 4: Desarrollo de Mercado & Pedidos',
                shortLabel:
                  activeUser?.role === 'Telemarketing'
                    ? 'Fase 4: Telemarketing'
                    : 'Fase 4: Muestras/Pedidos',
                icon: TrendingUp,
              },
              isReportesAllowed && { id: 'reportes' as const, label: 'Fase 5: Reportes PNC', shortLabel: 'Fase 5: Reportes', icon: Layers },
            ].filter(Boolean) as { id: 'fase1' | 'fase2' | 'fase3' | 'desarrollo' | 'reportes'; label: string; shortLabel: string; icon: any }[];

            if (allowedTabs.length === 0) return null;

            const gridColsClass =
              allowedTabs.length === 1
                ? 'grid-cols-1'
                : allowedTabs.length === 2
                ? 'grid-cols-2'
                : allowedTabs.length === 3
                ? 'grid-cols-3'
                : allowedTabs.length === 4
                ? 'grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-5';

            return (
              <div className={`grid ${gridColsClass} w-full gap-1 sm:gap-2 pb-1.5 pt-1 border-t border-[#242422]`}>
                {allowedTabs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center justify-start gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wide transition-all border w-full text-left cursor-pointer rounded-xs ${
                        activeTab === t.id
                          ? 'bg-amber-400 text-[#141414] border-amber-400 shadow-sm'
                          : 'bg-[#1D1D1B] text-[#D4D3D0] border-[#2A2A28] hover:bg-[#282825] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        <span className="sm:hidden">{t.shortLabel}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()
        ) : (
          // SIFPRO TABS (SPECIALIZED SECTIONS)
          (() => {
            const isTelemarketingAllowedForSifpro = Boolean(
              activeUser && (
                isRootUser(activeUser) ||
                activeUser.role === 'Sistemas' ||
                activeUser.role === 'Telemarketing'
              ) &&
              activeUser.role !== 'Desarrollador de Mercado' &&
              activeUser.role !== 'Jefe de Ventas'
            );

            const sifproTabsList = [
              { id: 'physical' as const, label: '1. Inventario Físico', icon: FileSpreadsheet },
              { id: 'reception' as const, label: '2. Recepciones Matriz', icon: Building2 },
              { id: 'sales' as const, label: '3. Ventas Diarias', icon: TrendingUp },
              { id: 'returns' as const, label: '4. Devoluciones Yoreme', icon: RotateCcw },
              { id: 'available' as const, label: '5. Balance Disponible', icon: Scale },
              isTelemarketingAllowedForSifpro && { id: 'telemarketing' as const, label: '6. Telemarketing SIFPRO', icon: Package },
              { id: 'reportes' as const, label: '7. Reportes SIFPRO', icon: Layers },
            ].filter(Boolean) as { id: any; label: string; icon: any }[];

            const sifproGridCols =
              sifproTabsList.length <= 4
                ? 'grid-cols-2 sm:grid-cols-4'
                : sifproTabsList.length === 6
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7';

            return (
              <div className={`grid ${sifproGridCols} w-full gap-1 sm:gap-1.5 pb-1.5 pt-1 border-t border-[#1C2836]`}>
                {sifproTabsList.map((t) => {
                  const Icon = t.icon;
                  const isCurrent = sifproTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSifproTab && setSifproTab(t.id)}
                      className={`flex items-center justify-start gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-2 sm:py-1.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-tight transition-all border w-full text-left cursor-pointer rounded-xs ${
                        isCurrent
                          ? 'bg-cyan-400 text-[#0E1726] border-cyan-400 shadow-sm font-black'
                          : 'bg-[#121A24] text-gray-300 border-[#1E2B38] hover:bg-[#1A2533] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={systemUsers}
        activeUser={activeUser}
        setActiveUser={setActiveUser}
        onAddUser={addSystemUser}
        onUpdateUser={updateSystemUser}
        onDeleteUser={deleteSystemUser}
      />

      <UserLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={systemUsers}
        activeUser={activeUser}
        setActiveUser={setActiveUser}
      />

      <ConditionExpirationModal
        isOpen={isExpirationModalOpen}
        onClose={() => setIsExpirationModalOpen(false)}
      />

      <SpeciesCatalogModal
        isOpen={isSpeciesCatalogOpen}
        onClose={() => setIsSpeciesCatalogOpen(false)}
        speciesList={speciesList}
        products={products}
        labels={labels}
        onAddSpecies={addSpecies}
        onUpdateSpecies={updateSpecies}
        onDeleteSpecies={deleteSpecies}
        initialTab={speciesModalTab}
      />

      <SystemResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setIsResetModalOpen(false);
        }}
      />
    </header>
  );
};
