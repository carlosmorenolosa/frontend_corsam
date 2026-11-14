// src/LoginScreen.jsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, User, Lock } from 'lucide-react';

// Este componente ahora recibe una función para notificar cuando el login es exitoso
const LoginScreen = ({ onLoginSuccess }) => {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [busy, setBusy] = useState(false);

  // La verificación es server-side: POST /api/login compara contra las
  // variables LOGIN_USER / LOGIN_PASSWORD de Vercel (sin prefijo VITE_),
  // que nunca llegan al bundle del navegador.
  const handleLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (res.ok) {
        toast.success(`¡Bienvenido ${loginForm.username}!`);
        onLoginSuccess();
      } else if (res.status === 401) {
        setLoginError('Usuario o contraseña incorrectos');
        toast.error('Credenciales inválidas');
      } else {
        setLoginError('Error del servidor. Inténtalo de nuevo.');
        toast.error('Error del servidor');
      }
    } catch {
      setLoginError('No se pudo conectar con el servidor.');
      toast.error('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-100 to-cyan-100 flex items-center justify-center p-4 font-sans">
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 p-8 w-full max-w-md border border-white/80">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center border border-white">
              <img 
                src="/logo_corsam.png" 
                alt="Corsam Logo" 
                className="w-14 h-14 object-contain"
              />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Bienvenido a Corsam IA</h1>
          <p className="text-slate-500 text-sm">Acceso al sistema de automatización</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="login-username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder:text-slate-400"
                placeholder="Nombre de usuario"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="login-password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder:text-slate-400"
                placeholder="Contraseña"
                required
              />
            </div>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:hover:scale-100"
          >
            {busy ? 'Comprobando…' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} IA4PYMES - Acceso autorizado únicamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;