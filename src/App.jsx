// src/App.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Importa tus dos componentes principales
import BudgetAutomationTool from './BudgetAutomationTool';
import PartidasChatbot from './PartidasChatbot';

// Importa los iconos que usaremos para la navegación
import { BarChart3, Bot, LogOut, Menu, X } from 'lucide-react';

// --- Componente reutilizable para los enlaces de navegación ---
// Esto mantiene el código limpio y fácil de mantener.
const NavLink = ({ icon, label, isActive, onClick }) => {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center text-left px-4 py-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <Icon className="w-5 h-5 mr-4 flex-shrink-0" />
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
};


// --- Componente Principal de la Aplicación ---
function App() {
  // Estado para saber qué vista mostrar: 'presupuestos' o 'chatbot'
  const [activeView, setActiveView] = useState('presupuestos');
  
  // Estado para controlar el menú en dispositivos móviles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // NOTA: La lógica de autenticación sigue dentro de BudgetAutomationTool.
  // Al hacer clic en "Cerrar Sesión", tu lógica actual se activará.
  // Por ahora, el botón en el menú simplemente simula un click.

  // Contenido de la barra lateral, para no repetir código
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 mb-4 flex justify-center">
          <img 
            src="/logo_corsam.png" 
            alt="Corsam Logo" 
            className="w-32 h-auto object-contain"
          />
      </div>
      <nav className="flex-1 px-4 space-y-3">
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
          // Esta lógica se puede mejorar centralizando el estado de auth en App.jsx en el futuro
          onClick={() => window.location.reload()} // Una forma simple de "cerrar sesión" y volver al login
          className="w-full flex items-center text-left px-4 py-3 rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <LogOut className="w-5 h-5 mr-4" />
          <span className="font-semibold text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  // Determina qué componente renderizar con una animación
  const renderContent = () => {
    switch(activeView) {
        case 'presupuestos':
            return <BudgetAutomationTool />;
        case 'chatbot':
            // El chatbot necesita un contenedor con altura para que la lista de mensajes sea scrollable.
            // Le damos el mismo estilo de tarjeta que ya usas.
            return (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 h-[calc(100vh-4rem)] max-w-6xl mx-auto">
                    <PartidasChatbot />
                </div>
            );
        default:
            return <BudgetAutomationTool />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* --- BARRA LATERAL PARA DESKTOP (visible en pantallas grandes) --- */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200">
        <SidebarContent />
      </aside>

      {/* --- MENÚ PARA MÓVIL (se superpone) --- */}
      <div className="lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-slate-800">
             <Menu className="w-6 h-6" />
          </button>
          
          {/* Fondo oscuro al abrir el menú */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/40 z-40"
              />
            )}
          </AnimatePresence>
          
          {/* El panel del menú que se desliza */}
          <AnimatePresence>
              {isSidebarOpen && (
                  <motion.aside
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                    className="fixed top-0 left-0 h-full w-72 z-50 shadow-2xl"
                  >
                      <SidebarContent />
                      <button onClick={() => setIsSidebarOpen(false)} className="absolute top-5 right-5 p-1 text-slate-500 hover:text-slate-800">
                          <X className="w-6 h-6"/>
                      </button>
                  </motion.aside>
              )}
          </AnimatePresence>
      </div>


      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
              <motion.div
                key={activeView} // La clave aquí es lo que le dice a AnimatePresence que el contenido ha cambiado
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {renderContent()}
              </motion.div>
          </AnimatePresence>
      </main>
    </div>
  );
}

export default App;