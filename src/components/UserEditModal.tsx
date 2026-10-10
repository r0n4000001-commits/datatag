import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  KeyRound,
  IdCard,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Save,
  Check,
} from 'lucide-react';
import { SystemUser, UserRole } from '../types';

export const USER_ROLES_CATALOG: {
  role: UserRole;
  label: string;
  badgeColor: string;
  description: string;
}[] = [
  {
    role: 'Dirección',
    label: 'Dirección General',
    badgeColor: 'bg-indigo-900 text-indigo-200 border-indigo-600',
    description: 'Visualización ejecutiva de reportes, estadísticas y métricas globales.',
  },
  {
    role: 'Jefe de Ventas',
    label: 'Jefe de Ventas',
    badgeColor: 'bg-emerald-900 text-emerald-200 border-emerald-600',
    description: 'Control de ventas, liberación y asignación de mercado para desarrolladores.',
  },
  {
    role: 'Desarrollador de Mercado',
    label: 'Desarrollador de Mercado',
    badgeColor: 'bg-blue-900 text-blue-200 border-blue-600',
    description: 'Prospección de clientes, toma de pedidos y gestión de muestras en su zona.',
  },
  {
    role: 'Telemarketing',
    label: 'Telemarketing',
    badgeColor: 'bg-purple-900 text-purple-200 border-purple-600',
    description: 'Seguimiento telefónico y confirmación de pedidos de desarrolladores.',
  },
  {
    role: 'Operador de Embarque',
    label: 'Operador de Embarque',
    badgeColor: 'bg-amber-900 text-amber-200 border-amber-600',
    description: 'Creación de etiquetas, gestión de inventarios/almacén, control de salidas y escaneo de paquetes.',
  },
  {
    role: 'Gerente Sucursal',
    label: 'Gerente Sucursal',
    badgeColor: 'bg-teal-900 text-teal-200 border-teal-600',
    description: 'Control integral de la sucursal, inventarios, pedidos y mermas.',
  },
  {
    role: 'Operador de Etiquetado',
    label: 'Operador de Etiquetado',
    badgeColor: 'bg-cyan-900 text-cyan-200 border-cyan-600',
    description: 'Pesado con báscula Torrey, impresión Zebra y consulta de inventarios en almacén.',
  },
  {
    role: 'Administrador Almacén',
    label: 'Administrador Almacén',
    badgeColor: 'bg-rose-900 text-rose-200 border-rose-600',
    description: 'Gestión de catálogo de productos, sub-almacenes, categorías y ajustes.',
  },
  {
    role: 'Sistemas',
    label: 'Sistemas (Administrador Total)',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-500',
    description: 'Acceso maestro a toda la plataforma, configuración y base de datos.',
  },
];

const PRESET_ZONES = [
  'Zona Norte',
  'Zona Sur',
  'Zona Centro',
  'Zona Bajío',
  'Zona Occidente',
  'Nacional',
  'Todas / General',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: SystemUser | null;
  existingUsers: SystemUser[];
  onSave: (
    userData: Omit<SystemUser, 'id' | 'createdAt'>,
    editingId?: string
  ) => void;
}

