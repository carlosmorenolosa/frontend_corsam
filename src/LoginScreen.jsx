// src/LoginScreen.jsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, User, Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="relative bg-white rounded-2xl shadow-xl shadow-blue-500/10 p-8 w-full max-w-md border border-slate-200/80">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <img 
                src="/logo_corsam.png" 
                alt="Corsam Logo" 
                className="w-14 h-14 object-contain"
              />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Bienvenido a Corsam IA</h1>
          <p className="text-slate-500">Acceso al sistema de automatización</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
              placeholder="Nombre de usuario"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
              placeholder="Contraseña"
              required
            />
          </div>

          {loginError && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} IA4PYMES - Acceso autorizado únicamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
