// src/LoginScreen.jsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// Este componente ahora recibe una función para notificar cuando el login es exitoso
const LoginScreen = ({ onLoginSuccess }) => {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Los usuarios válidos ahora viven aquí
  const validUsers = [
    { username: 'admin', password: 'corsam2024' },
    { username: 'tecnico', password: 'hvac123' },
    { username: 'comercial', password: 'ventas456' }
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    const user = validUsers.find(
      u => u.username === loginForm.username && u.password === loginForm.password
    );
    
    if (user) {
      setLoginError('');
      toast.success(`¡Bienvenido ${loginForm.username}!`);
      // En lugar de cambiar un estado local, llamamos a la función del padre
      onLoginSuccess();
    } else {
      setLoginError('Usuario o contraseña incorrectos');
      toast.error('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/logo_corsam.png" 
                alt="Corsam Logo" 
                className="w-full h-full object-contain"
              />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Automatización de Presupuestos mediante IA - CORSAM</h1>
          <p className="text-slate-600 text-sm">Acceso al sistema de automatización</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Introduce tu usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Introduce tu contraseña"
              required
            />
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} IA4PYMES - Acceso autorizado únicamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;