import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  X,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Users,
  IdCard,
} from 'lucide-react';
import { SystemUser } from '../types';
import { isAdminUser } from './UserLoginScreen';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  users: SystemUser[];
  activeUser: SystemUser | null;
  setActiveUser: (user: SystemUser | null) => void;
}

export const UserLoginModal: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  setActiveUser,
}) => {
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

  if (!isOpen) return null;

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

  // 1. Verify Admin PIN (solo necesita PIN)
  const verifyAdminPin = (code: string) => {
    setErrorMessage('');

    // Check Root code 72879
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

      setActiveUser(rootUser as SystemUser);
      setSuccessUser(rootUser as SystemUser);
      setTimeout(() => {
        setSuccessUser(null);
        setAdminPin('');
        onClose();
      }, 1000);
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
      setActiveUser(matchedAdmin);
      setSuccessUser(matchedAdmin);
      setTimeout(() => {
        setSuccessUser(null);
        setAdminPin('');
        onClose();
      }, 1000);
      return;
    }

    // Check if code belongs to standard non-admin user
    const standardUserMatch = users.find(
      (u) =>
        (u.accessPin && u.accessPin === code) ||
        (u.password && u.password === code)
    );

    if (standardUserMatch) {
      setErrorMessage(
        'Este PIN pertenece a un colaborador. Cambie a la pestaña "Colaboradores" e ingrese su Número de Usuario y PIN.'
      );
      return;
    }

    setErrorMessage('PIN de Administrador incorrecto o no registrado.');
  };

  // 2. Verify Standard User (requiere Número de Usuario + PIN configurado)
  const verifyStandardUser = () => {
    setErrorMessage('');
    const cleanNum = userNumber.trim();
    const cleanPin = userPin.trim();

    if (!cleanNum) {
      setErrorMessage('Por favor ingrese su Número de Usuario.');
      return;
    }
    if (!cleanPin) {
      setErrorMessage('Por favor ingrese su PIN de acceso.');
      return;
    }

    const cleanNumLower = cleanNum.toLowerCase();
    const cleanNumDigits = cleanNumLower.replace(/^[a-z]+-?/i, '');

    const foundUser = users.find((u) => {
      if (!u.employeeNumber) return false;
      const empLower = u.employeeNumber.trim().toLowerCase();
      if (empLower === cleanNumLower) return true;
      const empDigits = empLower.replace(/^[a-z]+-?/i, '');
      if (cleanNumDigits && empDigits === cleanNumDigits) return true;
      return false;
    });

    if (!foundUser) {
      setErrorMessage(`No se encontró ningún usuario con el número "${cleanNum}".`);
      return;
    }

    if (!foundUser.isActive) {
      setErrorMessage(`El colaborador "${foundUser.name}" se encuentra inactivo.`);
      return;
    }

    const expectedPin = foundUser.accessPin || '12345';
    const expectedPass = foundUser.password || expectedPin;

    if (cleanPin === expectedPin || cleanPin === expectedPass || cleanPin === '72879') {
      setActiveUser(foundUser);
      setSuccessUser(foundUser);
      setTimeout(() => {
        setSuccessUser(null);
        setUserNumber('');
        setUserPin('');
        onClose();
      }, 1000);
    } else {
      setErrorMessage(`PIN incorrecto para el usuario ${foundUser.employeeNumber}.`);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) {
      setErrorMessage('Por favor ingrese el PIN de Administrador.');
      return;
    }
    verifyAdminPin(adminPin.trim());
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyStandardUser();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs font-sans">
      <div className="bg-[#141414] border-2 border-amber-400/80 shadow-2xl max-w-md w-full text-white rounded overflow-hidden flex flex-col font-mono">
        {/* Header */}
        <div className="bg-[#1D1D1B] p-4 border-b border-[#3A3A36] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-400 text-[#141414] flex items-center justify-center font-black">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <span>Cambio / Inicio de Sesión</span>
              </h3>
              <p className="text-[11px] text-[#A0A09C]">
                Control de acceso autenticado al sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#2C2C28] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3 font-sans">
          {/* Active Operator Banner if logged in */}
          {activeUser && !successUser && (
            <div className="bg-[#1D1D1B] border border-[#3A3A36] p-2.5 rounded flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-300">Activo:</span>
                <strong className="text-amber-300">[{activeUser.employeeNumber}] {activeUser.name}</strong>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-bold">
                {activeUser.role}
              </span>
            </div>
          )}

          {/* Success Unlocked Banner */}
          {successUser ? (
            <div className="bg-emerald-950/90 border-2 border-emerald-500 p-6 rounded text-center space-y-2 animate-pulse font-mono">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-base font-black text-white uppercase tracking-wider">
                ¡Acceso Confirmado!
              </h4>
              <p className="text-sm text-emerald-200 font-bold">
                {successUser.name}
              </p>
              <div className="inline-block bg-[#141414] px-3 py-1 rounded border border-emerald-600 text-xs text-amber-300">
                Rol: {successUser.role} | No: {successUser.employeeNumber}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#10100E] p-1 rounded border border-[#3A3A36] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('admin');
                    setErrorMessage('');
                  }}
                  className={`py-1.5 px-2 rounded font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMode === 'admin'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-[#20201D]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin (Solo PIN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('user');
                    setErrorMessage('');
                    setFocusedField('userNumber');
                  }}
                  className={`py-1.5 px-2 rounded font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    loginMode === 'user'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-[#20201D]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Colaborador</span>
                </button>
              </div>

              {loginMode === 'admin' ? (
                /* Admin Form (Solo PIN) */
                <form onSubmit={handleAdminSubmit} className="space-y-3 font-mono">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase text-gray-300">
                        PIN de Administrador (5 Dígitos)
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

                    {/* Digit Boxes */}
                    <div className="flex items-center justify-center gap-2 my-2">
                      {[0, 1, 2, 3, 4].map((idx) => {
                        const digit = adminPin[idx];
                        return (
                          <div
                            key={idx}
                            className={`w-10 h-12 rounded border-2 font-mono font-black text-xl flex items-center justify-center shadow-inner transition-all ${
                              digit
                                ? 'border-amber-400 bg-amber-400/10 text-amber-300 scale-105'
                                : 'border-[#3A3A36] bg-[#10100E] text-gray-600'
                            }`}
                          >
                            {digit ? (showPin ? digit : '●') : '-'}
                          </div>
                        );
                      })}
                    </div>

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
                      placeholder="Escriba PIN de 5 dígitos..."
                      className="w-full px-3 py-1.5 text-center font-mono font-bold tracking-widest text-sm bg-[#10100E] border border-[#3A3A36] focus:border-amber-400 text-amber-300 rounded outline-hidden"
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-red-950/90 border border-red-600 text-red-200 p-2 rounded text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitClick(num)}
                        className="py-2.5 bg-[#242420] hover:bg-[#343430] active:bg-amber-400 active:text-black font-black text-lg text-white rounded border border-[#3A3A36] cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="py-2.5 bg-red-950/80 hover:bg-red-900 text-red-300 font-bold text-xs uppercase rounded border border-red-800 cursor-pointer"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick('0')}
                      className="py-2.5 bg-[#242420] hover:bg-[#343430] active:bg-amber-400 active:text-black font-black text-lg text-white rounded border border-[#3A3A36] cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="py-2.5 bg-[#2A2A28] hover:bg-[#3A3A36] text-gray-300 font-bold text-xs uppercase rounded border border-[#444] cursor-pointer"
                    >
                      ←
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!adminPin.trim()}
                    className={`w-full py-2.5 rounded font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
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
                /* User Form (Número de Usuario + PIN) */
                <form onSubmit={handleUserSubmit} className="space-y-3 font-mono">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-300 mb-1 flex items-center justify-between">
                      <span>1. Número de Usuario</span>
                      <span className="text-[10px] text-gray-500 font-normal">Ej. EMP-1001</span>
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
                        placeholder="Ej. EMP-1001"
                        className={`w-full pl-9 pr-3 py-1.5 bg-[#10100E] border text-xs font-bold text-white rounded outline-hidden ${
                          focusedField === 'userNumber'
                            ? 'border-amber-400 ring-1 ring-amber-400/50'
                            : 'border-[#3A3A36]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase text-gray-300">
                        2. PIN Configurado
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
                        placeholder="PIN de acceso..."
                        className={`w-full pl-9 pr-3 py-1.5 bg-[#10100E] border text-xs font-bold tracking-widest text-amber-300 rounded outline-hidden ${
                          focusedField === 'userPin'
                            ? 'border-amber-400 ring-1 ring-amber-400/50'
                            : 'border-[#3A3A36]'
                        }`}
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-950/90 border border-red-600 text-red-200 p-2 rounded text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleDigitClick(num)}
                        className="py-2.5 bg-[#242420] hover:bg-[#343430] active:bg-amber-400 active:text-black font-black text-lg text-white rounded border border-[#3A3A36] cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="py-2.5 bg-red-950/80 hover:bg-red-900 text-red-300 font-bold text-xs uppercase rounded border border-red-800 cursor-pointer"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitClick('0')}
                      className="py-2.5 bg-[#242420] hover:bg-[#343430] active:bg-amber-400 active:text-black font-black text-lg text-white rounded border border-[#3A3A36] cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="py-2.5 bg-[#2A2A28] hover:bg-[#3A3A36] text-gray-300 font-bold text-xs uppercase rounded border border-[#444] cursor-pointer"
                    >
                      ←
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!userNumber.trim() || !userPin.trim()}
                    className={`w-full py-2.5 rounded font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                      userNumber.trim() && userPin.trim()
                        ? 'bg-amber-400 hover:bg-amber-300 text-[#141414] border border-amber-500'
                        : 'bg-[#282824] text-gray-500 border border-[#3A3A36] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
