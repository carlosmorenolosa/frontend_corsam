import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Upload, Zap, Download, CheckCircle, AlertCircle, Loader2, Bot, 
  Clock, Package, BarChart3, DollarSign, Edit, Save, 
  Trash2, AlertTriangle // <-- AlertTriangle añadido
} from 'lucide-react';

const API_URL = "https://0s0y566haf.execute-api.eu-west-1.amazonaws.com/extract";
const OPTIMIZE_URL = "https://3um7hhwzzt5iirno6sopnszs3m0ssdlb.lambda-url.eu-west-1.on.aws/";
const AUDIT_URL = "https://7eua2ajhxbw74cncp4bzqchg7e0pvvdk.lambda-url.eu-west-1.on.aws/"; // <-- NUEVA LAMBDA
const GENERATE_BC3_URL = "https://l4c4t3gfaxry2ikqsz5zu6j6mq0ojcjp.lambda-url.eu-west-1.on.aws/"; // <-- URL de la nueva Lambda para generar BC3

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
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [optimizedBudget, setOptimizedBudget] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [usedBudgets, setUsedBudgets] = useState(0);
  const [maxBudgets, setMaxBudgets] = useState(20); // Default value, will be updated by backend
  const fileInputRef = useRef(null);
  const [openRow, setOpenRow] = useState(null);
  const [targetRate, setTargetRate] = useState(50);
  const [materialsMargin, setMaterialsMargin] = useState(30);
  const [generatedBc3Content, setGeneratedBc3Content] = useState('');
  
  // --- NUEVOS ESTADOS PARA AUDITORÍA ---
  const [auditReport, setAuditReport] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Cargar el contador de uso al iniciar la aplicación
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch(OPTIMIZE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }), // Enviar items vacíos para solo obtener el uso
        });
        if (response.ok) {
          const data = await response.json();
          if (data.usage) {
            setUsedBudgets(data.usage.current);
            setMaxBudgets(data.usage.max);
          }
        } else {
          console.error("Error al cargar el uso inicial:", response.statusText);
          toast.error("Error al cargar el contador de uso.");
        }
      } catch (error) {
        console.error("Error de red al cargar el uso inicial:", error);
        toast.error("Error de red al cargar el contador de uso.");
      }
    };
    fetchUsage();
  }, []);

  const steps = [
    { title: 'Subir Archivo', icon: Upload, description: 'Carga tu presupuesto' },
    { title: 'Análisis IA', icon: Bot, description: 'La IA lee y audita' },
    { title: 'Revisar y Editar', icon: Edit, description: 'Verifica la información' },
    { title: 'Optimización IA', icon: Zap, description: 'Buscamos precios óptimos' },
    { title: 'Generar BC3', icon: Package, description: 'Crea el archivo BC3' },
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
    // Usage check will now be handled by the backend Lambda function
    // The frontend will react to the 429 status code if the limit is exceeded.

    setUploadedFile(file);
    setCurrentStep(1);
    setProcessing(true);
    setIsAuditing(true); // <-- Inicia auditoría
    toast.loading("Analizando presupuesto con IA...");

    try {
      let extractedText = "";
      // (El resto del código de lectura de archivos permanece igual)
      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
        const reader = new FileReader();
        reader.onload = async (event) => {
          const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((t) => t.str).join(' ');
          }
          processFileContent(text);
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type.includes("spreadsheetml") || file.type.includes("ms-excel")) {
        const XLSX = await import("xlsx");
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          extractedText = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).flat().join(" ");
          processFileContent(extractedText);
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => processFileContent(event.target.result);
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.dismiss();
      toast.error("No se pudo procesar el archivo.");
      resetProcess();
    }
  };

  const processFileContent = async (content) => {
    try {
      // 1. Llamada a la Lambda de Auditoría
      const auditResponse = await fetch(AUDIT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: content,
      });
      if (!auditResponse.ok) {
        throw new Error(`La auditoría falló: ${auditResponse.statusText}`);
      }
      const auditResult = await auditResponse.json();
      setAuditReport(auditResult.auditReport);
      setIsAuditing(false);

      // 2. Llamada a la Lambda de Extracción
      toast.loading("Extrayendo partidas del presupuesto...");
      const extractionResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: content,
      });
      if (!extractionResponse.ok) {
        throw new Error(`La extracción falló: ${extractionResponse.statusText}`);
      }
      const extractionResult = await extractionResponse.json();

      // 3. Éxito
      toast.dismiss();
      toast.success("Análisis completado.");
      const itemsWithIds = extractionResult.items.map((item, index) => ({ ...item, id: index + 1 }));
      setExtractedData({ items: itemsWithIds });
      setCurrentStep(2);

    } catch (error) {
      console.error("Error during AI processing:", error);
      toast.dismiss();
      toast.error(error.message || "Una de las tareas de la IA falló.");
      resetProcess();
    } finally {
      setProcessing(false);
    }
  };

  const handleExtractedDataChange = (index, field, value) => {
      const newItems = [...extractedData.items];
      const numValue = parseFloat(value);
      newItems[index][field] = field === 'description' || field === 'unit' ? value : (isNaN(numValue) ? 0 : numValue);
      setExtractedData({ ...extractedData, items: newItems });
  };
    
  const handleRemoveItem = (id) => {
    const newItems = extractedData.items.filter(item => item.id !== id);
    setExtractedData({ ...extractedData, items: newItems });
    toast('Partida eliminada', { icon: '🗑️' });
  };

  const handleAddItem = () => {
    if (!extractedData) return;
    const nextId = extractedData.items.length > 0 ? Math.max(...extractedData.items.map(it => it.id)) + 1 : 1;
    const newItem = { id: nextId, description: "", quantity: 1, unit: "ud", currentPrice: 0 };
    setExtractedData({ ...extractedData, items: [...extractedData.items, newItem] });
    toast("Partida añadida", { icon: "➕" });
  };

  const handleConfirmAndOptimize = async () => {
    if (!extractedData || extractedData.items.length === 0) {
      toast.error("No hay partidas para optimizar.");
      return;
    }
    setCurrentStep(3);
    setProcessing(true);
    toast.loading("Optimizando con IA…");
    try {
      const response = await fetch(OPTIMIZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: extractedData.items, targetRate, materialsMargin }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          toast.dismiss();
          toast.error(errorData.message || "Límite de uso mensual alcanzado.", { duration: 4000 });
          resetProcess(); // Reset the process if limit is reached
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      toast.dismiss();
      toast.success("¡Presupuesto optimizado!");
      setOptimizedBudget({
        items: data.items,
        totalOriginal: data.totalOriginal,
        totalOptimized: data.totalOptimized,
        totalSavings: data.totalSavings,
        savingsPercentage: data.savingsPercent,
        totalHours: data.totalHours,
        totalProfit: data.totalProfit,
        profitPerHour: data.profitPerHour,
      });
      setCurrentStep(4);
      // Update shared usage from backend response
      if (data.usage) {
        setUsedBudgets(data.usage.current);
        setMaxBudgets(data.usage.max);
      }
    } catch (e) {
      console.error("Optimization error:", e);
      toast.dismiss();
      toast.error("No se pudo optimizar el presupuesto.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = (format) => {
    // Esta función ahora solo se usará para el botón de generar BC3
    if (format === 'bc3') {
      handleGenerateBC3();
    }
  };

  const handleGenerateBC3 = async () => {
    if (!optimizedBudget || !optimizedBudget.items.length) {
      toast.error("No hay presupuesto optimizado para generar BC3.");
      return;
    }

    setCurrentStep(5); // Nuevo paso para revisión de BC3
    setProcessing(true);
    toast.loading("Generando archivo BC3...");

    try {
      // Filtrar y mapear los datos para enviar solo lo necesario a la Lambda
      const itemsToSend = optimizedBudget.items.map(item => ({
        code: item.code || '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        optimizedPrice: item.optimizedPrice,
        // No incluir 'similar' aquí, ya que la Lambda de generación BC3 no lo necesita
      }));

      const response = await fetch(GENERATE_BC3_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      toast.dismiss();
      toast.success("Archivo BC3 generado. Revísalo antes de descargar.");
      setGeneratedBc3Content(data.bc3); // Asume que la Lambda devuelve { bc3: "..." }
    } catch (e) {
      console.error("Error generating BC3:", e);
      toast.dismiss();
      toast.error("No se pudo generar el archivo BC3.");
      setCurrentStep(4); // Volver al paso anterior si falla
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadFinalBC3 = () => {
    if (!generatedBc3Content) {
      toast.error("No hay contenido BC3 para descargar.");
      return;
    }

    const date = new Date();
    const fileName = `presupuesto_bc3_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}.bc3`;

    const blob = new Blob([generatedBc3Content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("Presupuesto BC3 descargado.");
  };
  
  const resetProcess = () => {
      setCurrentStep(0);
      setUploadedFile(null);
      setExtractedData(null);
      setOptimizedBudget(null);
      setProcessing(false);
      setAuditReport(null); // <-- Limpiar estado de auditoría
      setIsAuditing(false); // <-- Limpiar estado de auditoría
      setGeneratedBc3Content(''); // Limpiar contenido BC3 generado
  };

  const remainingBudgets = maxBudgets - usedBudgets;
  const progressPercentage = maxBudgets > 0 ? (usedBudgets / maxBudgets) * 100 : 0;
  
  const renderStepContent = () => {
      switch(currentStep) {
        case 0: // Upload step
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
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">Sube tu presupuesto de partidas de obra</h3>
                      <p className="text-slate-600 mb-6">Arrastra y suelta o haz clic para seleccionar</p>
                      <p className="text-sm text-slate-500 mb-6">Formatos: PDF, Excel, BC3</p>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} disabled={remainingBudgets <= 0} />
                      <button onClick={() => remainingBudgets > 0 && fileInputRef.current?.click()} disabled={remainingBudgets <= 0} className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 transition-all duration-300 transform disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg">
                        {remainingBudgets <= 0 ? 'Límite Alcanzado' : 'Seleccionar Archivo'}
                      </button>
                    </div>
                </div>
            );
        case 1: // Processing step
            return (
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-2xl font-semibold text-slate-800 mb-2">Analizando con IA...</h3>
                    <p className="text-slate-600">Extrayendo partidas y auditando posibles errores.</p>
                </div>
            );
        case 2: // Review step
            return (
                extractedData && <div>
                    {/* --- SECCIÓN 1: TÍTULO Y TABLA DE EDICIÓN --- */}
                    <div className="text-center mb-8">
                        <Edit className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-semibold text-slate-800 mb-2">Revisa y Edita las Partidas</h3>
                        <p className="text-slate-600">Asegúrate de que los datos extraídos son correctos. Puedes editar, añadir o eliminar cualquier partida.</p>
                    </div>

                    <div className="mb-6">
                        <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
                          <label className="text-sm font-medium text-slate-700">
                            Rentabilidad (€/h)
                            <input type="number" min={0} step={1} value={targetRate} onChange={e => setTargetRate(+e.target.value || 0)} className="mt-1 w-24 px-3 py-1 border rounded-md text-center focus:ring-2 focus:ring-blue-400"/>
                          </label>
                          <label className="text-sm font-medium text-slate-700">
                            Margen material %
                            <input type="number" min={0} step={1} value={materialsMargin} onChange={e => setMaterialsMargin(+e.target.value || 0)} className="mt-1 w-24 px-3 py-1 border rounded-md text-center focus:ring-2 focus:ring-blue-400"/>
                          </label>
                        </div>
                        <div className="space-y-2 bg-slate-50 p-4 rounded-lg border max-h-[50vh] overflow-y-auto shadow-inner">
                            <div className="grid grid-cols-11 gap-3 items-center rounded-t-md bg-slate-100 text-xs font-semibold text-slate-600 px-3 py-2">
                              <span className="col-span-11 md:col-span-6">Descripción</span>
                              <span className="col-span-3 md:col-span-2 text-center">Cantidad</span>
                              <span className="col-span-3 md:col-span-1 text-center">Unidad</span>
                              <span className="col-span-2 md:col-span-2" />
                            </div>
                            {extractedData.items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-11 gap-3 items-center bg-white p-3 rounded-md shadow-sm">
                                    <input type="text" value={item.description} onChange={(e) => handleExtractedDataChange(index, 'description', e.target.value)} className="col-span-11 md:col-span-6 p-2 border rounded-md focus:ring-2 focus:ring-blue-400" />
                                    <input type="number" value={item.quantity} onChange={(e) => handleExtractedDataChange(index, 'quantity', e.target.value)} className="col-span-3 md:col-span-2 p-2 border rounded-md text-center focus:ring-2 focus:ring-blue-400" />
                                    <input type="text" value={item.unit} onChange={(e) => handleExtractedDataChange(index, 'unit', e.target.value)} className="col-span-3 md:col-span-1 p-2 border rounded-md text-center focus:ring-2 focus:ring-blue-400" />
                                    <button onClick={() => handleRemoveItem(item.id)} className="col-span-2 md:col-span-2 text-red-500 hover:text-red-700 flex justify-center items-center"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                         <div className="text-center mt-4">
                          <button onClick={handleAddItem} className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                            <span className="mr-1">+ Añadir partida</span>
                          </button>
                        </div>
                    </div>

                    {/* --- SECCIÓN 2: INFORME DE AUDITORÍA --- */}
                    <div className="mt-12">
                         <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-amber-600 mr-4" />
                                <h3 className="text-2xl font-semibold text-amber-900">Informe de Auditoría IA</h3>
                            </div>
                            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-amber-900 prose-p:text-slate-700 prose-ul:text-slate-600 prose-li:my-1.5 prose-strong:text-slate-800 bg-white/60 rounded-lg p-4 border border-amber-200 shadow-inner">
                                {isAuditing ? (
                                    <div className="flex items-center justify-center h-40">
                                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                                    </div>
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {auditReport || "*No se han encontrado errores o incoherencias en el presupuesto.*"}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-10">
                        <button onClick={handleConfirmAndOptimize} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-xl font-semibold flex items-center mx-auto hover:scale-105 transition-transform shadow-lg text-lg">
                            <Save className="w-6 h-6 mr-3" />
                            Confirmar y Optimizar
                        </button>
                    </div>
                </div>
            );
        // (El resto de los cases permanecen igual)
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
                      <SummaryCard icon={Clock} title="Horas totales" value={optimizedBudget.totalHours.toFixed(2)} colorClass={{gradient:'from-slate-50 to-slate-100',border:'border-slate-200',text:'text-slate-700',mainText:'text-slate-800'}}/>
                      <SummaryCard icon={DollarSign} title="Beneficio estimado" value={`${optimizedBudget.totalProfit.toFixed(2)} €`} colorClass={{gradient:'from-green-50 to-emerald-50',border:'border-green-200',text:'text-green-700',mainText:'text-green-800'}}/>
                      <SummaryCard icon={BarChart3} title="Rentabilidad" value={`${optimizedBudget.profitPerHour.toFixed(2)} €/h`} colorClass={{gradient:'from-orange-50 to-amber-50',border:'border-orange-200',text:'text-orange-700',mainText:'text-orange-800'}}/>
                      
                    </div>
                    <div className="bg-slate-50 rounded-xl overflow-hidden mb-8 border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-slate-700 font-semibold">Código</th>
                              <th className="px-4 py-3 text-left text-slate-700 font-semibold">Descripción</th>
                              <th className="px-4 py-3 text-center text-slate-700 font-semibold">Cantidad</th>
                              <th className="px-4 py-3 text-right text-slate-700 font-semibold">Precio IA</th>
                              <th className="px-4 py-3 text-center text-slate-700 font-semibold">Horas Est.</th>
                              <th className="px-4 py-3 text-right text-slate-700 font-semibold">Rentab. €/h</th>
                              <th className="px-4 py-3 text-right text-slate-700 font-semibold">Material €</th>
                              <th className="px-4 py-3 text-right text-slate-700 font-semibold">Beneficio €</th>
                            </tr>
                          </thead>
                          <tbody>
                            {optimizedBudget.items.map((item, index) => (
                              <React.Fragment key={index}>
                                <tr className="border-t border-slate-200 hover:bg-white transition-colors cursor-pointer" onClick={() => setOpenRow(openRow === index ? null : index)}>
                                  <td className="px-4 py-3 text-slate-800 font-medium">{item.code || '---'}</td>
                                  <td className="px-4 py-3 text-slate-800 font-medium">{item.description}</td>
                                  <td className="px-4 py-3 text-center">{item.quantity} {item.unit}</td>
                                  <td className="px-4 py-3 text-right text-green-600 font-bold">{item.optimizedPrice.toFixed(2)} €</td>
                                  <td className="px-4 py-3 text-center">{item.hoursUnit.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right">{item.rentHour.toFixed(2)} €/h</td>
                                  <td className="px-4 py-3 text-right">{item.materialUnit.toFixed(2)} €</td>
                                  <td className={`px-4 py-3 text-right font-semibold ${item.profitUnit < 0 ? 'text-red-600' : 'text-slate-800'}`}>{item.profitUnit.toFixed(2)} €</td>
                                </tr>
                                {openRow === index && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={8} className="px-4 py-3">
                                      {item.similar && item.similar.length ? (
                                        <div className="space-y-3 text-sm p-4 bg-white rounded-lg border">
                                          <h5 className="font-semibold text-slate-700 mb-2">Partidas similares encontradas:</h5>
                                          {item.similar.map((m, i) => (
                                            <div key={i} className="border-t pt-3 mt-3">
                                              <p><span className="font-semibold">Código:</span> {m.code || '---'}</p>
                                              <p><span className="font-semibold">Descripción:</span> {m.desc || '---'}</p>
                                              <p><span className="font-semibold">Horas unitarias:</span> {m.horas_unit?.toFixed(2)}</p>
                                              <p><span className="font-semibold">Material unitario:</span> {m.material_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold">Rentabilidad unitaria:</span> {m.rentab_hora?.toFixed(2)} €/h</p>
                                              <p><span className="font-semibold">Similitud:</span> {m.similarityPct?.toFixed(2)} %</p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-slate-500 text-center py-4">No se encontraron partidas similares.</p>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => handleDownload('bc3')} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all duration-300 flex items-center shadow-lg"><Download className="w-5 h-5 mr-2" /> Generar Presupuesto en BC3</button>
                    </div>
               </div>
            );
        case 5: // Review BC3 step
            return (
                processing ? (
                    <div className="text-center">
                        <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h3 className="text-2xl font-semibold text-slate-800 mb-2">Generando Presupuesto BC3...</h3>
                        <p className="text-slate-600">Un momento, la IA está creando tu archivo.</p>
                    </div>
                ) : (
                    generatedBc3Content && <div>
                        <div className="text-center mb-8">
                            <Edit className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-slate-800 mb-2">Revisa y Edita el BC3 Generado</h3>
                            <p className="text-slate-600">Puedes hacer ajustes finales antes de descargar el archivo.</p>
                        </div>
                        <div className="mb-6">
                            <textarea
                                className="w-full h-96 p-4 border rounded-lg font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-blue-400"
                                value={generatedBc3Content}
                                onChange={(e) => setGeneratedBc3Content(e.target.value)}
                            />
                        </div>
                        <div className="text-center mt-10">
                            <button onClick={handleDownloadFinalBC3} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-xl font-semibold flex items-center mx-auto hover:scale-105 transition-transform shadow-lg text-lg">
                                <Download className="w-6 h-6 mr-3" />
                                Descargar Presupuesto
                            </button>
                        </div>
                    </div>
                )
            );
        default:
            return null;
      }
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
            <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border-l-4 border-blue-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center">
                    <div className="mr-4"><img src="/logo_corsam.png" alt="Corsam Logo" className="w-16 h-16 object-contain"/></div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800"> CORSAM <span className="text-blue-600">Automatización de Presupuestos mediante IA</span></h1>
                        <p className="text-slate-600">Automatización inteligente para presupuestos de obras</p>
                    </div>
                    </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 w-full sm:w-auto">
                    <div className="text-center">
                    <div className="flex items-center justify-center mb-2"><BarChart3 className="w-5 h-5 text-blue-600 mr-2" /><span className="text-sm font-medium text-slate-600">Uso Mensual</span></div>
                    <div className="text-2xl font-bold text-slate-800 mb-1">{usedBudgets}/{maxBudgets}</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2"><div className={`h-2 rounded-full transition-all duration-300 ${progressPercentage > 80 ? 'bg-red-500' : progressPercentage > 60 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${progressPercentage}%` }} /></div>
                    <div className="text-xs text-slate-500">{remainingBudgets} restantes</div>
                    
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
                <div className="relative max-w-3xl mx-auto flex justify-between items-start">
                    {/* Línea de fondo */}
                    <div className="absolute top-8 left-0 right-0 h-2 bg-slate-300 -z-10"></div>
                    {/* Línea de progreso (crece con los pasos) */}
                    <div
                        className="absolute top-8 left-0 h-2 bg-green-500 transition-all duration-500 -z-10 shadow-md shadow-green-300"
                        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    ></div>

                    {steps.map((step, index) => (
                        <div key={index} className={`flex flex-col items-center text-center w-24 md:w-32 z-10`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 border-2 relative z-20 ${index < currentStep ? 'bg-green-500 border-green-500' : index === currentStep ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-200' : 'bg-white border-slate-300'}`}>
                                {index < currentStep ? <CheckCircle className="w-8 h-8 text-white" /> : <step.icon className={`w-8 h-8 ${index === currentStep ? 'text-white' : 'text-slate-400'}`} />}
                            </div>
                            <p className={`mt-2 font-semibold text-sm transition-colors ${index < currentStep ? 'text-green-600' : index === currentStep ? 'text-blue-600' : 'text-slate-500'}`}>{step.title}</p>
                            <p className="text-xs text-slate-500 hidden md:block">{step.description}</p>
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
                
                </div>
            )}

            <footer className="text-center mt-12 text-slate-500 text-sm">
                <p>© {new Date().getFullYear()} IA4PYMES - Soluciones especializas de inteligencia artificial.</p>
            </footer>
            </div>
        </div>
    </>
  );
};

export default BudgetAutomationTool;
