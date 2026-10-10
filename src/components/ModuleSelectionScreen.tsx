import React, { useState } from 'react';
import {
  Package,
  FileSpreadsheet,
  Barcode,
  QrCode,
  TrendingUp,
  Scale,
  RotateCcw,
  Boxes,
  Database,
  ArrowRight,
  Shield,
  MapPin,
  LogOut,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';
import { SystemUser, SifproInventoryRecord, PrintedLabel } from '../types';
import { SifproComingSoonModal } from './SifproComingSoonModal';
import { SystemResetModal } from './SystemResetModal';
import { isTabAllowedForRole, isRootUser, isAdminUser } from './Header';

interface Props {
  activeUser: SystemUser;
  labelsCount: number;
  sifproCount: number;
  onSelectModule: (module: 'pnc' | 'sifpro', targetTab?: string) => void;
  onLogout: () => void;
  onChangeUser: () => void;
}

export const ModuleSelectionScreen: React.FC<Props> = ({
  activeUser,
  labelsCount,
  sifproCount,
  onSelectModule,
  onLogout,
  onChangeUser,
}) => {
  const [isSifproModalOpen, setIsSifproModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const isAdmin = isAdminUser(activeUser);

  const isFase1Allowed = isTabAllowedForRole(activeUser, 'fase1');
  const isFase2Allowed = isTabAllowedForRole(activeUser, 'fase2');
  const isFase3Allowed = isTabAllowedForRole(activeUser, 'fase3');
  const isDesarrolloAllowed = isTabAllowedForRole(activeUser, 'desarrollo');
  const isReportesAllowed = isTabAllowedForRole(activeUser, 'reportes');

  const pncPhases = [
    isFase1Allowed && { id: 'fase1', label: 'Fase 1: Creación & Báscula', icon: Barcode },
    isFase2Allowed && { id: 'fase2', label: 'Fase 2: Almacén PNC', icon: Package },
    isFase3Allowed && { id: 'fase3', label: 'Fase 3: Lector Códigos / Salidas', icon: QrCode },
    isDesarrolloAllowed && {
      id: 'desarrollo',
      label:
        activeUser.role === 'Telemarketing'
          ? 'Fase 4: Telemarketing & Pedidos'
          : 'Fase 4: Desarrollo de Mercado & Pedidos',
      icon: TrendingUp,
    },
    isReportesAllowed && { id: 'reportes', label: 'Fase 5: Reportes de Trazabilidad y Mermas', icon: Building2 },
  ].filter(Boolean) as { id: string; label: string; icon: any }[];

  const defaultTab =
    activeUser.role === 'Dirección'
      ? 'reportes'
      : activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas' || activeUser.role === 'Telemarketing'
      ? 'desarrollo'
      : 'fase1';

  const isSifproModuleAllowed = Boolean(
    isRootUser(activeUser) ||
    activeUser.role === 'Sistemas' ||
    activeUser.role === 'Administrador Almacén' ||
    activeUser.role === 'Operador de Embarque' ||
    activeUser.role === 'Gerente Sucursal'
  );

  const isSalesProfile = activeUser.role === 'Desarrollador de Mercado' || activeUser.role === 'Jefe de Ventas';
  const isDirectionProfile = activeUser.role === 'Dirección';
  const isTelemarketingProfile = activeUser.role === 'Telemarketing';

  return (
    <div className="min-h-screen bg-[#EBEAE5] text-[#141414] font-sans flex flex-col antialiased notranslate" translate="no">
      {/* SIFPRO Coming Soon Modal */}
      <SifproComingSoonModal
        isOpen={isSifproModalOpen}
        onClose={() => setIsSifproModalOpen(false)}
        onGoToPnc={() => onSelectModule('pnc')}
      />

      {/* Top Bar with User Profile */}
      <header className="bg-[#141414] text-white border-b border-[#2A2A28] py-3.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-400 flex items-center justify-center text-[#141414] font-black border border-[#141414] rounded-xs shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-mono font-black text-sm sm:text-base tracking-tight text-white uppercase leading-none">
                SISTEMA INDUSTRIAL INTEGRADO
              </h1>
              <p className="font-mono text-[11px] text-[#A0A09C] mt-0.5">
                SELECCIÓN DE MÓDULO OPERATIVO PRINCIPAL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="hidden sm:flex items-center gap-2 bg-[#1F1F1D] px-3 py-1.5 border border-[#3A3A36] rounded-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>[{activeUser.employeeNumber}] {activeUser.name}</span>
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 text-[10px]">
                {activeUser.role}
              </span>
              <span className="text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 text-[10px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>{activeUser.assignedZone || 'General'}</span>
              </span>
            </div>

            <button
              onClick={onChangeUser}
              className="px-2.5 py-1.5 bg-[#282824] hover:bg-[#343430] text-amber-300 border border-amber-400/60 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
              title="Cambiar a otro usuario o perfil"
            >
              Cambiar Usuario
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-600 rounded text-[11px] font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Reiniciar datos de la app para iniciar una prueba desde 0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reiniciar Datos (Prueba 0)</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 hover:text-white border border-red-700/80 rounded text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
              title="Cerrar sesión actual"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex flex-col justify-center">
        {/* Admin Testing Environment Banner */}
        {isAdmin && (
          <div className="bg-[#181816] border-2 border-amber-500/70 p-4 sm:p-5 rounded-xs mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono shadow-2xl text-left">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 bg-amber-400 text-black rounded flex items-center justify-center font-black shadow-md shrink-0">
                <RotateCcw className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-xs">
                    PANEL ADMINISTRADOR
                  </span>
                  <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-tight">
                    Entorno de Pruebas: Iniciar Operación Desde Cero
                  </h3>
                </div>
                <p className="text-[11px] text-gray-300 mt-1 max-w-2xl font-sans leading-relaxed">
                  Reinicie de manera limpia los pedidos de Telemarketing, las reservas de stock y las salidas con sustitución para probar el ciclo operativo completo desde 0 (Desarrollador ➔ Telemarketing ➔ Embarque).
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase rounded border border-amber-500 flex items-center gap-2 cursor-pointer shadow-md transition-all shrink-0 w-full md:w-auto justify-center"
            >
              <RotateCcw className="w-4 h-4 text-black" />
              <span>Reiniciar Datos para Pruebas</span>
            </button>
          </div>
        )}

        <div className="text-center mb-8 sm:mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#141414] text-amber-400 px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-amber-500/40 shadow-xs mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plataforma Unificada de Operación</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#141414] tracking-tight uppercase">
            Seleccione el Módulo de Trabajo
          </h2>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto font-sans leading-relaxed">
            Las operaciones han sido organizadas en dos entornos independientes para evitar saturación visual y garantizar flujos de trabajo claros y libres de confusiones.
          </p>
        </div>

        {/* Module Cards Grid */}
        <div className={`gap-6 sm:gap-8 mx-auto w-full ${isSifproModuleAllowed ? 'grid grid-cols-1 md:grid-cols-2 max-w-5xl' : 'max-w-2xl'}`}>
          {/* Card 1: PRODUCTO NO CONFORME (PNC) / MÓDULO ASIGNADO */}
          <div className="bg-[#181816] text-white border-2 border-amber-400/60 rounded-xs shadow-xl flex flex-col justify-between overflow-hidden relative group hover:border-amber-400 transition-all hover:shadow-2xl">
            {/* Top Accent Strip */}
            <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600"></div>

            <div className="p-6 sm:p-7 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-400 text-[#141414] rounded-xs font-black shadow-md">
                    {isSalesProfile ? <TrendingUp className="w-8 h-8" /> : isDirectionProfile ? <Layers className="w-8 h-8" /> : <Package className="w-8 h-8" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60">
                      {isSalesProfile ? 'MÓDULO COMERCIAL' : isDirectionProfile ? 'MÓDULO DIRECTIVO' : isTelemarketingProfile ? 'MÓDULO TELEMARKETING' : 'MÓDULO 1'}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase mt-1">
                      {isSalesProfile
                        ? 'DESARROLLO DE MERCADO & PEDIDOS'
                        : isDirectionProfile
                        ? 'REPORTES EJECUTIVOS PNC'
                        : isTelemarketingProfile
                        ? 'TELEMARKETING & PEDIDOS PNC'
                        : 'PRODUCTO NO CONFORME (PNC)'}
                    </h3>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  {isSalesProfile ? (
                    <>
                      <span className="text-xs text-gray-400 block">Zona Asignada</span>
                      <span className="text-sm font-bold text-amber-300 bg-[#242420] px-2 py-0.5 rounded border border-[#3A3A36]">
                        {activeUser.assignedZone || 'General'}
                      </span>
                    </>
                  ) : isDirectionProfile ? (
                    <>
                      <span className="text-xs text-gray-400 block">Nivel Acceso</span>
                      <span className="text-sm font-bold text-emerald-300 bg-[#14241B] px-2 py-0.5 rounded border border-[#244A30]">
                        Dirección General
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-400 block">Etiquetas Activas</span>
                      <span className="text-base font-bold text-amber-300 bg-[#242420] px-2 py-0.5 rounded border border-[#3A3A36]">
                        {labelsCount} Cajas
                      </span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                {isSalesProfile
                  ? `Catálogo digital de productos PNC con fotos reales, apartado de muestras comerciales y captura de pedidos de venta para ${activeUser.assignedZone || 'su zona asignada'}.`
                  : isDirectionProfile
                  ? 'Consulta directiva e indicadores clave de producto no conforme, mermas acumuladas, tiempos de permanencia y trazabilidad global.'
                  : isTelemarketingProfile
                  ? 'Exploración de inventarios, generación y seguimiento de pedidos comerciales, y monitoreo cronológico de solicitudes de vendedores.'
                  : 'Gestión de pesaje en báscula Torrey, generación ZPL de etiquetas de no conformidad, control de almacenes refrigerados, registro de salidas y despachos por escáner.'}
              </p>

              {/* Allowed Phases List for this Profile */}
              <div className="bg-[#10100F] p-3.5 rounded border border-[#2E2E2A] space-y-2 font-mono text-xs">
                <div className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1.5 border-b border-[#242420] pb-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Fases disponibles para su perfil ({activeUser.role}):</span>
                </div>
                <div className={`grid gap-1.5 text-[11px] text-gray-300 ${pncPhases.length > 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {pncPhases.map((phase) => {
                    const PhaseIcon = phase.icon;
                    return (
                      <div
                        key={phase.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectModule('pnc', phase.id);
                        }}
                        className="flex items-center gap-1.5 hover:text-amber-300 cursor-pointer p-1.5 rounded hover:bg-[#1A1A18] transition-colors border border-transparent hover:border-[#333]"
                      >
                        <PhaseIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold">{phase.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 sm:p-5 bg-[#121210] border-t border-[#2A2A26] flex items-center justify-between">
              <span className="text-[11px] font-mono text-gray-400">
                {pncPhases.length} {pncPhases.length === 1 ? 'Sección Autorizada' : 'Fases Autorizadas'}
              </span>
              <button
                onClick={() => onSelectModule('pnc', defaultTab)}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase tracking-wider rounded-xs border border-amber-500 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md"
              >
                <span>
                  {isSalesProfile
                    ? 'Ingresar a Muestras y Pedidos'
                    : isDirectionProfile
                    ? 'Ingresar a Reportes PNC'
                    : isTelemarketingProfile
                    ? 'Ingresar a Telemarketing & Pedidos'
                    : 'Ingresar a Producto No Conforme'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: INVENTARIOS SIFPRO (Solo visible para perfiles autorizados de almacén/sistemas) */}
          {isSifproModuleAllowed && (
          <div
            onClick={() => setIsSifproModalOpen(true)}
            className="bg-[#141A22] text-white border-2 border-cyan-500/50 rounded-xs shadow-xl flex flex-col justify-between overflow-hidden relative group hover:border-cyan-400 transition-all hover:shadow-2xl cursor-pointer"
          >
            {/* Top Accent Strip */}
            <div className="h-2 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600"></div>

            <div className="p-6 sm:p-7 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#1C2C3F] border border-cyan-400/50 text-cyan-300 rounded-xs font-black shadow-md">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-300 uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-600/60">
                        MÓDULO 2
                      </span>
                      <span className="text-[10px] font-mono font-bold tracking-wider text-amber-300 uppercase bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/60 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Próximamente</span>
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase mt-1 flex items-center gap-2">
                      <span>GESTIÓN DE INVENTARIOS SIFPRO</span>
                    </h3>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className="text-xs text-gray-400 block">Sincronizados</span>
                  <span className="text-base font-bold text-cyan-300 bg-[#162434] px-2 py-0.5 rounded border border-[#243B53]">
                    {sifproCount} Cajas
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                Conciliación y trazabilidad masiva de inventario físico, recepciones de matriz, ventas diarias, escaneo de devoluciones Yoreme 29 dígitos conectado a báscula Torrey, balances netos y reportes de caducidades.
              </p>

              {/* SIFPRO Features List */}
              <div className="bg-[#0B111A] p-3.5 rounded border border-[#1E2D3D] space-y-2 font-mono text-xs">
                <div className="text-[11px] font-bold text-cyan-400 uppercase flex items-center justify-between border-b border-[#182535] pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>Secciones en integración SIFPRO:</span>
                  </div>
                  <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-700/50">
                    En Espera
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-400">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSifproModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-[#121E2C] transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong>1.</strong> Inventario Físico</span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSifproModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-[#121E2C] transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong>2.</strong> Recepciones Matriz</span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSifproModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-[#121E2C] transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong>3.</strong> Ventas Diarias</span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSifproModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-[#121E2C] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong>4.</strong> Devoluciones Yoreme</span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSifproModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-[#121E2C] transition-colors sm:col-span-2"
                  >
                    <Scale className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong>5.</strong> Balance Neto & Reportes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 sm:p-5 bg-[#0E1520] border-t border-[#1C2836] flex items-center justify-between">
              <span className="text-[11px] font-mono text-amber-300/80 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Bloqueado temporalmente</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSifproModalOpen(true);
                }}
                className="px-5 py-2.5 bg-[#1C2D42] hover:bg-cyan-900/60 text-cyan-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xs border border-cyan-500/60 flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Próximamente</span>
              </button>
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#141414] text-[#888884] py-3 text-xs border-t border-[#2A2A28] mt-auto font-mono text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ZEBRA ZPL & INVENTARIOS INDUSTRIALES</span>
          <span className="text-gray-400 text-[11px]">Control de Acceso Seguro por Rol de Colaborador</span>
        </div>
      </footer>

      {/* System Reset Modal for Administrator */}
      <SystemResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onNavigateToTab={(tab) => {
          setIsResetModalOpen(false);
          onSelectModule('pnc', tab);
        }}
      />
    </div>
  );
};
