// src/LoginScreen.jsx
//
// Corsam-branded login (identity from corsam.es): monochrome, straight
// edges, solid black primary action, kicker labels. Logic unchanged:
// server-side verification via POST /api/login.

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, User, Lock } from 'lucide-react';

// Este componente recibe una función para notificar cuando el login es exitoso
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
    <div className="min-h-screen bg-corsam-paper flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-none shadow-xl shadow-neutral-300/40 p-10 w-full max-w-md border border-corsam-line">
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 bg-white flex items-center justify-center">
            <img
              src="/logo_corsam.png"
              alt="Corsam Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <p className="kicker mb-2">Acceso al sistema de automatización</p>
          <h1 className="text-3xl font-display font-bold text-corsam-black leading-tight">
            Corsam IA
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="login-username" className="kicker block mb-2">Usuario</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-corsam-gray" />
              <input
                id="login-username"
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-white border border-corsam-line rounded-sm
                           focus:ring-2 focus:ring-corsam-black focus:border-corsam-black transition-colors
                           placeholder:text-neutral-400"
                placeholder="Nombre de usuario"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="kicker block mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-corsam-gray" />
              <input
                id="login-password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-white border border-corsam-line rounded-sm
                           focus:ring-2 focus:ring-corsam-black focus:border-corsam-black transition-colors
                           placeholder:text-neutral-400"
                placeholder="Contraseña"
                required
              />
            </div>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-corsam w-full"
          >
            {busy ? 'Comprobando…' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center mt-10 border-t border-corsam-line pt-6">
          <p className="text-xs text-corsam-gray">
            © {new Date().getFullYear()} Corsam · IA4PYMES — Acceso autorizado únicamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
