import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Importa todos los componentes necesarios ---
import LoginScreen from './LoginScreen';
import BudgetAutomationTool from './BudgetAutomationTool';
import PartidasChatbot from './PartidasChatbot';

import { Toaster } from 'react-hot-toast';
import PartidasExplorer from './PartidasExplorer';
import DashboardObra from './DashboardObra';
import { BarChart3, Bot, LogOut, Menu, X, Layers, LayoutDashboard } from 'lucide-react';
import { getSupabaseClient } from './lib/supabase';
import { isFullyAuthenticated } from './lib/mfaFlow';

const NavLink = ({ icon, label, isActive, onClick }) => {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center text-left px-4 py-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-5 h-5 mr-4 flex-shrink-0" />
      <span className="font-semibold text-sm tracking-wide">{label}</span>
    </button>
  );
};

// Extraído a nivel de módulo para no recrearlo en cada render del App.
// Recibe explícitamente el estado y los handlers que necesita.
const SidebarContent = ({ activeView, setActiveView, setIsSidebarOpen, handleLogout }) => (
  <div className="flex flex-col h-full bg-white/95 backdrop-blur-lg">
    <div className="p-6 py-8 mb-2 flex justify-center border-b border-slate-200/80">
        <img src="/logo_corsam.png" alt="Corsam Logo" className="w-36 h-auto object-contain"/>
    </div>
    <nav className="flex-1 p-4 space-y-2">
      <NavLink
        icon={BarChart3}
        label="Automatización Presupuestos"
        isActive={activeView === 'presupuestos'}
        onClick={() => { setActiveView('presupuestos'); setIsSidebarOpen(false); }}
      />
      <NavLink
        icon={Bot}
        label="Asistente IA de Partidas"
        isActive={activeView === 'chatbot'}
        onClick={() => { setActiveView('chatbot'); setIsSidebarOpen(false); }}
      />
      <NavLink
        icon={Layers}
        label="Explorador de Partidas"
        isActive={activeView === 'explorer'}
        onClick={() => { setActiveView('explorer'); setIsSidebarOpen(false); }}
      />
      <NavLink
        icon={LayoutDashboard}
        label="Dashboard de Obras"
        isActive={activeView === 'dashboard'}
        onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }}
      />
    </nav>
    <div className="p-4 border-t border-slate-200/80">
       <button
        onClick={handleLogout} // Cierra la sesión real en Supabase
        className="w-full flex items-center text-left px-4 py-3 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-600 transition-all duration-200"
      >
        <LogOut className="w-5 h-5 mr-4 flex-shrink-0" />
        <span className="font-semibold text-sm tracking-wide">Cerrar Sesión</span>
      </button>
    </div>
  </div>
);


function App() {
  // --- ESTADOS PRINCIPALES DE LA APP ---
  // `isRestoringSession` evita un parpadeo del login mientras se comprueba
  // si hay una sesión previa válida (Facebook-like: recordar al usuario solo
  // si ya pasó login + segundo factor, nivel AAL2).
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('presupuestos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- RESTAURACIÓN DE SESIÓN ---
  // Solo se entra automáticamente con nivel de garantía AAL2: sesión
  // + segundo factor ya verificado en esta sesión de Supabase.
  useEffect(() => {
    let cancelled = false;
    getSupabaseClient()
      .auth.mfa.getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (!cancelled && isFullyAuthenticated(data)) setIsAuthenticated(true);
      })
      .catch(() => {
        // Sesión corrupta o cliente mal configurado: cae al login normal.
      })
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false);
      });
    return () => { cancelled = true; };
  }, []);

  // --- MANEJADORES DE ESTADO ---
  const handleLoginSuccess = () => setIsAuthenticated(true);
  const handleLogout = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } finally {
      setIsAuthenticated(false);
    }
  };

  // --- MIENTRAS SE COMPRUEBA LA SESIÓN PREVIA ---
  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-100 to-cyan-100 flex items-center justify-center">
        <img src="/logo_corsam.png" alt="Corsam Logo" className="w-16 h-16 object-contain animate-pulse" />
      </div>
    );
  }

  // --- SI NO ESTÁ AUTENTICADO, MUESTRA SOLO EL LOGIN ---
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // --- SI ESTÁ AUTENTICADO, MUESTRA LA APP COMPLETA ---

  const renderContent = () => {
    switch(activeView) {
        case 'presupuestos':
            return <BudgetAutomationTool />;
        case 'chatbot':
            return (
                <div className="w-full h-full max-w-7xl mx-auto">
                    <PartidasChatbot />
                </div>
            );
        case 'explorer':
            return <PartidasExplorer />;
        case 'dashboard':
            return <DashboardObra />;
        default:
            return <BudgetAutomationTool />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 font-sans flex">
      {/* --- Sidebar para Desktop --- */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200/80 bg-white">
        <SidebarContent activeView={activeView} setActiveView={setActiveView} setIsSidebarOpen={setIsSidebarOpen} handleLogout={handleLogout} />
      </aside>

      {/* --- Sidebar para Móvil (Overlay) --- */}
      <div className="lg:hidden">
          <button aria-label="Abrir menú" onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-slate-800 border border-slate-200/80">
            <Menu className="w-6 h-6"/>
          </button>

          <AnimatePresence>
            {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-40" />}
          </AnimatePresence>

          <AnimatePresence>
              {isSidebarOpen && (
                  <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "tween", ease: "circOut", duration: 0.4 }} className="fixed top-0 left-0 h-full w-72 z-50 shadow-2xl bg-white">
                      <SidebarContent activeView={activeView} setActiveView={setActiveView} setIsSidebarOpen={setIsSidebarOpen} handleLogout={handleLogout} />
                      <button aria-label="Cerrar menú" onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 bg-slate-100/80 rounded-full"><X className="w-5 h-5"/></button>
                  </motion.aside>
              )}
          </AnimatePresence>
      </div>

      {/* --- Contenido Principal --- */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="h-full"
              >
                {renderContent()}
              </motion.div>
          </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
