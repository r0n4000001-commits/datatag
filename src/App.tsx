import React, { useState, useEffect } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Header, isTabAllowedForRole, isRootUser } from './components/Header';
import { UserLoginScreen } from './components/UserLoginScreen';
import { ModuleSelectionScreen } from './components/ModuleSelectionScreen';
import { Phase1LabelCreation } from './components/Phase1LabelCreation';
import { Phase2InventoryAdmin } from './components/Phase2InventoryAdmin';
import { Phase3ScannerOutput } from './components/Phase3ScannerOutput';
import { Phase4MarketDevelopment } from './components/Phase4MarketDevelopment';
import { Phase5Reports } from './components/Phase5Reports';
import { SifproInventorySubmenu } from './components/SifproInventorySubmenu';
import { ZebraPrinterSettingsModal } from './components/ZebraPrinterSettingsModal';
import { LabelFormatEditorModal } from './components/LabelFormatEditorModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Lock, ArrowRight, CheckCircle2, Package } from 'lucide-react';

function AppContent() {
  const { activeUser, setActiveUser, systemUsers, labels, sifproRecords } = useInventory();
  
  // High level active module: null = ModuleSelectionScreen, 'pnc' = Producto No Conforme, 'sifpro' = SIFPRO
  const [activeModule, setActiveModule] = useState<'pnc' | 'sifpro' | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fase1');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFormatEditorOpen, setIsFormatEditorOpen] = useState(false);

  // Auto redirect to an allowed tab whenever activeUser or activeModule changes
  useEffect(() => {
    if (!activeUser) return;

    if (isRootUser(activeUser)) {
      return; // Root has full access to all tabs
    }

    if (activeModule === 'pnc') {
      if (!isTabAllowedForRole(activeUser, activeTab as any)) {
        if (activeUser.role === 'Dirección') {
          setActiveTab('reportes');
        } else if (activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas' || activeUser.role === 'Telemarketing') {
          setActiveTab('desarrollo');
        } else {
          setActiveTab('fase1');
        }
      }
    }
  }, [activeUser, activeModule, activeTab]);

  // If no user is logged in, show the User Login Screen first
  if (!activeUser) {
    return (
      <UserLoginScreen
        users={systemUsers || []}
        onLoginSuccess={(user) => {
          setActiveUser(user);
          // Default to main module selection screen
          setActiveModule(null);
        }}
      />
    );
  }

  // If user is logged in, but no module has been selected, show ModuleSelectionScreen
  if (!activeModule) {
    return (
      <ModuleSelectionScreen
        activeUser={activeUser}
        labelsCount={(labels || []).length}
        sifproCount={(sifproRecords || []).length}
        onSelectModule={(mod, targetTab) => {
          setActiveModule(mod);
          if (targetTab) {
            setActiveTab(targetTab);
          } else {
            // Default first tab for the chosen module
            if (mod === 'pnc') {
              if (activeUser.role === 'Dirección') {
                setActiveTab('reportes');
              } else if (activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas' || activeUser.role === 'Telemarketing') {
                setActiveTab('desarrollo');
              } else {
                setActiveTab('fase1');
              }
            } else {
              // sifpro
              if (activeUser.role === 'Dirección') {
                setActiveTab('reportes');
              } else if (activeUser.role === 'Telemarketing') {
                setActiveTab('telemarketing');
              } else {
                setActiveTab('physical');
              }
            }
          }
        }}
        onLogout={() => {
          setActiveUser(null);
          setActiveModule(null);
        }}
        onChangeUser={() => {
          setActiveUser(null);
          setActiveModule(null);
        }}
      />
    );
  }

  const isCurrentTabAllowed = isTabAllowedForRole(activeUser, activeTab as any);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col antialiased notranslate" translate="no">
      {/* Top Header with Module Navigation */}
      <Header
        activeTab={activeTab as any}
        setActiveTab={setActiveTab as any}
        activeModule={activeModule}
        sifproTab={activeTab as any}
        setSifproTab={(tab) => setActiveTab(tab as any)}
        onReturnToMainMenu={() => setActiveModule(null)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFormatEditor={() => setIsFormatEditorOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 py-4 space-y-4">
        {!isCurrentTabAllowed && activeModule === 'pnc' ? (
          <div className="bg-[#1D1D1B] border-2 border-red-500/60 p-6 rounded-xs text-white max-w-2xl mx-auto my-8 space-y-4 shadow-xl font-mono">
            <div className="flex items-center gap-3 border-b border-[#3A3A36] pb-3">
              <div className="p-2.5 rounded bg-red-950/80 border border-red-600 text-red-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-red-400 tracking-wider flex items-center gap-2">
                  <span>Acceso Restringido por Perfil</span>
                  <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded">
                    {activeUser.role}
                  </span>
                </h3>
                <p className="text-xs text-gray-300 font-sans">
                  Módulo no autorizado para su perfil de usuario
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              El colaborador <strong className="text-white">{activeUser.name}</strong> (No. Empleado <strong className="text-amber-300">{activeUser.employeeNumber}</strong>) con zona asignada <strong className="text-amber-300">{activeUser.assignedZone || 'General'}</strong> no tiene permisos para operar la sección elegida.
            </p>

            <div className="bg-[#141414] p-3.5 border border-[#3A3A36] rounded text-xs space-y-2 font-mono">
              <p className="text-amber-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Módulos permitidos para su perfil ({activeUser.role}):
              </p>
              {activeUser.role === 'Dirección' && (
                <p className="text-emerald-300 text-xs">
                  • <strong>Fase 5 (Reportes):</strong> Visualización exclusiva de reportes e indicadores.
                </p>
              )}
              {(activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas' || activeUser.role === 'Telemarketing') && (
                <p className="text-emerald-300 text-xs">
                  • <strong>Desarrollo de Mercado:</strong> Prospección, muestras y pedidos de catálogo para su zona ({activeUser.assignedZone || 'Zona Norte'})
                </p>
              )}
              {(activeUser.role === 'Operador de Embarque' || activeUser.role === 'Operador de Etiquetado') && (
                <p className="text-emerald-300 text-xs">
                  • <strong>Fase 1 (Creación/Impresión Etiquetas)</strong>, <strong>Fase 2 (Inventarios y Almacenes)</strong> & <strong>Fase 3 (Salidas y Despacho con Escáner)</strong>
                </p>
              )}
              {activeUser.role === 'Administrador Almacén' && (
                <p className="text-emerald-300 text-xs">
                  • <strong>Fase 1 (Etiquetas)</strong>, <strong>Fase 2 (Inventarios y Almacenes)</strong> & <strong>Fase 3 (Salidas)</strong>
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (activeUser.role === 'Dirección') {
                    setActiveTab('reportes');
                  } else if (activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas' || activeUser.role === 'Telemarketing') {
                    setActiveTab('desarrollo');
                  } else {
                    setActiveTab('fase1');
                  }
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase rounded border border-amber-500 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Ir a Módulo Autorizado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MODULE 1: PRODUCTO NO CONFORME (PNC) */}
            {activeModule === 'pnc' && (
              <ErrorBoundary fallbackTitle="Error al cargar la pantalla del módulo">
                {activeTab === 'fase1' && isTabAllowedForRole(activeUser, 'fase1') && <Phase1LabelCreation onOpenFormatEditor={() => setIsFormatEditorOpen(true)} />}
                {activeTab === 'fase2' && isTabAllowedForRole(activeUser, 'fase2') && <Phase2InventoryAdmin />}
                {activeTab === 'fase3' && isTabAllowedForRole(activeUser, 'fase3') && <Phase3ScannerOutput />}
                {activeTab === 'desarrollo' && isTabAllowedForRole(activeUser, 'desarrollo') && <Phase4MarketDevelopment defaultSource="pnc" />}
                {activeTab === 'reportes' && isTabAllowedForRole(activeUser, 'reportes') && <Phase5Reports defaultInventory="pnc" />}
              </ErrorBoundary>
            )}

            {/* MODULE 2: GESTIÓN DE INVENTARIOS SIFPRO (BLOQUEADO - PRÓXIMAMENTE) */}
            {activeModule === 'sifpro' && (
              <div className="bg-[#141A22] border-2 border-cyan-500/70 p-6 sm:p-8 rounded-xs text-white max-w-3xl mx-auto my-6 space-y-6 shadow-2xl font-mono">
                <div className="flex items-start gap-4 border-b border-[#223348] pb-5">
                  <div className="p-3.5 rounded bg-cyan-950/90 border border-cyan-500 text-cyan-300 shrink-0">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/60">
                        BLOQUEADO TEMPORALMENTE
                      </span>
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60">
                        EN DESARROLLO
                      </span>
                    </div>
                    <h3 className="font-black text-xl sm:text-2xl uppercase text-white tracking-wide">
                      Módulo SIFPRO — Próximamente
                    </h3>
                    <p className="text-xs text-gray-300 font-sans">
                      El apartado de conciliación y control de inventarios SIFPRO se encuentra temporalmente restringido.
                    </p>
                  </div>
                </div>

                <div className="bg-[#0B111A] p-4 rounded border border-[#1E2D3D] space-y-3 font-sans text-xs text-gray-200">
                  <p>
                    Se ha bloqueado el acceso a las funciones de <strong>Inventario Físico, Recepciones Matriz, Ventas Diarias y Devoluciones Yoreme</strong> mientras se completan las integraciones operativas.
                  </p>
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Todas las operaciones de pesaje en báscula Torrey, etiquetado ZPL y almacén están 100% activas en el módulo <strong>Producto No Conforme (PNC)</strong>.</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModule(null)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#1A2533] hover:bg-[#243346] text-gray-300 hover:text-white border border-[#2D3E54] rounded-xs font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Volver al Menú Principal
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('pnc');
                      if (activeUser.role === 'Dirección') {
                        setActiveTab('reportes');
                      } else if (activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas' || activeUser.role === 'Telemarketing') {
                        setActiveTab('desarrollo');
                      } else {
                        setActiveTab('fase1');
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase tracking-wider rounded-xs border border-amber-500 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer shadow-md"
                  >
                    <Package className="w-4 h-4 text-[#141414]" />
                    <span>Ir a Producto No Conforme (PNC)</span>
                    <ArrowRight className="w-4 h-4 text-[#141414]" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* High Density Industrial Footer */}
      <footer className="bg-[#141414] text-[#D4D3D0] py-3 text-xs border-t border-[#141414] mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#A0A09C]">
            {activeModule === 'pnc'
              ? 'SISTEMA INDUSTRIAL Y DE GESTIÓN PRODUCTO NO CONFORME (PNC)'
              : 'SISTEMA DE CONCILIACIÓN Y GESTIÓN DE INVENTARIOS SIFPRO'}
          </p>
          <p className="font-mono text-[11px] text-[#888884] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
            TCP RAW PORT 9100 | ENGINE LABELARY 203/300 DPI
          </p>
        </div>
      </footer>

      {/* Zebra Printer IP Configuration Modal */}
      <ZebraPrinterSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Label Layout & Formatting Editor Modal */}
      <LabelFormatEditorModal
        isOpen={isFormatEditorOpen}
        onClose={() => setIsFormatEditorOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
