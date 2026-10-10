import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { SystemUser, UserRole } from '../types';
import { ConfirmDialog, ConfirmDialogState } from './ConfirmDialog';
import { UserEditModal, USER_ROLES_CATALOG } from './UserEditModal';
import { isAdminUser } from './Header';
import { SystemResetModal } from './SystemResetModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  users: SystemUser[];
  activeUser: SystemUser | null;
  setActiveUser: (user: SystemUser | null) => void;
  onAddUser: (user: Omit<SystemUser, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: SystemUser) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  setActiveUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('TODOS');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Edit/Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);

  // Temporary success alert
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle revealed passwords in table
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleStartAdd = () => {
    setUserToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleStartEdit = (user: SystemUser) => {
    setUserToEdit(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = (
    userData: Omit<SystemUser, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      const existing = users.find((u) => u.id === editingId);
      if (existing) {
        const updatedUser: SystemUser = {
          ...existing,
          ...userData,
        };
        onUpdateUser(updatedUser);
        setSuccessMessage(`Usuario "${updatedUser.name}" actualizado correctamente.`);
      }
    } else {
      onAddUser(userData);
      setSuccessMessage(`Nuevo colaborador "${userData.name}" registrado correctamente.`);
    }

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      u.name.toLowerCase().includes(term) ||
      u.employeeNumber.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.branch && u.branch.toLowerCase().includes(term)) ||
      (u.assignedZone && u.assignedZone.toLowerCase().includes(term));

    const matchesRole =
      selectedRoleFilter === 'TODOS' || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (userRole: UserRole) => {
    const roleObj = USER_ROLES_CATALOG.find((r) => r.role === userRole);
    return roleObj ? roleObj.badgeColor : 'bg-gray-800 text-gray-200 border-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs font-sans">
      <div className="bg-[#141414] border-2 border-[#3A3A36] shadow-2xl max-w-5xl w-full text-white overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1D1D1B] p-4 border-b border-[#3A3A36] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber-400 text-[#141414] flex items-center justify-center font-black shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <span>Gestión de Usuarios y Colaboradores</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono border border-amber-400/40 font-bold">
                  {users.length} Registrados
                </span>
              </h3>
              <p className="text-[11px] text-[#A0A09C]">
                Edite roles, nombres, contraseñas de acceso y zonas asignadas para el control de operaciones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartAdd}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase rounded border border-amber-500 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-[#2C2C28] text-gray-400 hover:text-white transition-colors cursor-pointer rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-600 px-4 py-2.5 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-100 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Active Operator Status Banner */}
          <div className="bg-[#1D1D1B] border border-[#3A3A36] p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#A0A09C] uppercase tracking-wider block">
                  Usuario Activo en Sesión Actual:
                </span>
                {activeUser ? (
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-white">{activeUser.name}</span>
                    <span className="font-mono text-xs text-amber-400 bg-[#282824] px-2 py-0.5 rounded border border-[#444]">
                      No. {activeUser.employeeNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadge(activeUser.role)}`}>
                      {activeUser.role}
                    </span>
                    <span className="text-[10px] text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                      {activeUser.assignedZone || 'General'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-red-400 italic">
                    Sin usuario seleccionado (Operando como Anónimo / Genérico)
                  </span>
                )}
              </div>
            </div>

            {activeUser && (
              <button
                type="button"
                onClick={() => setActiveUser(null)}
                className="px-2.5 py-1 bg-[#2C2C28] hover:bg-[#383834] text-gray-300 hover:text-white text-[10px] font-bold uppercase rounded border border-[#444] cursor-pointer shrink-0"
              >
                Cambiar / Quitar Selección
              </button>
            )}
          </div>

          {/* Search Bar & Role Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#1D1D1B] p-2.5 border border-[#3A3A36] rounded">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por No. Empleado, nombre, zona o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#141414] border border-[#3A3A36] focus:border-amber-400 text-white text-xs rounded outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-[#141414] border border-[#3A3A36] text-amber-300 text-xs font-bold px-3 py-1.5 rounded cursor-pointer outline-hidden"
              >
                <option value="TODOS">Todos los Roles ({users.length})</option>
                {USER_ROLES_CATALOG.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label} ({users.filter((u) => u.role === r.role).length})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleStartAdd}
                className="sm:hidden px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#141414] font-black text-xs uppercase rounded border border-amber-500 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Usuario</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-[#3A3A36] rounded overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1D1D1B] text-[#A0A09C] uppercase text-[10px] tracking-wider border-b border-[#3A3A36]">
                    <th className="p-2.5 font-bold">No. Empleado</th>
                    <th className="p-2.5 font-bold">Colaborador / Nombre</th>
                    <th className="p-2.5 font-bold">Rol / Puesto</th>
                    <th className="p-2.5 font-bold">Contraseña / PIN</th>
                    <th className="p-2.5 font-bold">Zona Asignada</th>
                    <th className="p-2.5 font-bold">Sucursal</th>
                    <th className="p-2.5 font-bold text-center">Estado</th>
                    <th className="p-2.5 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                        No se encontraron usuarios o colaboradores registrados con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isCurrentlyActive = activeUser?.id === user.id;
                      const isPasswordRevealed = !!revealedPasswords[user.id];
                      const userPass = user.password || user.accessPin || '12345';

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-[#1C1C1A] transition-colors ${
                            isCurrentlyActive ? 'bg-amber-400/10' : ''
                          }`}
                        >
                          {/* No. Empleado */}
                          <td className="p-2.5 font-mono font-black text-amber-300 text-xs">
                            {user.employeeNumber}
                          </td>

                          {/* Colaborador */}
                          <td className="p-2.5">
                            <div className="font-bold text-white text-xs">{user.name}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                              {user.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-gray-500" />
                                  <span>{user.email}</span>
                                </span>
                              )}
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-500" />
                                  <span>{user.phone}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Rol / Puesto */}
                          <td className="p-2.5">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                          </td>

                          {/* Contraseña / PIN */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-amber-300 bg-[#121210] px-2 py-0.5 rounded border border-[#3A3A36] inline-flex items-center gap-1 min-w-[70px]">
                                <KeyRound className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{isPasswordRevealed ? userPass : '●●●●●'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(user.id)}
                                className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2C2C28] transition-colors cursor-pointer"
                                title={isPasswordRevealed ? 'Ocultar contraseña' : 'Ver contraseña'}
                              >
                                {isPasswordRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Zona Asignada */}
                          <td className="p-2.5 text-xs font-bold text-amber-300">
                            {user.assignedZone ? (
                              <span className="bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded text-[11px]">
                                {user.assignedZone}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic">General</span>
                            )}
                          </td>

                          {/* Sucursal */}
                          <td className="p-2.5 text-gray-300 text-xs">
                            {user.branch || 'Planta Principal'}
                          </td>

                          {/* Estado */}
                          <td className="p-2.5 text-center">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-700">
                                <XCircle className="w-3 h-3" /> Inactivo
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Usar en Sesión */}
                              <button
                                type="button"
                                onClick={() => setActiveUser(user)}
                                disabled={!user.isActive}
                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded border flex items-center gap-1 transition-colors cursor-pointer ${
                                  isCurrentlyActive
                                    ? 'bg-amber-400 text-[#141414] border-amber-500 font-black'
                                    : 'bg-[#282824] hover:bg-[#343430] text-gray-300 border-[#444]'
                                } ${!user.isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                                title="Seleccionar este usuario para registrar movimientos en la sesión"
                              >
                                {isCurrentlyActive ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Activo</span>
                                  </>
                                ) : (
                                  <span>Usar</span>
                                )}
                              </button>

                              {/* Prominent Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(user)}
                                className="px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-black border border-amber-400/60 hover:border-amber-400 rounded text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title={`Editar información, rol, nombre y contraseña de ${user.name}`}
                              >
                                <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Editar</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDialog({
                                    title: 'Eliminar Usuario del Directorio',
                                    message: `¿Confirma eliminar al colaborador "${user.name}" (${user.employeeNumber})? Esta acción removerá sus credenciales de acceso al sistema.`,
                                    confirmText: 'Sí, Eliminar Colaborador',
                                    danger: true,
                                    onConfirm: () => {
                                      onDeleteUser(user.id);
                                      setSuccessMessage(`Colaborador "${user.name}" eliminado del directorio.`);
                                      setTimeout(() => setSuccessMessage(null), 3000);
                                    },
                                  });
                                }}
                                className="p-1 hover:bg-red-950 text-gray-400 hover:text-red-400 rounded border border-transparent hover:border-red-800 transition-colors cursor-pointer"
                                title="Eliminar del directorio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1D1D1B] p-3 border-t border-[#3A3A36] flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-[#A0A09C] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Usuarios, roles y credenciales sincronizados en tiempo real mediante Firestore</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdminUser(activeUser) && (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-600/90 text-rose-200 hover:text-white rounded text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                title="Reiniciar datos y pedidos del sistema para iniciar una prueba desde cero"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reiniciar Datos para Pruebas (0)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#2C2C28] hover:bg-[#383834] text-white font-bold text-xs uppercase rounded border border-[#444] cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Edit / Create User Modal */}
      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setUserToEdit(null);
        }}
        userToEdit={userToEdit}
        existingUsers={users}
        onSave={handleSaveUser}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      {/* System Reset Modal */}
      <SystemResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
