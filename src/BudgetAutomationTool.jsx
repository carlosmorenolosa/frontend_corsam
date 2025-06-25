import React, { useState, useRef, useCallback } from 'react';
// MEJORA: Importamos motion para animaciones, Toaster y toast para notificaciones
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
// MEJORA: Se añaden iconos para el nuevo paso de revisión y otros elementos de UI
import { 
  Upload, FileText, Zap, Download, CheckCircle, AlertCircle, Loader2, Bot, 
  TrendingUp, Clock, Package, BarChart3, Building2, DollarSign, Edit, Save, 
  ChevronDown, ChevronUp, Trash2
} from 'lucide-react';

// MEJORA: Componente reutilizable para las tarjetas de resumen del resultado.
// Esto limpia el código principal y facilita el mantenimiento.
const SummaryCard = ({ icon, title, value, subtitle, colorClass }) => {
  const Icon = icon;
  return (
    <div className={`bg-gradient-to-br ${colorClass.gradient} rounded-2xl p-6 border ${colorClass.border} shadow-sm`}>
      <div className="flex items-center mb-2">
        <Icon className={`w-6 h-6 ${colorClass.text} mr-3`} />
        <span className={`${colorClass.text} font-semibold`}>{title}</span>
      </div>
      <div className={`text-3xl font-bold ${colorClass.mainText}`}>{value}</div>
      {subtitle && <div className={`text-sm ${colorClass.text} mt-1`}>{subtitle}</div>}
    </div>
  );
};

const BudgetAutomationTool = () => {
  // MEJORA: El estado ahora incluye el paso de revisión y el manejo de filas editables.
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [optimizedBudget, setOptimizedBudget] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [usedBudgets, setUsedBudgets] = useState(3);
  const maxBudgets = 20;
  const fileInputRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

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
    setIsAuthenticated(true);
    setLoginError('');
    toast.success(`¡Bienvenido ${loginForm.username}!`);
  } else {
    setLoginError('Usuario o contraseña incorrectos');
    toast.error('Credenciales inválidas');
  }
};

  // MEJORA: Se añade el paso "Revisar y Confirmar" para dar control al usuario.
  const steps = [
    { title: 'Subir Archivo', icon: Upload, description: 'Carga tu presupuesto' },
    { title: 'Extracción IA', icon: Bot, description: 'La IA lee los datos' },
    { title: 'Revisar y Editar', icon: Edit, description: 'Verifica la información' },
    { title: 'Optimización RAG', icon: Zap, description: 'Buscamos precios óptimos' },
    { title: 'Descargar Resultado', icon: Download, description: 'Tu nuevo presupuesto' }
  ];

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
     e.preventDefault();
     e.stopPropagation();
     setDragActive(false);
     if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  }, []);

  const handleFileUpload = async (file) => {
    if (usedBudgets >= maxBudgets) {
      toast.error('Límite de presupuestos alcanzado. Contacta con Corsam.', { duration: 4000 });
      return;
    }

    setUploadedFile(file);
    setCurrentStep(1);
    setProcessing(true);
    toast.loading('Analizando archivo...');

    // Simulación de la extracción de datos por IA
    setTimeout(() => {
      toast.dismiss();
      toast.success('Información extraída con éxito.');
      setExtractedData({
        items: [
          { id: 1, description: 'Instalación sistema climatización VRV (ud)', quantity: 1, unit: 'ud', currentPrice: 2850.00 },
          { id: 2, description: 'Ascensor hidráulico 6p. Schindler', quantity: 1, unit: 'ud', currentPrice: 18500.00 },
          { id: 3, description: 'Conductos fibra de vidrio Climaver Plus', quantity: 45, unit: 'm', currentPrice: 32.50 },
          { id: 4, description: 'Mano de obra especializada HVAC', quantity: 24, unit: 'h', currentPrice: 45.00 },
        ],
      });
      // NUEVO: El flujo se detiene en el paso de revisión.
      setCurrentStep(2);
      setProcessing(false);
    }, 2500);
  };
  
  // NUEVO: Maneja los cambios del usuario en la tabla de revisión.
  const handleExtractedDataChange = (index, field, value) => {
      const newItems = [...extractedData.items];
      const numValue = parseFloat(value);
      newItems[index][field] = field === 'description' || field === 'unit' ? value : (isNaN(numValue) ? 0 : numValue);
      setExtractedData({ ...extractedData, items: newItems });
  };
    
  // NUEVO: Permite al usuario eliminar una partida extraída incorrectamente.
  const handleRemoveItem = (id) => {
    const newItems = extractedData.items.filter(item => item.id !== id);
    setExtractedData({ ...extractedData, items: newItems });
    toast('Partida eliminada', { icon: '🗑️' });
  }

  // NUEVO: Se ejecuta al confirmar los datos revisados para empezar la optimización.
  const handleConfirmAndOptimize = () => {
    if (extractedData.items.length === 0) {
        toast.error("No hay partidas para optimizar.");
        return;
    }
    setCurrentStep(3);
    setProcessing(true);
    toast.loading('Optimizando con IA...');

    // Simulación de la optimización RAG
    setTimeout(() => {
        toast.dismiss();
        toast.success('¡Presupuesto optimizado!');
        
        const totalOriginal = extractedData.items.reduce((acc, item) => acc + (item.quantity * item.currentPrice), 0);
        const optimizedItems = extractedData.items.map(item => {
            const priceFactor = 1 - (Math.random() * 0.15 + 0.05); // Ahorro entre 5% y 20%
            const optimizedPrice = parseFloat((item.currentPrice * priceFactor).toFixed(2));
            return {
                ...item,
                optimizedPrice,
                savings: parseFloat((item.currentPrice - optimizedPrice).toFixed(2)),
                supplier: ['Daikin', 'Schindler', 'S&P', 'Mitsubishi', 'Schneider'][Math.floor(Math.random() * 5)],
                deliveryTime: `${Math.floor(Math.random() * 10 + 3)}-${Math.floor(Math.random() * 10 + 13)} días`
            }
        });
        const totalOptimized = optimizedItems.reduce((acc, item) => acc + (item.quantity * item.optimizedPrice), 0);
        const totalSavings = totalOriginal - totalOptimized;
        
        setOptimizedBudget({
            items: optimizedItems,
            totalOriginal,
            totalOptimized,
            totalSavings,
            savingsPercentage: parseFloat(((totalSavings / totalOriginal) * 100).toFixed(1)) || 0,
        });
        setCurrentStep(4);
        setProcessing(false);
        setUsedBudgets(prev => prev + 1);
    }, 3000);
  };
  
  const handleDownload = (format) => {
    // Aquí iría la lógica real con jspdf o una API para generar el BC3.
    toast.success(`Generando descarga en ${format.toUpperCase()}...`);
  };
  
  const resetProcess = () => {
      setCurrentStep(0);
      setUploadedFile(null);
      setExtractedData(null);
      setOptimizedBudget(null);
      setProcessing(false);
  }

