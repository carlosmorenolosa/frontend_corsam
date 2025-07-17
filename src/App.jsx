import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Importa todos los componentes necesarios ---
import LoginScreen from './LoginScreen';
import BudgetAutomationTool from './BudgetAutomationTool';
import PartidasChatbot from './PartidasChatbot';

import { Toaster } from 'react-hot-toast';
import { BarChart3, Bot, LogOut, Menu, X } from 'lucide-react';

const NavLink = ({ icon, label, isActive, onClick }) => {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center text-left px-4 py-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
    >
      <Icon className="w-5 h-5 mr-4 flex-shrink-0" />
      <span className="font-semibold text-sm tracking-wide">{label}</span>
    </button>
  );
};


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
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 py-8 mb-2 flex justify-center border-b border-slate-200">
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
      </nav>
      <div className="p-4 border-t border-slate-200">
         <button
          onClick={handleLogout} // Llama a la función de logout
          className="w-full flex items-center text-left px-4 py-3 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-600 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-4" />
          <span className="font-semibold text-sm tracking-wide">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeView) {
        case 'presupuestos':
            return <BudgetAutomationTool />;
        case 'chatbot':
            // El contenedor ahora es más flexible y está centrado dentro del área de padding.
            return (
                <div className="w-full h-full max-w-7xl mx-auto">
                    <PartidasChatbot />
                </div>
            );
        default:
            return <BudgetAutomationTool />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* --- Sidebar para Desktop --- */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 bg-white">
        <SidebarContent />
      </aside>

      {/* --- Sidebar para Móvil (Overlay) --- */}
      <div className="lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-slate-800 border border-slate-200">
             <Menu className="w-6 h-6" />
          </button>
          
          <AnimatePresence>
            {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40" />}
          </AnimatePresence>
          
          <AnimatePresence>
              {isSidebarOpen && (
                  <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "tween", ease: "circOut", duration: 0.4 }} className="fixed top-0 left-0 h-full w-72 z-50 shadow-2xl bg-white">
                      <SidebarContent />
                      <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                  </motion.aside>
              )}
          </AnimatePresence>
      </div>

      {/* --- Contenido Principal --- */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
              <motion.div 
                key={activeView} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.25, ease: 'easeInOut' }}
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
