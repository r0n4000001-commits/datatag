import React, { useState, useEffect } from 'react';
import { SpeciesItem, Product, PrintedLabel, TareItem } from '../types';
import { useInventory } from '../context/InventoryContext';
import {
  Dna,
  X,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Globe,
  Scale,
  Package,
  Hash,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  getSpeciesBadgeClass,
  getSpeciesBadgeStyle,
} from '../utils/speciesUtils';
import { SpeciesManagerModal } from './SpeciesManagerModal';
import { TareEditorModal } from './TareEditorModal';

interface SpeciesCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  speciesList: SpeciesItem[];
  products: Product[];
  labels: PrintedLabel[];
  onAddSpecies: (speciesData: Omit<SpeciesItem, 'id'>) => SpeciesItem;
  onUpdateSpecies: (species: SpeciesItem, oldLegend?: string) => void;
  onDeleteSpecies: (id: string) => void;
  initialTab?: 'species' | 'tares';
}

export const SpeciesCatalogModal: React.FC<SpeciesCatalogModalProps> = ({
  isOpen,
  onClose,
  speciesList,
  products,
  labels,
  onAddSpecies,
  onUpdateSpecies,
  onDeleteSpecies,
  initialTab = 'species',
}) => {
  const { tares, addTare, updateTare, deleteTare } = useInventory();
  const [activeTab, setActiveTab] = useState<'species' | 'tares'>('species');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<'all' | 'nacional' | 'importado'>('all');

  // Species Editor Modal State
  const [isSpeciesEditorOpen, setIsSpeciesEditorOpen] = useState(false);
  const [speciesToEdit, setSpeciesToEdit] = useState<SpeciesItem | null>(null);
  const [confirmDeleteSpeciesId, setConfirmDeleteSpeciesId] = useState<string | null>(null);

  // Tare Editor Modal State
  const [isTareEditorOpen, setIsTareEditorOpen] = useState(false);
  const [tareToEdit, setTareToEdit] = useState<TareItem | null>(null);
  const [confirmDeleteTareId, setConfirmDeleteTareId] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // -------------------------------------------------------------
  // SPECIES FILTERING & HANDLERS
  // -------------------------------------------------------------
  const filteredSpecies = speciesList.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term) ||
      s.legend.toLowerCase().includes(term) ||
      (s.origin || '').toLowerCase().includes(term);

    let matchOrigin = true;
    if (selectedOriginFilter === 'nacional') {
      matchOrigin =
        (s.origin || '').toLowerCase().includes('nacional') ||
        (s.origin || '').toLowerCase().includes('méxico');
    } else if (selectedOriginFilter === 'importado') {
      matchOrigin =
        (s.origin || '').toLowerCase().includes('importado') ||
        (s.origin || '').toLowerCase().includes('ee.uu') ||
        (s.origin || '').toLowerCase().includes('canadá');
    }

    return matchSearch && matchOrigin;
  });

  const handleOpenAddSpecies = () => {
    setSpeciesToEdit(null);
    setIsSpeciesEditorOpen(true);
  };

  const handleOpenEditSpecies = (s: SpeciesItem) => {
    setSpeciesToEdit(s);
    setIsSpeciesEditorOpen(true);
  };

  const handleSaveSpeciesModal = (
    data: {
      code: string;
      name: string;
      legend: string;
      origin: string;
      description: string;
      badgeColor: string;
    },
    oldLegend?: string
  ) => {
    if (speciesToEdit) {
      onUpdateSpecies(
        {
          ...speciesToEdit,
          ...data,
        },
        oldLegend
      );
      showNotification(`Especie "${data.name}" actualizada con éxito.`);
    } else {
      onAddSpecies(data);
      showNotification(`Especie "${data.name}" creada con éxito.`);
    }
    setIsSpeciesEditorOpen(false);
    setSpeciesToEdit(null);
  };

  const handleDeleteSpecies = (id: string, name: string) => {
    onDeleteSpecies(id);
    setConfirmDeleteSpeciesId(null);
    showNotification(`Especie "${name}" eliminada.`);
  };

  // -------------------------------------------------------------
  // TARES FILTERING & HANDLERS
  // -------------------------------------------------------------
  const filteredTares = tares.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.code.toLowerCase().includes(term) ||
      String(t.tareNumber).includes(term) ||
      String(t.weight).includes(term) ||
      (t.description || '').toLowerCase().includes(term)
    );
  });

  const handleOpenAddTare = () => {
    setTareToEdit(null);
    setIsTareEditorOpen(true);
  };

  const handleOpenEditTare = (t: TareItem) => {
    setTareToEdit(t);
    setIsTareEditorOpen(true);
  };

  const handleSaveTareModal = (tareData: Omit<TareItem, 'id'>) => {
    if (tareToEdit) {
      updateTare({
        ...tareToEdit,
        ...tareData,
      });
      showNotification(`Tara #${tareData.tareNumber} ("${tareData.name}") actualizada con éxito.`);
    } else {
      const created = addTare(tareData);
      showNotification(`Tara #${created.tareNumber} ("${created.name}") creada con éxito.`);
    }
    setIsTareEditorOpen(false);
    setTareToEdit(null);
  };

  const handleDeleteTare = (id: string, name: string, num: number) => {
    deleteTare(id);
    setConfirmDeleteTareId(null);
    showNotification(`Tara #${num} ("${name}") eliminada.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs font-mono notranslate"
      translate="no"
    >
      <div className="bg-[#FAF9F6] border-2 border-[#141414] w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl rounded-xs overflow-hidden">
        {/* Main Modal Header */}
        <div className="bg-[#141414] text-white p-3 sm:p-4 border-b-2 border-amber-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 flex items-center justify-center rounded-xs font-black shadow-xs ${
                  activeTab === 'species' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-[#141414]'
                }`}
              >
                {activeTab === 'species' ? <Dna className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-sm sm:text-base uppercase tracking-tight text-white">
                    {activeTab === 'species'
                      ? 'Catálogo de Especie / Origen'
                      : 'Catálogo de Taras de Empaque'}
                  </h2>
                  <span
                    className={`text-[10px] px-2 py-0.5 border rounded-xs font-bold uppercase ${
                      activeTab === 'species'
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : 'bg-amber-950 text-amber-300 border-amber-600'
                    }`}
                  >
                    {activeTab === 'species'
                      ? `${speciesList.length} Especies`
                      : `${tares.length} Taras Registradas`}
                  </span>
                </div>
                <p className="text-[11px] text-[#A0A09C]">
                  {activeTab === 'species'
                    ? 'Administración de especies de carne, leyendas Zebra y denominación de origen'
                    : 'Pesos de empaque (cajas de cartón, bolsas al vacío, tinas) a descontar automáticamente en báscula'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'species' ? (
                <button
                  type="button"
                  onClick={handleOpenAddSpecies}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase flex items-center gap-1.5 rounded-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Nueva Especie</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenAddTare}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase flex items-center gap-1.5 rounded-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-[#141414]" />
                  <span className="hidden sm:inline">Nueva Tara</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#282824] transition-colors rounded-xs cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#2A2A26]">
            <button
              type="button"
              onClick={() => setActiveTab('species')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase transition-all rounded-xs cursor-pointer ${
                activeTab === 'species'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-[#222220] hover:bg-[#2C2C28] text-gray-300 border border-[#3A3A36]'
              }`}
            >
              <Dna className="w-3.5 h-3.5 text-rose-300" />
              <span>Especies / Orígenes</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono">
                {speciesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tares')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase transition-all rounded-xs cursor-pointer ${
                activeTab === 'tares'
                  ? 'bg-amber-400 text-[#141414] shadow-xs'
                  : 'bg-[#222220] hover:bg-[#2C2C28] text-gray-300 border border-[#3A3A36]'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Taras de Empaques (-KG)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/40 text-amber-300 rounded-full font-mono">
                {tares.length}
              </span>
            </button>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {notification && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-emerald-700 animate-in fade-in">
            <span>{notification}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-white hover:text-emerald-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar Filter & Search */}
        <div className="bg-[#FAF9F6] p-3 border-b border-[#141414]/20 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'species'
                  ? 'Buscar por nombre, código, leyenda Zebra u origen...'
                  : 'Buscar por No. de tara, código, nombre o peso...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#141414] text-xs font-bold placeholder:font-normal text-[#141414] outline-hidden focus:ring-1 focus:ring-[#141414]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab === 'species' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-600 font-bold uppercase">Origen:</span>
              <div className="inline-flex border border-[#141414]/30 bg-white">
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('all')}
                  className={`px-2 py-1 text-[11px] font-bold ${
                    selectedOriginFilter === 'all'
                      ? 'bg-[#141414] text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Todos ({speciesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('nacional')}
                  className={`px-2 py-1 text-[11px] font-bold border-l border-[#141414]/30 ${
                    selectedOriginFilter === 'nacional'
                      ? 'bg-[#141414] text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Nacional
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOriginFilter('importado')}
                  className={`px-2 py-1 text-[11px] font-bold border-l border-[#141414]/30 ${
                    selectedOriginFilter === 'importado'
                      ? 'bg-[#141414] text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Importado
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-[#444] bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-xs">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Fórmula de Pesaje: <strong>Peso Neto = Peso Báscula - Tara Asignada</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tab 1: SPECIES CATALOG CONTENT */}
        {activeTab === 'species' && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#F8F7F4] space-y-3">
            {filteredSpecies.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#141414]/30 p-10 text-center space-y-3">
                <Dna className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-sm font-bold text-[#141414]">No se encontraron especies u orígenes</p>
                <p className="text-xs text-[#666]">
                  {searchTerm
                    ? 'Pruebe con otro término de búsqueda'
                    : 'Presione "Nueva Especie" para agregar una'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddSpecies}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-black transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Crear Especie</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSpecies.map((s) => {
                  const linkedProducts = products.filter((p) => p.speciesLegend === s.legend);
                  const prodCount = linkedProducts.length;
                  const labelCount = labels.filter((l) => l.speciesLegend === s.legend).length;
                  const badgeCls = getSpeciesBadgeClass(s.badgeColor);
                  const badgeSty = getSpeciesBadgeStyle(s.badgeColor);

                  return (
                    <div
                      key={s.id}
                      className="bg-white border-2 border-[#141414] p-3.5 space-y-2.5 relative shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-1.5 py-0.5">
                                {s.code}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 border rounded-xs uppercase tracking-wide shadow-2xs ${badgeCls}`}
                                style={badgeSty}
                              >
                                {s.name}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-[#141414] text-xs">{s.name}</h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSpecies(s)}
                              className="p-1.5 hover:bg-[#E4E3E0] border border-[#141414] text-[#141414] transition-colors cursor-pointer"
                              title="Editar Especie / Origen"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSpeciesId(s.id)}
                              className="p-1.5 hover:bg-red-200 border border-red-400 text-red-900 cursor-pointer transition-colors"
                              title="Eliminar Especie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Confirm Delete Inline Box */}
                        {confirmDeleteSpeciesId === s.id && (
                          <div className="p-2 bg-red-50 border border-red-300 space-y-1.5">
                            <p className="text-[11px] text-red-900 font-bold">
                              ¿Eliminar especie "{s.name}"?{' '}
                              {prodCount > 0 && `(${prodCount} productos asociados)`}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteSpecies(s.id, s.name)}
                                className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-xs"
                              >
                                Sí, Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSpeciesId(null)}
                                className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[10px] font-bold uppercase rounded-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Zebra Label Box Preview */}
                        <div className="bg-amber-50/70 border border-amber-300 p-2 text-xs flex items-center justify-between gap-2">
                          <span className="text-[10px] text-amber-900 font-bold uppercase flex items-center gap-1">
                            <Tag className="w-3 h-3 text-amber-700" />
                            Leyenda Zebra:
                          </span>
                          <span className="bg-[#141414] text-amber-300 px-2 py-0.5 font-mono font-black text-xs uppercase border border-amber-500 tracking-wider">
                            {s.legend}
                          </span>
                        </div>

                        {/* Origin tag */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#444]">
                          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-[#141414]">{s.origin || 'Nacional'}</span>
                        </div>

                        <p className="text-[11px] text-[#555] line-clamp-2 italic">
                          {s.description || 'Sin descripción o notas asignadas'}
                        </p>
                      </div>

                      <div className="border-t border-[#141414]/15 pt-2 text-[10px] space-y-1 text-[#333]">
                        <div className="flex justify-between font-bold">
                          <span>Productos asociados:</span>
                          <span className="text-[#141414] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                            {prodCount} SKU
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Cajas etiquetadas:</span>
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                            {labelCount} cajas
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: TARES DE EMPAQUE CONTENT */}
        {activeTab === 'tares' && (
          <div className="flex-1 overflow-y-auto p-4 bg-[#F8F7F4] space-y-3">
            {filteredTares.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#141414]/30 p-10 text-center space-y-3">
                <Scale className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-sm font-bold text-[#141414]">No se encontraron taras de empaque</p>
                <p className="text-xs text-[#666]">
                  {searchTerm
                    ? 'Pruebe con otro término de búsqueda'
                    : 'Presione "Nueva Tara" para registrar el peso de un empaque (caja de cartón, bolsa, tina)'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddTare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] text-white text-xs font-bold uppercase hover:bg-black transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Crear Primera Tara</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTares.map((t) => {
                  const linkedProducts = products.filter(
                    (p) => p.tareId === t.id || p.tareNumber === t.tareNumber
                  );
                  const prodCount = linkedProducts.length;

                  return (
                    <div
                      key={t.id}
                      className="bg-white border-2 border-[#141414] p-3.5 space-y-2.5 relative shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Top row with Tare Number & Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-mono font-black bg-amber-400 text-[#141414] px-2 py-0.5 border border-[#141414] shadow-2xs flex items-center gap-1">
                              <Hash className="w-3 h-3 text-[#141414]" />
                              TARA #{t.tareNumber}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-1.5 py-0.5">
                              {t.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTare(t)}
                              className="p-1.5 hover:bg-[#E4E3E0] border border-[#141414] text-[#141414] transition-colors cursor-pointer"
                              title="Editar Tara de Empaque"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTareId(t.id)}
                              className="p-1.5 hover:bg-red-200 border border-red-400 text-red-900 cursor-pointer transition-colors"
                              title="Eliminar Tara"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Confirm Delete Inline Box */}
                        {confirmDeleteTareId === t.id && (
                          <div className="p-2 bg-red-50 border border-red-300 space-y-1.5">
                            <p className="text-[11px] text-red-900 font-bold">
                              ¿Eliminar Tara #{t.tareNumber} "{t.name}"?{' '}
                              {prodCount > 0 && `(${prodCount} productos asociados)`}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteTare(t.id, t.name, t.tareNumber)}
                                className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-xs"
                              >
                                Sí, Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTareId(null)}
                                className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[10px] font-bold uppercase rounded-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Name */}
                        <h4 className="font-extrabold text-[#141414] text-xs leading-snug">
                          {t.name}
                        </h4>

                        {/* Tare Weight Highlight Card */}
                        <div className="bg-emerald-50 border-2 border-emerald-600 p-2 text-xs flex items-center justify-between">
                          <span className="text-[10px] text-emerald-950 font-bold uppercase flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-emerald-700" />
                            Descuento de Peso:
                          </span>
                          <span className="font-mono font-black text-sm text-emerald-900 bg-white px-2 py-0.5 border border-emerald-500 rounded-xs">
                            -{Number(t.weight).toFixed(2)} {t.unit || 'KG'}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-[#555] line-clamp-2 italic">
                          {t.description || 'Sin notas o dimensiones especificadas'}
                        </p>
                      </div>

                      {/* Footer product links */}
                      <div className="border-t border-[#141414]/15 pt-2 text-[10px] space-y-1 text-[#333]">
                        <div className="flex justify-between items-center font-bold">
                          <span>Productos asignados:</span>
                          <span className="text-[#141414] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                            {prodCount} Producto(s)
                          </span>
                        </div>
                        {prodCount > 0 && (
                          <div className="text-[9px] text-gray-500 truncate" title={linkedProducts.map((p) => p.name).join(', ')}>
                            {linkedProducts.map((p) => p.code).slice(0, 3).join(', ')}
                            {linkedProducts.length > 3 && ` +${linkedProducts.length - 3} más`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div className="bg-[#141414] text-white p-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#2E2E2A]">
          <span className="text-[11px] text-gray-400">
            {activeTab === 'species' ? (
              <>
                Todo el inventario de almacén se maneja en <strong>Individual (Cajas)</strong> con su respectiva especie/origen.
              </>
            ) : (
              <>
                Las taras asignadas a productos se <strong>restan automáticamente</strong> del peso de báscula en la estación de etiquetado.
              </>
            )}
          </span>
          <div className="flex gap-2">
            {activeTab === 'species' ? (
              <button
                type="button"
                onClick={handleOpenAddSpecies}
                className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase transition-colors"
              >
                + Nueva Especie
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddTare}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-[#141414] font-bold text-xs uppercase transition-colors"
              >
                + Nueva Tara
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-[#282824] hover:bg-[#343430] text-gray-200 text-xs font-bold uppercase transition-colors border border-[#444]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Species Manager Modal */}
      {isSpeciesEditorOpen && (
        <SpeciesManagerModal
          isOpen={isSpeciesEditorOpen}
          onClose={() => {
            setIsSpeciesEditorOpen(false);
            setSpeciesToEdit(null);
          }}
          speciesToEdit={speciesToEdit}
          existingSpecies={speciesList}
          productCount={
            speciesToEdit ? products.filter((p) => p.speciesLegend === speciesToEdit.legend).length : 0
          }
          labelCount={
            speciesToEdit ? labels.filter((l) => l.speciesLegend === speciesToEdit.legend).length : 0
          }
          onSave={handleSaveSpeciesModal}
        />
      )}

      {/* Tare Editor Modal */}
      {isTareEditorOpen && (
        <TareEditorModal
          isOpen={isTareEditorOpen}
          onClose={() => {
            setIsTareEditorOpen(false);
            setTareToEdit(null);
          }}
          tareToEdit={tareToEdit}
          existingTares={tares}
          productCount={
            tareToEdit
              ? products.filter(
                  (p) => p.tareId === tareToEdit.id || p.tareNumber === tareToEdit.tareNumber
                ).length
              : 0
          }
          onSave={handleSaveTareModal}
        />
      )}
    </div>
  );
};
