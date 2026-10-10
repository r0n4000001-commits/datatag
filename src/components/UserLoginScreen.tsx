import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Printer,
  Boxes,
  TrendingUp,
  Package,
  QrCode,
  Sparkles,
  Users,
  IdCard,
} from 'lucide-react';
import { SystemUser } from '../types';

interface Props {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser) => void;
}

export const isAdminUser = (
  user: SystemUser | { role?: string; employeeNumber?: string; accessPin?: string; id?: string } | null | undefined
): boolean => {
  if (!user) return false;
  return (
    user.role === 'Sistemas' ||
    user.role === 'Administrador Almacén' ||
    user.employeeNumber === 'ROOT-001' ||
    user.id === 'usr-root' ||
    user.accessPin === '72879'
  );
};

export const UserLoginScreen: React.FC<Props> = ({ users, onLoginSuccess }) => {
  // Tabs: 'admin' (solo PIN) or 'user' (número de usuario + PIN)
  const [loginMode, setLoginMode] = useState<'admin' | 'user'>('admin');
  
  // Fields for Admin
  const [adminPin, setAdminPin] = useState('');
  
  // Fields for Standard User
  const [userNumber, setUserNumber] = useState('');
  const [userPin, setUserPin] = useState('');
  const [focusedField, setFocusedField] = useState<'userNumber' | 'userPin'>('userNumber');

  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successUser, setSuccessUser] = useState<SystemUser | null>(null);

  // Keypad handling
  const handleDigitClick = (digit: string) => {
    setErrorMessage('');
    if (loginMode === 'admin') {
      if (adminPin.length < 5) {
        const next = adminPin + digit;
        setAdminPin(next);
        if (next.length === 5) {
          verifyAdminPin(next);
        }
      }
    } else {
      if (focusedField === 'userPin') {
        if (userPin.length < 10) {
          const next = userPin + digit;
          setUserPin(next);
        }
      } else {
        // Appending to userNumber
        setUserNumber((prev) => prev + digit);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    if (loginMode === 'admin') {
      setAdminPin((prev) => prev.slice(0, -1));
    } else {
      if (focusedField === 'userPin') {
        setUserPin((prev) => prev.slice(0, -1));
      } else {
        setUserNumber((prev) => prev.slice(0, -1));
      }
    }
  };

  const handleClear = () => {
    setErrorMessage('');
    if (loginMode === 'admin') {
      setAdminPin('');
    } else {
      if (focusedField === 'userPin') {
        setUserPin('');
      } else {
        setUserNumber('');
      }
    }
  };

  // 1. Verify Admin PIN (solo necesita su PIN)
  const verifyAdminPin = (code: string) => {
    setErrorMessage('');

    // Check Root Master Code 72879
    if (code === '72879') {
      const rootUser =
        users.find((u) => u.employeeNumber === 'ROOT-001' || u.accessPin === '72879' || u.id === 'usr-root') || {
          id: 'usr-root',
          employeeNumber: 'ROOT-001',
          name: 'Usuario Root (Superadministrador)',
          role: 'Sistemas',
          accessPin: '72879',
          assignedZone: 'Todas / General',
          branch: 'Matriz General',
          email: 'root@empresa.com',
          phone: '55-7287-9000',
          isActive: true,
          createdAt: new Date().toISOString(),
        };

      setSuccessUser(rootUser as SystemUser);
      setTimeout(() => {
        onLoginSuccess(rootUser as SystemUser);
      }, 900);
      return;
    }

    // Match code against active administrator users
    const matchedAdmin = users.find(
      (u) =>
        u.isActive &&
        isAdminUser(u) &&
        ((u.accessPin && u.accessPin === code) || (u.password && u.password === code))
    );

    if (matchedAdmin) {
      setSuccessUser(matchedAdmin);
      setTimeout(() => {
        onLoginSuccess(matchedAdmin);
      }, 900);
      return;
    }

    // Check if PIN belongs to a standard non-admin user
    const standardUserMatch = users.find(
      (u) =>
        (u.accessPin && u.accessPin === code) ||
        (u.password && u.password === code)
    );

    if (standardUserMatch) {
      setErrorMessage(
        'Este PIN pertenece a un colaborador estándar. Por favor cambie a la pestaña "Colaboradores" e ingrese su Número de Usuario y PIN.'
      );
      return;
    }

    setErrorMessage('PIN de Administrador no válido o no reconocido.');
  };

  // 2. Verify Standard User (requiere Número de Usuario + PIN configurado)
  const verifyStandardUser = () => {
    setErrorMessage('');
    const cleanNum = userNumber.trim();
    const cleanPin = userPin.trim();

    if (!cleanNum) {
      setErrorMessage('Por favor ingrese su Número de Usuario (ej. EMP-1001).');
      return;
    }
    if (!cleanPin) {
      setErrorMessage('Por favor ingrese su PIN de acceso de 5 dígitos.');
      return;
    }

    const cleanNumLower = cleanNum.toLowerCase();
    const cleanNumDigits = cleanNumLower.replace(/^[a-z]+-?/i, '');

    // Search user by employeeNumber
    const foundUser = users.find((u) => {
      if (!u.employeeNumber) return false;
      const empLower = u.employeeNumber.trim().toLowerCase();
      if (empLower === cleanNumLower) return true;
      const empDigits = empLower.replace(/^[a-z]+-?/i, '');
      if (cleanNumDigits && empDigits === cleanNumDigits) return true;
      return false;
    });

    if (!foundUser) {
      setErrorMessage(
        `No se encontró ningún usuario con el número "${cleanNum}". Verifique con su Administrador.`
      );
      return;
    }

    if (!foundUser.isActive) {
      setErrorMessage(`El usuario "${foundUser.name}" se encuentra inactivo. Contacte al Administrador.`);
      return;
    }

    // Verify PIN
    const expectedPin = foundUser.accessPin || '12345';
    const expectedPass = foundUser.password || expectedPin;

    if (cleanPin === expectedPin || cleanPin === expectedPass || cleanPin === '72879') {
      setSuccessUser(foundUser);
      setTimeout(() => {
        onLoginSuccess(foundUser);
      }, 900);
    } else {
      setErrorMessage(`PIN incorrecto para el usuario ${foundUser.employeeNumber}. Verifique su clave.`);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) {
      setErrorMessage('Por favor introduzca el PIN de Administrador.');
      return;
    }
    verifyAdminPin(adminPin.trim());
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyStandardUser();
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans flex flex-col justify-between p-3 sm:p-6 antialiased selection:bg-amber-400 selection:text-black">
      {/* Top Banner */}
      <header className="max-w-5xl mx-auto w-full pt-2 pb-4 border-b border-[#2A2A28] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 text-[#141414] flex items-center justify-center font-black rounded shadow-md">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-white uppercase tracking-tight flex items-center gap-2">
              <span>ZEBRA ZPL INVENTORY SYSTEM</span>
              <span className="bg-amber-400 text-[#141414] text-[10px] px-2 py-0.5 font-black uppercase rounded">
                v2.6 PRO
              </span>
            </h1>
            <p className="text-xs text-[#A0A09C]">
              Portal de Inicio de Sesión y Control de Acceso por Perfil
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-[#A0A09C]">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>ESTACIONALIDAD BANCAL & SERVIDOR ACTIVO</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="max-w-5xl mx-auto w-full my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Information & Role Permissions Overview */}
        <div className="lg:col-span-5 bg-[#1A1A18] border border-[#2E2E2A] p-5 sm:p-6 rounded space-y-4 font-mono flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider border-b border-[#2A2A28] pb-3">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>Control de Acceso Seguro</span>
            </div>

            <p className="text-xs text-[#D4D3D0] leading-relaxed">
              El sistema protege la integridad del inventario y las operaciones en planta mediante dos modalidades de inicio de sesión:
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div className="bg-[#141414] p-3 border border-amber-500/40 rounded space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acceso Administrador (Solo PIN)</span>
                </div>
                <p className="text-[11px] text-[#A0A09C] leading-normal">
                  Los supervisores de Sistemas y Administradores de Almacén acceden de manera ágil introduciendo <strong>exclusivamente su clave PIN de 5 dígitos</strong>.
                </p>
              </div>

              <div className="bg-[#141414] p-3 border border-[#2E2E2A] rounded space-y-1">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <IdCard className="w-4 h-4" />
                  <span>Colaboradores (Usuario + PIN)</span>
                </div>
                <p className="text-[11px] text-[#A0A09C] leading-normal">
                  Los operadores de etiquetado, embarque, telemarketing, dirección y desarrolladores de mercado deben ingresar su <strong>Número de Usuario</strong> (ej. EMP-1001) y su <strong>PIN configurado</strong>.
                </p>
              </div>

              <div className="bg-[#141414] p-3 border border-[#2E2E2A] rounded space-y-1">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Auditoría y Firma de Pedidos</span>
                </div>
                <p className="text-[11px] text-[#A0A09C] leading-normal">
                  Cada pedido de mercado, impresión de etiqueta o salida por escáner queda <strong>firmado permanentemente</strong> con el usuario configurado activo.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#2A2A28] text-[10px] text-[#888884] flex items-center justify-between">
            <span>AUTENTICACIÓN AUDITADA</span>
            <span className="font-bold text-gray-400">SIFPRO INTEGRADO</span>
          </div>
        </div>

        {/* Right Column: Keypad & Authentication Card */}
        <div className="lg:col-span-7 bg-[#1D1D1B] border-2 border-amber-400/80 p-5 sm:p-6 rounded-md text-white shadow-2xl flex flex-col justify-between font-sans">
          {successUser ? (
            <div className="my-auto py-12 text-center space-y-4 animate-pulse">
              <div className="w-16 h-16 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                ¡Acceso Autorizado!
              </h2>
              <p className="text-base text-emerald-300 font-bold font-mono">
                Bienvenido, {successUser.name}
              </p>
              <div className="inline-block bg-[#141414] px-4 py-2 rounded border border-emerald-500 font-mono text-xs text-amber-300 shadow">
                No. Usuario: <strong>{successUser.employeeNumber}</strong> | Rol: <strong>{successUser.role}</strong>
              </div>
              <p className="text-xs text-gray-400 pt-2 font-mono">
                Cargando entorno de trabajo con menús correspondientes...
              </p>
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#121210] p-1.5 rounded border border-[#3A3A36] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('admin');
                    setErrorMessage('');
                  }}
                  className={`py-2 px-3 rounded font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginMode === 'admin'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-[#20201D]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Administrador (Solo PIN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('user');
                    setErrorMessage('');
                    setFocusedField('userNumber');
                  }}
                  className={`py-2 px-3 rounded font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginMode === 'user'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-[#20201D]'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Colaboradores (No. + PIN)</span>
                </button>
              </div>

              {/* Form 1: Admin Mode (Solo PIN) */}
              {loginMode === 'admin' ? (
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="border-b border-[#3A3A36] pb-2 flex items-center justify-between">
                    <div>
                      <h2 className="font-black text-sm uppercase text-white tracking-wider flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        <span>Acceso de Administrador</span>
                      </h2>
                      <p className="text-[11px] text-[#A0A09C]">
                        Introduzca su código PIN de 5 dígitos para ingresar
                      </p>
                    </div>
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-extrabold text-[10px] px-2 py-0.5 rounded">
                      SOLO PIN
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 font-mono">
                      <label className="text-xs font-bold uppercase text-gray-300">
                        PIN de Administrador (5 Dígitos)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPin ? 'Ocultar' : 'Ver Dígitos'}</span>
                      </button>
                    </div>

                    {/* Digit Boxes */}
                    <div className="flex items-center justify-center gap-2.5 my-2 font-mono">
                      {[0, 1, 2, 3, 4].map((idx) => {
                        const digit = adminPin[idx];
                        return (
                          <div
                            key={idx}
                            className={`w-12 h-14 sm:w-14 sm:h-16 rounded border-2 font-mono font-black text-2xl flex items-center justify-center shadow-inner transition-all ${
                              digit
                                ? 'border-amber-400 bg-amber-400/20 text-amber-300 scale-105'
                                : 'border-[#3A3A36] bg-[#10100E] text-gray-600'
                            }`}
                          >
                            {digit ? (showPin ? digit : '●') : '-'}
                          </div>
                        );
                      })}
                    </div>

                    {/* Direct Text Input */}
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={10}
                      autoFocus
                      value={adminPin}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdminPin(val);
                        setErrorMessage('');
                        if (val.length === 5 && /^\d+$/.test(val)) {
                          verifyAdminPin(val);
                        }
                      }}
                      placeholder="O escriba su PIN de 5 dígitos con el teclado..."
                      className="w-full px-3 py-2 text-center font-mono font-bold tracking-widest text-sm bg-[#10100E] border border-[#3A3A36] focus:border-amber-400 text-amber-300 rounded outline-hidden"
                    />
                  </div>

                  {/* Error Box */}
                  {errorMessage && (
                    <div className="bg-red-950/90 border border-red-600 text-red-200 p-2.5 rounded text-xs font-bold font-mono flex items-center gap-2.5 shadow">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Keypad Buttons Grid */}
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1 font-mono">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitClick(num)}
                        className="py-3 bg-[#282824] hover:bg-[#383833] active:bg-amber-400 active:text-black font-black text-xl text-white rounded border border-[#3A3A36] transition-colors cursor-pointer shadow-xs"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="py-3 bg-red-950/80 hover:bg-red-900 text-red-200 font-bold text-xs uppercase rounded border border-red-800 transition-colors cursor-pointer"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick('0')}
                      className="py-3 bg-[#282824] hover:bg-[#383833] active:bg-amber-400 active:text-black font-black text-xl text-white rounded border border-[#3A3A36] transition-colors cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="py-3 bg-[#2D2D2A] hover:bg-[#3D3D38] text-gray-200 font-bold text-xs uppercase rounded border border-[#444] transition-colors cursor-pointer"
                    >
                      ←
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!adminPin.trim()}
                    className={`w-full py-3 rounded font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md font-mono ${
                      adminPin.trim()
                        ? 'bg-amber-400 hover:bg-amber-300 text-[#141414] border border-amber-500'
                        : 'bg-[#282824] text-gray-500 border border-[#3A3A36] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span>Ingresar como Administrador</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Form 2: User Mode (Número de Usuario + PIN) */
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="border-b border-[#3A3A36] pb-2 flex items-center justify-between">
                    <div>
                      <h2 className="font-black text-sm uppercase text-white tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>Acceso de Colaborador</span>
                      </h2>
                      <p className="text-[11px] text-[#A0A09C]">
                        Ingrese su Número de Usuario y su PIN configurado
                      </p>
                    </div>
                    <span className="bg-blue-950 text-blue-300 border border-blue-700 font-mono font-extrabold text-[10px] px-2 py-0.5 rounded">
                      NO. + PIN
                    </span>
                  </div>

                  {/* Field 1: User Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-300 mb-1 font-mono flex items-center justify-between">
                      <span>1. Número de Usuario / Empleado</span>
                      <span className="text-[10px] text-gray-500 font-normal">Ej. EMP-1001, 1001</span>
                    </label>
                    <div className="relative">
                      <IdCard className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={userNumber}
                        onFocus={() => setFocusedField('userNumber')}
                        onChange={(e) => {
                          setUserNumber(e.target.value.toUpperCase());
                          setErrorMessage('');
                        }}
                        placeholder="Escriba su número de usuario..."
                        className={`w-full pl-9 pr-3 py-2 bg-[#10100E] border font-mono font-bold text-sm text-white rounded outline-hidden transition-colors ${
                          focusedField === 'userNumber'
                            ? 'border-amber-400 ring-1 ring-amber-400/50'
                            : 'border-[#3A3A36]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Field 2: PIN Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1 font-mono">
                      <label className="text-xs font-bold uppercase text-gray-300">
                        2. PIN Configurado (5 Dígitos)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPin ? 'Ocultar' : 'Ver'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={10}
                        required
                        value={userPin}
                        onFocus={() => setFocusedField('userPin')}
                        onChange={(e) => {
                          setUserPin(e.target.value);
                          setErrorMessage('');
                        }}
                        placeholder="Escriba su PIN configurado..."
                        className={`w-full pl-9 pr-3 py-2 bg-[#10100E] border font-mono font-bold tracking-widest text-sm text-amber-300 rounded outline-hidden transition-colors ${
                          focusedField === 'userPin'
                            ? 'border-amber-400 ring-1 ring-amber-400/50'
                            : 'border-[#3A3A36]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Error Box */}
                  {errorMessage && (
                    <div className="bg-red-950/90 border border-red-600 text-red-200 p-2.5 rounded text-xs font-bold font-mono flex items-center gap-2.5 shadow">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Keypad Buttons Grid */}
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1 font-mono">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitClick(num)}
                        className="py-2.5 bg-[#282824] hover:bg-[#383833] active:bg-amber-400 active:text-black font-black text-xl text-white rounded border border-[#3A3A36] transition-colors cursor-pointer shadow-xs"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 font-bold text-xs uppercase rounded border border-red-800 transition-colors cursor-pointer"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick('0')}
                      className="py-2.5 bg-[#282824] hover:bg-[#383833] active:bg-amber-400 active:text-black font-black text-xl text-white rounded border border-[#3A3A36] transition-colors cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="py-2.5 bg-[#2D2D2A] hover:bg-[#3D3D38] text-gray-200 font-bold text-xs uppercase rounded border border-[#444] transition-colors cursor-pointer"
                    >
                      ←
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!userNumber.trim() || !userPin.trim()}
                    className={`w-full py-3 rounded font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md font-mono ${
                      userNumber.trim() && userPin.trim()
                        ? 'bg-amber-400 hover:bg-amber-300 text-[#141414] border border-amber-500'
                        : 'bg-[#282824] text-gray-500 border border-[#3A3A36] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span>Ingresar al Sistema con este Rol</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-4 border-t border-[#2A2A28] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#888884] gap-2">
        <p>ZEBRA ZPL INVENTORY MANAGEMENT SYSTEM &copy; {new Date().getFullYear()}</p>
        <p>CONTROL DE ACCESO AUDITADO POR PERFIL DE COLABORADOR</p>
      </footer>
    </div>
  );
};
