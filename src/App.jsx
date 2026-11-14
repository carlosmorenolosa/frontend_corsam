import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Importa todos los componentes necesarios ---
import LoginScreen from './LoginScreen';
import BudgetAutomationTool from './BudgetAutomationTool';
import PartidasChatbot from './PartidasChatbot';

import { Toaster } from 'react-hot-toast';
import PartidasExplorer from './PartidasExplorer';
import DashboardObra from './DashboardObra';
import { BarChart3, Bot, LogOut, Menu, X, Layers, LayoutDashboard } from 'lucide-react';

const NavLink = ({ icon, label, isActive, onClick }) => {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center text-left px-4 py-3 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-corsam-black focus:ring-offset-1 ${
        isActive
          ? 'bg-corsam-black text-white font-semibold'
          : 'text-corsam-gray hover:bg-corsam-paper hover:text-corsam-black'
      }`}
    >
      <Icon className="w-5 h-5 mr-4 flex-shrink-0" />
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );
};

// Extraído a nivel de módulo para no recrearlo en cada render del App.
// Recibe explícitamente el estado y los handlers que necesita.
const SidebarContent = ({ activeView, setActiveView, setIsSidebarOpen, handleLogout }) => (
  <div className="flex flex-col h-full bg-white">
    <div className="p-6 py-8 mb-1 flex justify-center border-b border-corsam-line">
        <img src="/logo_corsam.png" alt="Corsam Logo" className="w-36 h-auto object-contain"/>
    </div>
    <p className="kicker px-6 pt-5 pb-1">Menú</p>
    <nav className="flex-1 px-4 pb-4 space-y-1">
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
    <div className="p-4 border-t border-corsam-line">
       <button
        onClick={handleLogout} // Llama a la función de logout
        className="w-full flex items-center text-left px-4 py-3 text-corsam-gray hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
      >
        <LogOut className="w-5 h-5 mr-4 flex-shrink-0" />
        <span className="text-sm tracking-wide">Cerrar Sesión</span>
      </button>
    </div>
  </div>
);


function App() {
  // --- ESTADOS PRINCIPALES DE LA APP ---
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Empieza como no autenticado
  const [activeView, setActiveView] = useState('presupuestos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- MANEJADORES DE ESTADO ---
  const handleLoginSuccess = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false);


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
    <div className="min-h-screen bg-corsam-paper font-sans flex">
      {/* --- Sidebar para Desktop --- */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-corsam-line bg-white">
        <SidebarContent activeView={activeView} setActiveView={setActiveView} setIsSidebarOpen={setIsSidebarOpen} handleLogout={handleLogout} />
      </aside>

      {/* --- Sidebar para Móvil (Overlay) --- */}
      <div className="lg:hidden">
          <button aria-label="Abrir menú" onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white rounded-none shadow-lg text-corsam-black border border-corsam-line">
             <Menu className="w-6 h-6" />
          </button>
          
          <AnimatePresence>
            {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-40" />}
          </AnimatePresence>
          
          <AnimatePresence>
              {isSidebarOpen && (
                  <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "tween", ease: "circOut", duration: 0.4 }} className="fixed top-0 left-0 h-full w-72 z-50 shadow-2xl bg-white">
                      <SidebarContent activeView={activeView} setActiveView={setActiveView} setIsSidebarOpen={setIsSidebarOpen} handleLogout={handleLogout} />
                      <button aria-label="Cerrar menú" onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-corsam-gray hover:text-corsam-black bg-corsam-paper rounded-none"><X className="w-5 h-5"/></button>
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