export const UserEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userToEdit,
  existingUsers,
  onSave,
}) => {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Desarrollador de Mercado');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [assignedZone, setAssignedZone] = useState('Zona Norte');
  const [branch, setBranch] = useState('Planta Principal');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setEmployeeNumber(userToEdit.employeeNumber || '');
      setName(userToEdit.name || '');
      setRole(userToEdit.role || 'Desarrollador de Mercado');
      setPassword(userToEdit.password || userToEdit.accessPin || '12345');
      setAssignedZone(userToEdit.assignedZone || 'Zona Norte');
      setBranch(userToEdit.branch || 'Planta Principal');
      setEmail(userToEdit.email || '');
      setPhone(userToEdit.phone || '');
      setIsActive(userToEdit.isActive !== false);
      setFormError('');
    } else {
      // New user defaults
      const nextNum = Math.floor(1000 + Math.random() * 9000);
      setEmployeeNumber(`EMP-${nextNum}`);
      setName('');
      setRole('Desarrollador de Mercado');
      const randomPin = Math.floor(10000 + Math.random() * 90000).toString();
      setPassword(randomPin);
      setAssignedZone('Zona Norte');
      setBranch('Planta Principal');
      setEmail('');
      setPhone('');
      setIsActive(true);
      setFormError('');
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(10000 + Math.random() * 90000).toString();
    setPassword(randomPin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanEmp = employeeNumber.trim();
    const cleanName = name.trim();
    const cleanPass = password.trim();

    if (!cleanEmp) {
      setFormError('Por favor ingrese el Número de Empleado.');
      return;
    }

    if (!cleanName) {
      setFormError('Por favor ingrese el Nombre Completo del colaborador.');
      return;
    }

    if (!cleanPass) {
      setFormError('Por favor asigne una contraseña o PIN de acceso.');
      return;
    }

    // Check duplicate employee number (except when editing the same user)
    const duplicate = existingUsers.find(
      (u) =>
        u.employeeNumber.trim().toLowerCase() === cleanEmp.toLowerCase() &&
        (!userToEdit || u.id !== userToEdit.id)
    );
    if (duplicate) {
      setFormError(`El Número de Empleado "${cleanEmp}" ya pertenece a ${duplicate.name}.`);
      return;
    }

    onSave(
      {
        employeeNumber: cleanEmp,
        name: cleanName,
        role,
        accessPin: cleanPass,
        password: cleanPass,
        assignedZone: assignedZone.trim() || 'Zona Norte',
        branch: branch.trim() || 'Planta Principal',
        email: email.trim(),
        phone: phone.trim(),
        isActive,
      },
      userToEdit?.id
    );

    onClose();
  };

  const currentRoleInfo = USER_ROLES_CATALOG.find((r) => r.role === role);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs font-sans">
      <div className="bg-[#181816] border-2 border-amber-400/80 shadow-2xl max-w-2xl w-full text-white overflow-hidden flex flex-col max-h-[94vh] rounded-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#20201D] p-4 border-b border-[#3A3A36] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-400 text-[#141414] flex items-center justify-center font-black shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono font-black text-sm uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <span>{userToEdit ? 'Editar Información de Usuario' : 'Registrar Nuevo Usuario'}</span>
                {userToEdit && (
                  <span className="bg-amber-400 text-black text-[10px] px-2 py-0.5 font-mono font-extrabold rounded">
                    {userToEdit.employeeNumber}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#A0A09C]">
                Modifique nombre, rol, credenciales de acceso (contraseña/PIN) y datos de asignación
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[#343430] text-gray-400 hover:text-white transition-colors cursor-pointer rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {formError && (
            <div className="bg-red-950/90 border border-red-600 text-red-200 p-3 rounded text-xs font-bold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Identificación y Rol */}
          <div className="space-y-3 bg-[#1F1F1C] p-3.5 border border-[#333] rounded">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-[#333] pb-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>1. Perfil y Rol en el Sistema</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Nombre Completo */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Nombre Completo del Colaborador *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-2.5 top-2.5 text-amber-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Lic. Fernando Morales Aguilar"
                    className="w-full pl-9 pr-3 py-2 bg-[#121210] border border-[#3A3A36] focus:border-amber-400 text-white font-bold text-xs rounded outline-hidden"
                  />
                </div>
              </div>

              {/* Rol de Usuario */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                  Rol / Puesto Asignado *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-[#121210] border border-amber-400/60 focus:border-amber-400 text-amber-300 font-bold text-xs rounded cursor-pointer outline-hidden"
                >
                  {USER_ROLES_CATALOG.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de Empleado */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Número de Usuario / Empleado *
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
                    placeholder="Ej. EMP-1001"
                    className="w-full pl-9 pr-3 py-2 bg-[#121210] border border-[#3A3A36] focus:border-amber-400 text-white font-mono font-bold text-xs rounded outline-hidden"
                  />
                </div>
                {role === 'Sistemas' || role === 'Administrador Almacén' ? (
                  <span className="text-[10px] text-amber-300 block mt-1 font-mono">
                    ⭐ Perfil Administrador: Puede ingresar solo con su PIN configurado.
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 block mt-1 font-mono">
                    ℹ️ Requerido para ingresar al sistema junto con su PIN configurado.
                  </span>
                )}
              </div>
            </div>

            {/* Role Info Box */}
            {currentRoleInfo && (
              <div className="bg-[#161614] p-2.5 border border-[#3A3A36] rounded text-[11px] flex items-start gap-2">
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] border shrink-0 ${currentRoleInfo.badgeColor}`}>
                  {currentRoleInfo.role}
                </span>
                <span className="text-[#A0A09C] italic leading-tight">
                  {currentRoleInfo.description}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Credenciales de Acceso (Contraseña / PIN) */}
          <div className="space-y-3 bg-[#1F1F1C] p-3.5 border border-amber-500/40 rounded">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between border-b border-[#333] pb-1.5">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>2. Contraseña / Código de Acceso</span>
              </span>
              <button
                type="button"
                onClick={handleGenerateRandomPin}
                className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 bg-[#2C2C28] px-2 py-0.5 rounded border border-[#444] cursor-pointer hover:border-amber-400"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Generar PIN 5 Dígitos</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Password / PIN input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                  Contraseña o PIN de Acceso *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ej. 72879 o clave secreta"
                    className="w-full pl-3 pr-10 py-2 bg-[#121210] border border-amber-400 focus:border-amber-300 text-amber-300 font-mono font-bold tracking-wider text-sm rounded outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[#A0A09C] block mt-1">
                  Permite iniciar sesión tanto con teclado numérico en pantalla (5 dígitos) como con contraseña alfanumérica.
                </span>
              </div>

              {/* Status Switch */}
              <div className="flex flex-col justify-between">
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Estado de la Cuenta
                </label>
                <div className="bg-[#121210] border border-[#3A3A36] p-2.5 rounded flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-white">
                      {isActive ? 'Usuario Habilitado' : 'Usuario Suspendido'}
                    </span>
                    <span className="text-[10px] text-[#888]">
                      {isActive ? 'Permite operar y registrar movimientos' : 'Acceso denegado al sistema'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Asignación y Ubicación */}
          <div className="space-y-3 bg-[#1F1F1C] p-3.5 border border-[#333] rounded">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-[#333] pb-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>3. Zona Asignada y Ubicación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Zona Asignada */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Zona Asignada (Desarrollo y Ventas) *
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignedZone}
                    onChange={(e) => setAssignedZone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121210] border border-[#3A3A36] focus:border-amber-400 text-white font-bold text-xs rounded cursor-pointer outline-hidden"
                  >
                    {PRESET_ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sucursal / Ubicación */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Sucursal / Planta Base
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Planta Principal, Matriz..."
                    className="w-full pl-9 pr-3 py-2 bg-[#121210] border border-[#3A3A36] focus:border-amber-400 text-white text-xs rounded outline-hidden"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colaborador@empresa.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#121210] border border-[#3A3A36] focus:border-amber-400 text-white text-xs rounded outline-hidden"
                  />
                </div>
              </div>

              {/* Teléfono Móvil */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">
                  Teléfono Móvil
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 55-1234-5678"
                    className="w-full pl-9 pr-3 py-2 bg-[#121210] border border-[#3A3A36] focus:border-amber-400 text-white text-xs rounded outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#3A3A36]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#282824] hover:bg-[#343430] text-gray-300 hover:text-white font-bold text-xs uppercase rounded border border-[#444] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase rounded border border-amber-500 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{userToEdit ? 'Guardar Cambios' : 'Registrar Colaborador'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
