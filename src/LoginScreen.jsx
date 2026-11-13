// src/LoginScreen.jsx
//
// Real authentication backed by Supabase with a mandatory second factor:
//   1. Email + password (`signInWithPassword`).
//   2. TOTP step via `supabase.auth.mfa`:
//      - No verified factor -> enrollment: QR code (Google Authenticator
//        compatible) plus a manual-entry secret fallback; the first code
//        proves possession via `challengeAndVerify`.
//      - Verified factor -> 6-digit code challenge on every login.
//
// No credentials or TOTP secrets live in this bundle; everything is
// verified server-side by Supabase.

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, User, Lock, ShieldCheck, ScanLine } from 'lucide-react';
import { getSupabaseClient } from './lib/supabase';
import { decideMfaStep } from './lib/mfaFlow';

const FRIENDLY_NAME = 'Corsam IA';

const ERROR_LOGIN = ' Email o contraseña incorrectos';
const ERROR_CODE = 'Código incorrecto. Vuelve a mirar tu app de autenticación.';
const ERROR_GENERIC = 'Error inesperado. Inténtalo de nuevo en unos segundos.';

const normalizeError = (error) => {
  const message = error?.message ?? '';
  if (/invalid login credentials/i.test(message)) return ERROR_LOGIN;
  if (/email not confirmed/i.test(message)) return 'El email aún no está confirmado.';
  if (/(over request rate limit|too many)/i.test(message)) {
    return 'Demasiados intentos. Espera un minuto antes de reintentar.';
  }
  if (/(code|mfa|factor|challenge)/i.test(message)) return ERROR_CODE;
  return message || ERROR_GENERIC;
};

const CodeInput = ({ code, onChange, label = 'Código de verificación', autoFocus = false }) => (
  <div>
    <label htmlFor="mfa-code" className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="relative">
      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        id="mfa-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="w-full pl-12 pr-4 py-3 tracking-[0.4em] text-center text-lg bg-white/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
        placeholder="000000"
        required
      />
    </div>
  </div>
);

const LoginScreen = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('login'); // 'login' | 'enroll' | 'challenge'
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState(null); // { factorId, qrCode, secret }

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setLoginError('');
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      if (error) throw error;

      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      if (decideMfaStep(data.totp) === 'enroll') {
        await startEnrollment(supabase, data.totp ?? []);
      } else {
        setCode('');
        setStep('challenge');
      }
    } catch (error) {
      setLoginError(normalizeError(error));
      toast.error(normalizeError(error));
    } finally {
      setBusy(false);
    }
  };

  // Enrollment: drop stale unverified factors, then enroll a fresh TOTP
  // factor and surface its QR code plus manual-entry secret.
  const startEnrollment = async (supabase, factors) => {
    const stale = factors.filter((f) => f.status !== 'verified');
    for (const factor of stale) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: FRIENDLY_NAME,
    });
    if (error) throw error;
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp?.qr_code,
      secret: data.totp?.secret,
    });
    setCode('');
    setStep('enroll');
  };

  // First code after enrollment proves the user really scanned the secret.
  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setCodeError(ERROR_CODE);
      return;
    }
    setBusy(true);
    setCodeError('');
    try {
      const supabase = getSupabaseClient();
      const factorId = step === 'enroll' ? enrollment.factorId : await verifiedFactorId(supabase);
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) throw error;
      toast.success('Verificado correctamente');
      onLoginSuccess();
    } catch (error) {
      setCodeError(normalizeError(error));
      toast.error(normalizeError(error));
    } finally {
      setBusy(false);
    }
  };

  const verifiedFactorId = async (supabase) => {
    const factors = await enrollmentFactors(supabase);
    const verified = factors.find((f) => f.status === 'verified');
    if (!verified) throw new Error(ERROR_CODE);
    return verified.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-100 to-cyan-100 flex items-center justify-center p-4 font-sans">
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 p-8 w-full max-w-md border border-white/80">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center border border-white">
            <img src="/logo_corsam.png" alt="Corsam Logo" className="w-14 h-14 object-contain" />
          </div>
          {step === 'login' && (
            <>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Bienvenido a Corsam IA</h1>
              <p className="text-slate-500 text-sm">Acceso al sistema de automatización</p>
            </>
          )}
          {step === 'enroll' && (
            <>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Configura tu segundo factor</h1>
              <p className="text-slate-500 text-sm">
                Escanea el código con Google Authenticator (o similar) e introduce el código de 6 dígitos.
              </p>
            </>
          )}
          {step === 'challenge' && (
            <>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Verificación en dos pasos</h1>
              <p className="text-slate-500 text-sm">Introduce el código de 6 dígitos de tu app de autenticación.</p>
            </>
          )}
        </div>

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="login-username"
                  type="email"
                  autoComplete="username"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder:text-slate-400"
                  placeholder="usuario@dominio.com"
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
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
        )}

        {step === 'enroll' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex flex-col items-center">
              {enrollment?.qrCode ? (
                <img src={enrollment.qrCode} alt="Código QR de configuración 2FA" className="w-48 h-48 rounded-lg bg-white p-2 border border-slate-200" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-sm">
                  QR no disponible
                </div>
              )}
              {enrollment?.secret && (
                <div className="mt-3 w-full text-center">
                  <p className="text-xs text-slate-500 mb-1">Si no puedes escanear, introduce esta clave manualmente:</p>
                  <code className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700 select-all break-all">
                    {enrollment.secret}
                  </code>
                </div>
              )}
            </div>

            <CodeInput code={code} onChange={setCode} autoFocus />

            {codeError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700 text-sm font-medium">{codeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:hover:scale-100"
            >
              {busy ? 'Verificando…' : 'Verificar y activar'}
            </button>
          </form>
        )}

        {step === 'challenge' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <CodeInput code={code} onChange={setCode} autoFocus />

            {codeError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700 text-sm font-medium">{codeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:hover:scale-100"
            >
              {busy ? 'Verificando…' : 'Verificar código'}
            </button>
          </form>
        )}

        <div className="text-center mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ScanLine className="w-3.5 h-3.5" />
          <span>© {new Date().getFullYear()} IA4PYMES - Acceso autorizado únicamente</span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