const renderLogin = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200">
      <div className="text-center mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-3 rounded-lg w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Corsam Presupuestos IA</h1>
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
          © {new Date().getFullYear()} Corsam - Acceso autorizado únicamente
        </p>
      </div>
    </div>
  </div>
);

  const remainingBudgets = maxBudgets - usedBudgets;
  const progressPercentage = (usedBudgets / maxBudgets) * 100;
  
  const renderStepContent = () => {
      switch(currentStep) {
        case 0:
            return (
                <div className="text-center w-full">
                    <div
                      className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
                        dragActive ? 'border-blue-400 bg-blue-50 scale-105' : 
                        remainingBudgets <= 0 ? 'border-slate-300 bg-slate-50 opacity-60' :
                        'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                      onDragEnter={remainingBudgets > 0 ? handleDrag : undefined}
                      onDragLeave={remainingBudgets > 0 ? handleDrag : undefined}
                      onDragOver={remainingBudgets > 0 ? handleDrag : undefined}
                      onDrop={remainingBudgets > 0 ? handleDrop : undefined}
                    >
                      <Upload className={`w-16 h-16 mx-auto mb-4 transition-colors ${remainingBudgets <= 0 ? 'text-slate-300' : 'text-slate-400'}`} />
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">Sube tu presupuesto de climatización o ascensores</h3>
                      <p className="text-slate-600 mb-6">Arrastra y suelta o haz clic para seleccionar</p>
                      <p className="text-sm text-slate-500 mb-6">Formatos: PDF, Excel, BC3</p>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} disabled={remainingBudgets <= 0} />
                      <button onClick={() => remainingBudgets > 0 && fileInputRef.current?.click()} disabled={remainingBudgets <= 0} className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 transition-all duration-300 transform disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg">
                        {remainingBudgets <= 0 ? 'Límite Alcanzado' : 'Seleccionar Archivo'}
                      </button>
                    </div>
                </div>
            );
        case 1:
            return (
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-2xl font-semibold text-slate-800 mb-2">Extrayendo Información...</h3>
                    <p className="text-slate-600">Nuestra IA está leyendo cada partida de tu archivo.</p>
                </div>
            );
        case 2:
            return (
                extractedData && <div>
                    <div className="text-center mb-8">
                        <Edit className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-semibold text-slate-800 mb-2">Revisa la Información Extraída</h3>
                        <p className="text-slate-600">Asegúrate de que los datos son correctos. Puedes editar o eliminar cualquier partida.</p>
                    </div>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-lg border max-h-[40vh] overflow-y-auto">
                        {extractedData.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-md shadow-sm">
                                <input type="text" value={item.description} onChange={(e) => handleExtractedDataChange(index, 'description', e.target.value)} className="col-span-12 md:col-span-5 p-2 border rounded-md focus:ring-2 focus:ring-blue-400" />
                                <input type="number" value={item.quantity} onChange={(e) => handleExtractedDataChange(index, 'quantity', e.target.value)} className="col-span-3 md:col-span-2 p-2 border rounded-md text-center focus:ring-2 focus:ring-blue-400" />
                                <input type="text" value={item.unit} onChange={(e) => handleExtractedDataChange(index, 'unit', e.target.value)} className="col-span-3 md:col-span-1 p-2 border rounded-md text-center focus:ring-2 focus:ring-blue-400" />
                                <input type="number" value={item.currentPrice} onChange={(e) => handleExtractedDataChange(index, 'currentPrice', e.target.value)} className="col-span-4 md:col-span-3 p-2 border rounded-md text-right focus:ring-2 focus:ring-blue-400" />
                                <button onClick={() => handleRemoveItem(item.id)} className="col-span-2 md:col-span-1 text-red-500 hover:text-red-700 flex justify-center items-center">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <button onClick={handleConfirmAndOptimize} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold flex items-center mx-auto hover:scale-105 transition-transform shadow-lg">
                            <Save className="w-5 h-5 mr-2" />
                            Confirmar y Optimizar
                        </button>
                    </div>
                </div>
            );
        case 3:
             return (
                <div className="text-center">
                     <Zap className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-bounce" />
                     <h3 className="text-2xl font-semibold text-slate-800 mb-2">Optimizando Presupuesto...</h3>
                     <p className="text-slate-600">Buscando precios en nuestra base de datos de proveedores.</p>
                </div>
            );
        case 4:
            return (
               optimizedBudget && <div>
                    <div className="text-center mb-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-3xl font-bold text-slate-800 mb-2">¡Presupuesto Optimizado!</h3>
                        <p className="text-slate-600">Hemos encontrado las mejores opciones para tu proyecto.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <SummaryCard icon={DollarSign} title="Ahorro Total" value={`${optimizedBudget.totalSavings.toFixed(2)}€`} subtitle={`${optimizedBudget.savingsPercentage}% de descuento`} colorClass={{gradient: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-700', mainText: 'text-green-800'}} />
                        <SummaryCard icon={Package} title="Precio Original" value={`${optimizedBudget.totalOriginal.toFixed(2)}€`} colorClass={{gradient: 'from-slate-50 to-slate-100', border: 'border-slate-200', text: 'text-slate-700', mainText: 'text-slate-800'}} />
                        <SummaryCard icon={TrendingUp} title="Precio Optimizado" value={`${optimizedBudget.totalOptimized.toFixed(2)}€`} colorClass={{gradient: 'from-blue-50 to-cyan-50', border: 'border-blue-200', text: 'text-blue-700', mainText: 'text-blue-800'}} />
                    </div>
        
                    <div className="bg-slate-50 rounded-xl overflow-hidden mb-8 border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-6 py-4 text-left text-slate-700 font-semibold">Descripción</th>
                              <th className="px-6 py-4 text-center text-slate-700 font-semibold">Precio Original</th>
                              <th className="px-6 py-4 text-center text-slate-700 font-semibold">Precio Optimizado</th>
                              <th className="px-6 py-4 text-center text-slate-700 font-semibold">Ahorro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {optimizedBudget.items.map((item) => (
                              <tr key={item.id} className="border-t border-slate-200 hover:bg-white transition-colors">
                                <td className="px-6 py-4 text-slate-800 font-medium">{item.description}</td>
                                <td className="px-6 py-4 text-center text-red-600 line-through">{item.currentPrice.toFixed(2)}€</td>
                                <td className="px-6 py-4 text-center text-green-600 font-bold">{item.optimizedPrice.toFixed(2)}€</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                    -{item.savings.toFixed(2)}€
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => handleDownload('pdf')} className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 flex items-center shadow-lg">
                            <Download className="w-5 h-5 mr-2" /> Descargar PDF
                        </button>
                        <button onClick={() => handleDownload('bc3')} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 flex items-center shadow-lg">
                            <Download className="w-5 h-5 mr-2" /> Descargar BC3
                        </button>
                    </div>
               </div>
            );
        default:
            return null;
      }
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {!isAuthenticated ? renderLogin() : (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
            
            <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border-l-4 border-blue-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-3 rounded-lg mr-4">
                    <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                    <h1 className="text-3xl font-bold text-slate-800">Corsam <span className="text-blue-600">Presupuestos IA</span></h1>
                    <p className="text-slate-600">Automatización inteligente para climatización y ascensores</p>
                    </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 w-full sm:w-auto">
                    <div className="text-center">
                    <div className="flex items-center justify-center mb-2"><BarChart3 className="w-5 h-5 text-blue-600 mr-2" /><span className="text-sm font-medium text-slate-600">Uso Mensual</span></div>
                    <div className="text-2xl font-bold text-slate-800 mb-1">{usedBudgets}/{maxBudgets}</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2"><div className={`h-2 rounded-full transition-all duration-300 ${progressPercentage > 80 ? 'bg-red-500' : progressPercentage > 60 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${progressPercentage}%` }} /></div>
                    <div className="text-xs text-slate-500">{remainingBudgets} restantes</div>
                    <button
                    onClick={() => {setIsAuthenticated(false); resetProcess();}}
                    className="text-xs text-slate-600 hover:text-slate-800 transition-colors underline"
                    >
                    Cerrar Sesión
                    </button>
                    </div>
                </div>
                </div>
            </div>

            {remainingBudgets <= 5 && remainingBudgets > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center"><AlertCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" /><div><p className="text-orange-800 font-medium">¡Atención!</p><p className="text-orange-700 text-sm">Solo te quedan {remainingBudgets} presupuestos este mes.</p></div></div>
            )}
            {remainingBudgets <= 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center"><AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" /><div><p className="text-red-800 font-medium">Límite Alcanzado</p><p className="text-red-700 text-sm">Has usado todos tus presupuestos. Contacta con Corsam para ampliar tu plan.</p></div></div>
            )}

            <div className="mb-12">
                <div className="flex justify-between items-start relative max-w-3xl mx-auto">
                {steps.map((step, index) => (
                    <div key={index} className={`flex flex-col items-center text-center w-24 md:w-32 z-10`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${index < currentStep ? 'bg-green-500 border-green-500' : index === currentStep ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-200' : 'bg-white border-slate-300'}`}>
                        {index < currentStep ? <CheckCircle className="w-8 h-8 text-white" /> : <step.icon className={`w-8 h-8 ${index === currentStep ? 'text-white' : 'text-slate-400'}`} />}
                    </div>
                    <p className={`mt-2 font-semibold text-sm transition-colors ${index < currentStep ? 'text-green-600' : index === currentStep ? 'text-blue-600' : 'text-slate-500'}`}>{step.title}</p>
                    <p className="text-xs text-slate-500 hidden md:block">{step.description}</p>
                    {index < steps.length - 1 && (
                        <div className={`absolute top-8 left-1/2 w-full h-1 transition-colors duration-500 ${index < currentStep ? 'bg-green-500' : 'bg-slate-300'}`} style={{ transform: 'translateX( calc( -50% + 4rem ) )', width: 'calc(100% - 8rem)' }}/>
                    )}
                    </div>
                ))}
                </div>
            </div>
            
            <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-xl border border-slate-200 min-h-[400px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.35 }}
                    className="w-full"
                >
                    {renderStepContent()}
                </motion.div>
                </AnimatePresence>
            </div>

            {currentStep > 0 && !processing && (
                <div className="text-center mt-8">
                <button onClick={resetProcess} className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm">
                    ← Procesar otro presupuesto
                </button>
                </div>
            )}

            <footer className="text-center mt-12 text-slate-500 text-sm">
                <p>© {new Date().getFullYear()} Corsam - Soluciones en climatización, ascensores e instalaciones modulares.</p>
            </footer>
            </div>
        </div>
      )}
    </>
  );
};

export default BudgetAutomationTool;
