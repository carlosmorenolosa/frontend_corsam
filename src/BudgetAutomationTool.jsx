import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Upload, Zap, Download, CheckCircle, AlertCircle, Loader2, Bot, 
  Clock, Package, BarChart3, DollarSign, Edit, Save, 
  Trash2, AlertTriangle
} from 'lucide-react';

const API_URL = "https://0s0y566haf.execute-api.eu-west-1.amazonaws.com/extract";
const OPTIMIZE_URL = "https://3um7hhwzzt5iirno6sopnszs3m0ssdlb.lambda-url.eu-west-1.on.aws/";
const AUDIT_URL = "https://7eua2ajhxbw74cncp4bzqchg7e0pvvdk.lambda-url.eu-west-1.on.aws/";
const GENERATE_BC3_URL = "https://l4c4t3gfaxry2ikqsz5zu6j6mq0ojcjp.lambda-url.eu-west-1.on.aws/";
const USAGE_URL = "https://5b2qs6vmcknnztrwfpgrvrkm6u0gtimg.lambda-url.eu-west-1.on.aws/";

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
  const [maxBudgets, setMaxBudgets] = useState(20);
  const fileInputRef = useRef(null);
  const [openRow, setOpenRow] = useState(null);
  const [targetRate, setTargetRate] = useState(50);
  const [materialsMargin, setMaterialsMargin] = useState(30);
  const [generatedBc3Content, setGeneratedBc3Content] = useState('');
  const [globalTargetRate, setGlobalTargetRate] = useState(50);
  const [globalMaterialsMargin, setGlobalMaterialsMargin] = useState(30);
  
  const [auditReport, setAuditReport] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch(USAGE_URL);
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
    { title: 'Subir Archivo', icon: Upload },
    { title: 'Análisis IA', icon: Bot },
    { title: 'Revisar y Editar', icon: Edit },
    { title: 'Optimización IA', icon: Zap },
    { title: 'Generar BC3', icon: Package },
    { title: 'Descargar', icon: Download }
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
    setUploadedFile(file);
    setCurrentStep(1);
    setProcessing(true);
    setIsAuditing(true);
    toast.loading("Analizando presupuesto con IA...");

    try {
      let extractedText = "";
      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
        const reader = new FileReader();
        reader.onload = async (event) => {
          const typedarray = new Uint8Array(event.target.result);
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(event.target.result) }).promise;
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
      const auditResponse = await fetch(AUDIT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: content,
      });
      if (!auditResponse.ok) throw new Error(`La auditoría falló: ${auditResponse.statusText}`);
      const auditResultRaw = await auditResponse.json();
      const auditResult = typeof auditResultRaw.body === 'string' ? JSON.parse(auditResultRaw.body) : auditResultRaw;
      setAuditReport(auditResult.auditReport);
      setIsAuditing(false);

      toast.loading("Extrayendo partidas del presupuesto...");
      const extractionResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: content,
      });
      if (!extractionResponse.ok) throw new Error(`La extracción falló: ${extractionResponse.statusText}`);
      const extractionResultRaw = await extractionResponse.json();
      const extractionResult = typeof extractionResultRaw.body === 'string' ? JSON.parse(extractionResultRaw.body) : extractionResultRaw;

      toast.dismiss();
      toast.success("Análisis completado.");
      
      if (!Array.isArray(extractionResult.items)) {
        console.error("API Error: extractionResult.items is not an array", extractionResult);
        throw new Error("La respuesta de la API de extracción no es válida.");
      }

      const itemsWithIds = extractionResult.items.map((item, index) => ({ ...item, id: index + 1, targetRate: 50, materialsMargin: 30 }));
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

  const handleSetAll = () => {
    if (!extractedData) return;
    const newItems = extractedData.items.map(item => ({
      ...item,
      targetRate: globalTargetRate,
      materialsMargin: globalMaterialsMargin
    }));
    setExtractedData({ ...extractedData, items: newItems });
    toast.success("Valores aplicados a todas las partidas.");
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
        body: JSON.stringify({ items: extractedData.items }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          toast.dismiss();
          toast.error(errorData.message || "Límite de uso mensual alcanzado.", { duration: 4000 });
          resetProcess();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      toast.dismiss();
      toast.success("¡Presupuesto optimizado!");
      const totalMaterial = data.items.reduce((acc, item) => acc + tot(item, 'materialUnit'), 0);
      const totalSubcontract = data.items.reduce((acc, item) => acc + tot(item, 'contrataUnit'), 0);

      setOptimizedBudget({
        items: data.items,
        totalOriginal: data.totalOriginal,
        totalOptimized: data.totalOptimized,
        totalSavings: data.totalSavings,
        savingsPercentage: data.savingsPercent,
        totalHours: data.totalHours,
        totalProfit: data.totalProfit,
        profitPerHour: data.profitPerHour,
        totalMaterial: totalMaterial,
        totalSubcontract: totalSubcontract,
      });
      setCurrentStep(4);
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

  const handleOptimizedDataChange = (index, field, value) => {
    setOptimizedBudget(prev => {
        const newBudget = JSON.parse(JSON.stringify(prev));
        const item = newBudget.items[index];
        const numValue = parseFloat(value) || 0;

        if (field === 'description' || field === 'unit' || field === 'code') {
            item[field] = value;
        } 
        else if (field === 'quantity') {
            item.quantity = numValue;
        }
        else if (field === 'targetRate') {
            item.targetRate = numValue;
            const hours_med = item.hoursUnit || 0;
            const rate = numValue;
            const mat_med = item.materialUnit || 0;
            const subc_med = item.contrataUnit || 0;
            const margin = item.materialsMargin || 0;
            
            const precio_obj = hours_med * rate + (mat_med + subc_med) * (1 + margin / 100);
            item.optimizedPrice = precio_obj;
        }
        else {
            if (item.quantity !== 0) {
                const unitFieldMap = {
                    'optimizedPriceTotal': 'optimizedPrice',
                    'hoursUnitTotal': 'hoursUnit',
                    'materialUnitTotal': 'materialUnit',
                    'contrataUnitTotal': 'contrataUnit',
                    'manoObraUnitTotal': 'manoObraUnit'
                };
                const unitField = unitFieldMap[field];
                if (unitField) {
                    item[unitField] = numValue / item.quantity;
                }
            }
        }

        item.costTotalUnit = (item.materialUnit || 0) + (item.contrataUnit || 0) + (item.manoObraUnit || 0);
        item.profitUnit = (item.optimizedPrice || 0) - item.costTotalUnit;

        let totalOptimized = 0;
        let totalHours = 0;
        let totalProfit = 0;

        newBudget.items.forEach(i => {
            const quantity = i.quantity || 0;
            totalOptimized += (i.optimizedPrice || 0) * quantity;
            totalHours += (i.hoursUnit || 0) * quantity;
            totalProfit += (i.profitUnit || 0) * quantity;
        });
        
        const totalOriginal = newBudget.totalOriginal;
        const totalSavings = totalOriginal - totalOptimized;
        const savingsPercentage = totalOriginal > 0 ? (totalSavings / totalOriginal) * 100 : 0;
        const totalSubcontract = newBudget.items.reduce((acc, item) => acc + ((item.contrataUnit || 0) * (item.quantity || 0)), 0);
        const totalMaterial = newBudget.items.reduce((acc, item) => acc + ((item.materialUnit || 0) * (item.quantity || 0)), 0);
        const profitPerHour = totalHours > 0 ? (totalOptimized - totalMaterial - totalSubcontract) / totalHours : 0;

        return {
            ...newBudget,
            items: newBudget.items,
            totalOptimized,
            totalSavings,
            savingsPercentage,
            totalHours,
            totalProfit,
            profitPerHour
        };
    });
  };

  const getHistoricalPrice = (item) => {
    if (!item.similar || item.similar.length === 0) {
      return 0;
    }
    if (item.similar.length === 1) {
      return (item.similar[0].venta_unit || 0) * (item.quantity || 0);
    }
    const prices = item.similar.map(s => s.venta_unit || 0).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const medianUnit = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    return medianUnit * (item.quantity || 0);
  };

  const handleGenerateBC3 = async () => {
    if (!optimizedBudget || !optimizedBudget.items.length) {
      toast.error("No hay presupuesto optimizado para generar BC3.");
      return;
    }
    setCurrentStep(5);
    setProcessing(true);
    toast.loading("Generando archivo BC3...");
    try {
      const itemsToSend = optimizedBudget.items.map(item => ({
        code: item.code || '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        optimizedPrice: item.optimizedPrice,
      }));
      const response = await fetch(GENERATE_BC3_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSend }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      toast.dismiss();
      toast.success("Archivo BC3 generado. Revísalo antes de descargar.");
      setGeneratedBc3Content(data.bc3);
    } catch (e) {
      console.error("Error generating BC3:", e);
      toast.dismiss();
      toast.error("No se pudo generar el archivo BC3.");
      setCurrentStep(4);
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
      setAuditReport(null);
      setIsAuditing(false);
      setGeneratedBc3Content('');
  };

  const remainingBudgets = maxBudgets - usedBudgets;
  const progressPercentage = maxBudgets > 0 ? (usedBudgets / maxBudgets) * 100 : 0;
  const tot = (item, field) => (Number(item[field] || 0) * Number(item.quantity || 0));

  
  const renderStepContent = () => {
      switch(currentStep) {
        case 0: // Upload step
            return (
                <div className="text-center w-full max-w-2xl mx-auto">
                    <div
                      className={`relative border-2 border-dashed rounded-3xl p-10 transition-all duration-300 ${
                        dragActive ? 'border-blue-500 bg-blue-50/80 scale-105 shadow-xl' : 
                        remainingBudgets <= 0 ? 'border-slate-300 bg-slate-100 opacity-60 cursor-not-allowed' :
                        'border-slate-300 hover:border-blue-400 hover:bg-blue-50/80'
                      }`}
                      onDragEnter={remainingBudgets > 0 ? handleDrag : undefined}
                      onDragLeave={remainingBudgets > 0 ? handleDrag : undefined}
                      onDragOver={remainingBudgets > 0 ? handleDrag : undefined}
                      onDrop={remainingBudgets > 0 ? handleDrop : undefined}
                    >
                      <Upload className={`w-14 h-14 mx-auto mb-4 transition-colors ${remainingBudgets <= 0 ? 'text-slate-400' : 'text-blue-500'}`} />
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">Sube tu presupuesto de obra</h3>
                      <p className="text-slate-500 mb-6">Arrastra y suelta o haz clic para seleccionar el archivo</p>
                      <p className="text-xs text-slate-400 mb-6">Formatos soportados: PDF, Excel, BC3</p>
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} disabled={remainingBudgets <= 0} />
                      <button 
                        onClick={() => remainingBudgets > 0 && fileInputRef.current?.click()} 
                        disabled={remainingBudgets <= 0} 
                        className="px-8 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 transition-all duration-300 transform disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-blue-500/30"
                      >
                        {remainingBudgets <= 0 ? 'Límite Alcanzado' : 'Seleccionar Archivo'}
                      </button>
                    </div>
                </div>
            );
        case 1: // Processing step
            return (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-14 h-14 text-blue-500 mx-auto mb-6 animate-spin" />
                    <h3 className="text-2xl font-semibold text-slate-800 mb-2">Analizando con IA...</h3>
                    <p className="text-slate-500 max-w-md">Estamos extrayendo las partidas y auditando el documento en busca de posibles errores. Por favor, espera un momento.</p>
                </div>
            );
        case 2: // Review step
            return (
                extractedData && <div className="w-full">
                    <div className="w-full flex justify-end mb-2">
                        <button onClick={resetProcess} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                            Volver a Inicio
                        </button>
                    </div>
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Edit className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-2">Revisa y Edita las Partidas</h3>
                        <p className="text-slate-500 max-w-2xl mx-auto">Asegúrate de que los datos extraídos son correctos. Puedes editar, añadir o eliminar cualquier partida antes de optimizar.</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Rentabilidad Global (€/h)</label>
                          <input 
                            type="number" 
                            value={globalTargetRate} 
                            onChange={(e) => setGlobalTargetRate(parseFloat(e.target.value) || 0)} 
                            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 transition w-40"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Margen Global Materiales (%)</label>
                          <input 
                            type="number" 
                            value={globalMaterialsMargin} 
                            onChange={(e) => setGlobalMaterialsMargin(parseFloat(e.target.value) || 0)} 
                            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 transition w-40"
                          />
                        </div>
                        <button 
                          onClick={handleSetAll}
                          className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                        >
                          Establecer
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 bg-white p-4 rounded-2xl border max-h-[55vh] overflow-y-auto shadow-inner">
                        <div className="grid grid-cols-12 gap-4 items-center bg-slate-100 text-xs font-semibold text-slate-600 px-4 py-2 rounded-lg sticky top-0 z-10">
                          <span className="col-span-12 md:col-span-5">Descripción</span>
                          <span className="col-span-6 md:col-span-1 text-center">Cantidad</span>
                          <span className="col-span-6 md:col-span-1 text-center">Unidad</span>
                          <span className="col-span-6 md:col-span-2 text-center">Rentabilidad (€/h)</span>
                          <span className="col-span-6 md:col-span-2 text-center">Margen Material (%)</span>
                          <span className="col-span-12 md:col-span-1 text-right">Acciones</span>
                        </div>
                        {extractedData.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50/80 p-3 rounded-lg">
                                <textarea value={item.description} onChange={(e) => handleExtractedDataChange(index, 'description', e.target.value)} className="col-span-12 md:col-span-5 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 transition" rows="3"></textarea>
                                <input type="number" value={item.quantity} onChange={(e) => handleExtractedDataChange(index, 'quantity', e.target.value)} className="col-span-6 md:col-span-1 p-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-400 transition" />
                                <input type="text" value={item.unit} onChange={(e) => handleExtractedDataChange(index, 'unit', e.target.value)} className="col-span-6 md:col-span-1 p-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-400 transition" />
                                <input type="number" value={item.targetRate} onChange={(e) => handleExtractedDataChange(index, 'targetRate', e.target.value)} className="col-span-6 md:col-span-2 p-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-400 transition" />
                                <input type="number" value={item.materialsMargin} onChange={(e) => handleExtractedDataChange(index, 'materialsMargin', e.target.value)} className="col-span-6 md:col-span-2 p-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-400 transition" />
                                <div className="col-span-12 md:col-span-1 flex justify-end items-center">
                                  <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="text-center mt-4">
                      <button onClick={handleAddItem} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        + Añadir Partida
                      </button>
                    </div>

                    <div className="mt-12">
                         <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-4">
                                  <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-amber-900">Informe de Auditoría IA</h3>
                            </div>
                            <div className="bg-white/60 rounded-lg p-4 border border-amber-200/80 shadow-inner">
                                {isAuditing ? (
                                    <div className="flex items-center justify-center h-40 text-slate-500">
                                        <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                                        <span>Auditando...</span>
                                    </div>
                                ) : (
                                    <ReactMarkdown 
                                        className="prose prose-sm max-w-none prose-p:text-slate-700 prose-ul:text-slate-600 prose-li:my-1.5 prose-strong:text-slate-800"
                                        remarkPlugins={[remarkGfm]}
                                    >
                                        {auditReport || "*No se han encontrado errores o incoherencias destacables en el presupuesto.*"}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-10">
                        <button onClick={handleConfirmAndOptimize} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-10 py-4 rounded-lg font-semibold flex items-center mx-auto hover:scale-105 transition-transform shadow-lg hover:shadow-green-500/30 text-base">
                            <Save className="w-5 h-5 mr-3" />
                            Confirmar y Optimizar
                        </button>
                    </div>
                </div>
            );
        case 3:
             return (
                <div className="text-center flex flex-col items-center justify-center h-full">
                     <Loader2 className="w-14 h-14 text-blue-500 mx-auto mb-6 animate-spin" />
                     <h3 className="text-2xl font-semibold text-slate-800 mb-2">Optimizando Presupuesto...</h3>
                     <p className="text-slate-500 max-w-md">Estamos consultando nuestra base de datos de precios y proveedores para encontrar las mejores opciones para tu proyecto.</p>
                </div>
            );
        case 4: {
            if (!optimizedBudget) return null;

            const totalSubcontract = optimizedBudget.items.reduce((acc, item) => acc + tot(item, 'contrataUnit'), 0);
            const totalMaterial = optimizedBudget.items.reduce((acc, item) => acc + tot(item, 'materialUnit'), 0);
            const totalHours = optimizedBudget.items.reduce((acc, item) => acc + tot(item, 'hoursUnit'), 0);
            const totalProfit = optimizedBudget.items.reduce((acc, item) => acc + tot(item, 'profitUnit'), 0);
            const netProfitability = totalHours > 0 ? (optimizedBudget.totalOptimized - totalSubcontract - totalMaterial) / totalHours : 0;

            return (
               <div>
                    <div className="w-full flex justify-end mb-2">
                        <button onClick={resetProcess} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                            Volver a Inicio
                        </button>
                    </div>
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-9 h-9" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-2">¡Presupuesto Optimizado!</h3>
                        <p className="text-slate-500 max-w-2xl mx-auto">Hemos encontrado las mejores opciones para tu proyecto. Revisa los resultados y genera el archivo BC3.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                      <SummaryCard icon={Zap} title="Precio Total Presupuesto" value={`${optimizedBudget.totalOptimized.toFixed(2)} €`} colorClass={{gradient:'from-purple-50 to-violet-50',border:'border-purple-200/80',text:'text-purple-700',mainText:'text-purple-800'}}/>
                      <SummaryCard icon={Package} title="Total Subcontrata" value={`${totalSubcontract.toFixed(2)} €`} colorClass={{gradient:'from-orange-50 to-amber-50',border:'border-orange-200/80',text:'text-orange-700',mainText:'text-orange-800'}}/>
                      <SummaryCard icon={Package} title="Total Material" value={`${totalMaterial.toFixed(2)} €`} colorClass={{gradient:'from-yellow-50 to-lime-50',border:'border-yellow-200/80',text:'text-yellow-700',mainText:'text-yellow-800'}}/>
                      <SummaryCard icon={Clock} title="Horas totales" value={totalHours.toFixed(2)} colorClass={{gradient:'from-slate-50 to-slate-100',border:'border-slate-200/80',text:'text-slate-600',mainText:'text-slate-800'}}/>
                      <SummaryCard icon={DollarSign} title="Beneficio estimado" value={`${totalProfit.toFixed(2)} €`} colorClass={{gradient:'from-green-50 to-emerald-50',border:'border-green-200/80',text:'text-green-700',mainText:'text-green-800'}}/>
                      <SummaryCard icon={BarChart3} title="Rentabilidad Neta" value={`${netProfitability.toFixed(2)} €/h`} colorClass={{gradient:'from-blue-50 to-cyan-50',border:'border-blue-200/80',text:'text-blue-700',mainText:'text-blue-800'}}/>
                    </div>
                    <div className="bg-white rounded-2xl overflow-hidden mb-8 border border-slate-200/80">
                      <div className="overflow-x-auto max-h-[70vh]">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100/80 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 font-semibold text-slate-600">Código</th>
                              <th className="px-4 py-3 font-semibold text-slate-600">Descripción</th>
                              <th className="px-4 py-3 text-center font-semibold text-slate-600">Cant.</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Precio Histórico (total)</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Precio IA (total)</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Precio/Ud.</th>
                              <th className="px-4 py-3 text-center font-semibold text-slate-600">Horas est. totales</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Coste/Hora Mano Obra</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Material € (total)</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Subcontrata € (total)</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Mano de Obra € (total)</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Coste Total € (total)</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Rentabilidad €/h</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-600">Beneficio € (total)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {optimizedBudget.items.map((item, index) => (
                              <React.Fragment key={index}>
                                <tr className="border-t border-slate-200/80 hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setOpenRow(openRow === index ? null : index)}>
                                  <td className="px-4 py-3 text-slate-700 font-medium"><input type="text" value={item.code || '---'} onChange={(e) => handleOptimizedDataChange(index, 'code', e.target.value)} className="w-full bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400"/></td>
                                  <td className="px-4 py-3 text-slate-700 font-medium">{item.description}</td>
                                  <td className="px-4 py-3 text-center text-slate-600"><input type="number" value={item.quantity} onChange={(e) => handleOptimizedDataChange(index, 'quantity', e.target.value)} className="w-20 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-center"/> {item.unit}</td>
                                  <td className="px-4 py-3 text-right text-slate-600 font-semibold">
                                    {getHistoricalPrice(item).toFixed(2)} €
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-bold">
                                    <input type="number" value={tot(item,'optimizedPrice').toFixed(2)} onChange={(e) => handleOptimizedDataChange(index, 'optimizedPriceTotal', e.target.value)} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-green-400 text-right font-bold"/>
                                    {item.priceStdDev > 0 && ( <span className="text-xs text-slate-500 font-normal ml-1">(±{item.priceStdDev.toFixed(2)})</span> )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    {(item.optimizedPrice || 0).toFixed(2)} €
                                  </td>
                                  <td className="px-4 py-3 text-center text-slate-600">
                                    <input type="number" value={tot(item,'hoursUnit').toFixed(2)} onChange={(e) => handleOptimizedDataChange(index, 'hoursUnitTotal', e.target.value)} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-center"/>
                                    {item.hoursStdDev > 0 && ( <span className="text-xs text-slate-500 font-normal ml-1">(±{item.hoursStdDev.toFixed(2)})</span> )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    <input type="number" value={(tot(item, 'hoursUnit') > 0 ? (tot(item, 'manoObraUnit') / tot(item, 'hoursUnit')) : 0).toFixed(2)} onChange={(e) => { const newCosteHora = parseFloat(e.target.value) || 0; const totalHours = tot(item, 'hoursUnit'); const newManoObraTotal = newCosteHora * totalHours; handleOptimizedDataChange(index, 'manoObraUnitTotal', newManoObraTotal); }} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-right"/>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    <input type="number" value={tot(item,'materialUnit').toFixed(2)} onChange={(e) => handleOptimizedDataChange(index, 'materialUnitTotal', e.target.value)} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-right"/>
                                    {item.materialStdDev > 0 && ( <span className="text-xs text-slate-500 font-normal ml-1">(±{item.materialStdDev.toFixed(2)})</span> )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    <input type="number" value={tot(item,'contrataUnit').toFixed(2)} onChange={(e) => handleOptimizedDataChange(index, 'contrataUnitTotal', e.target.value)} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-right"/>
                                    {item.contrataStdDev > 0 && ( <span className="text-xs text-slate-500 font-normal ml-1">(±{item.contrataStdDev.toFixed(2)})</span> )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    <input type="number" value={tot(item,'manoObraUnit').toFixed(2)} onChange={(e) => handleOptimizedDataChange(index, 'manoObraUnitTotal', e.target.value)} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-right"/>
                                    {item.manoStdDev > 0 && ( <span className="text-xs text-slate-500 font-normal ml-1">(±{item.manoStdDev.toFixed(2)})</span> )}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                    {tot(item,'costTotalUnit').toFixed(2)} €
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    <input type="number" value={item.targetRate.toFixed(2)} onChange={(e) => handleOptimizedDataChange(index, 'targetRate', e.target.value)} className="w-24 bg-transparent p-1 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-400 text-right"/>
                                  </td>
                                  <td className={`px-4 py-3 text-right font-semibold ${ item.profitUnit < 0 ? 'text-red-500' : 'text-slate-700' }`}>
                                    {tot(item,'profitUnit').toFixed(2)} €
                                    {item.profitStdDev > 0 && ( <span className="text-xs text-slate-500 font-normal ml-1">(±{item.profitStdDev.toFixed(2)})</span> )}
                                  </td>
                                </tr>
                                {openRow === index && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={14} className="p-4">
                                      {item.similar && item.similar.length > 0 && (
                                        <div className="mt-4 space-y-3 text-xs p-4 bg-white rounded-lg border border-slate-200">
                                          <h5 className="font-semibold text-slate-700 mb-2">
                                            Partidas similares encontradas:
                                            <em className="text-slate-500 ml-2 font-normal">(basado en {item.k_used} partidas)</em>
                                          </h5>
                                          {item.similar.map((m, i) => (
                                            <div key={i} className="border-t pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
                                              <p><span className="font-semibold text-slate-600">Descripción:</span> {m.desc || 'N/A'}</p>
                                              <p><span className="font-semibold text-slate-600">Código:</span> {m.code || 'N/A'}</p>
                                              <p><span className="font-semibold text-slate-600">Precio Histórico:</span> {m.venta_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold">Beneficio Histórico:</span> {m.profit_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold text-slate-600">Horas:</span> {m.horas_unit?.toFixed(2)}</p>
                                              <p><span className="font-semibold text-slate-600">Material:</span> {m.material_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold text-slate-600">Subcontrata:</span> {m.contrata_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold text-slate-600">Mano Obra:</span> {m.mano_obra_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold text-slate-600">Coste Total:</span> {m.coste_unit?.toFixed(2)} €</p>
                                              <p><span className="font-semibold text-slate-600">Similitud:</span> {m.similarityPct?.toFixed(2)} %</p>
                                            </div>
                                          ))}
                                        </div>
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
                        <button onClick={() => handleGenerateBC3()} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-all duration-300 flex items-center shadow-lg hover:shadow-blue-500/30"><Package className="w-5 h-5 mr-2" /> Generar Presupuesto en BC3</button>
                    </div>
               </div>
            );
        }
        case 5: // Review BC3 step
            return (
                processing ? (
                    <div className="text-center flex flex-col items-center justify-center h-full">
                        <Loader2 className="w-14 h-14 text-blue-500 mx-auto mb-6 animate-spin" />
                        <h3 className="text-2xl font-semibold text-slate-800 mb-2">Generando Presupuesto BC3...</h3>
                        <p className="text-slate-500 max-w-md">Un momento, la IA está creando tu archivo con el formato estándar.</p>
                    </div>
                ) : (
                    generatedBc3Content && <div>
                        <div className="w-full flex justify-end mb-2">
                            <button onClick={resetProcess} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                Volver a Inicio
                            </button>
                        </div>
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8" />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800 mb-2">Revisa el BC3 Generado</h3>
                            <p className="text-slate-500 max-w-2xl mx-auto">Puedes hacer ajustes finales en el texto antes de descargar el archivo. Este contenido tiene el formato estándar BC3.</p>
                        </div>
                        <div className="mb-6">
                            <textarea
                                className="w-full h-96 p-4 border border-slate-300 rounded-lg font-mono text-xs bg-slate-50/80 focus:ring-2 focus:ring-blue-400 transition"
                                value={generatedBc3Content}
                                onChange={(e) => setGeneratedBc3Content(e.target.value)}
                            />
                        </div>
                        <div className="text-center mt-8">
                            <button onClick={handleDownloadFinalBC3} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-10 py-4 rounded-lg font-semibold flex items-center mx-auto hover:scale-105 transition-transform shadow-lg hover:shadow-green-500/30 text-base">
                                <Download className="w-5 h-5 mr-3" />
                                Descargar Archivo .BC3
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
      <div className="max-w-7xl mx-auto">
        {/* Header and Usage Counter */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-blue-500/10 rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center">
                  <div className="mr-5 hidden sm:block"><img src="/logo_corsam.png" alt="Corsam Logo" className="w-16 h-auto object-contain"/></div>
                  <div>
                      <h1 className="text-2xl font-bold text-slate-800">Automatización de Presupuestos</h1>
                      <p className="text-slate-500">Sube un archivo para analizar, optimizar y generar un presupuesto en formato BC3.</p>
                  </div>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 w-full sm:w-auto flex-shrink-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-slate-600">Uso Mensual</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-2">{usedBudgets} / {maxBudgets}</div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${progressPercentage > 80 ? 'bg-red-500' : progressPercentage > 60 ? 'bg-orange-500' : 'bg-blue-500'}`} 
                        style={{ width: `${progressPercentage}%` }} 
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-2">{remainingBudgets} restantes</div>
                  </div>
              </div>
            </div>
        </div>

        {/* Usage Limit Alerts */}
        {remainingBudgets <= 5 && remainingBudgets > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-8 flex items-center text-orange-800">
              <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold">¡Atención!</p>
                <p className="text-sm">Solo te quedan {remainingBudgets} presupuestos este mes.</p>
              </div>
            </div>
        )}
        {remainingBudgets <= 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex items-center text-red-800">
              <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold">Límite Alcanzado</p>
                <p className="text-sm">Has usado todos tus presupuestos. Contacta con Corsam para ampliar tu plan.</p>
              </div>
            </div>
        )}

        {/* Stepper */}
        <div className="mb-12">
            <div className="relative max-w-4xl mx-auto">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-slate-200" />
                <div
                    className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-500"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />
                <div className="relative flex justify-between items-center">
                  {steps.map((step, index) => (
                      <div key={index} className="flex flex-col items-center text-center z-10">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4 relative ${
                            index < currentStep ? 'bg-green-500 border-green-500/30' : 
                            index === currentStep ? 'bg-blue-500 border-blue-500/30 scale-110 shadow-lg shadow-blue-500/30' : 
                            'bg-white border-slate-300'
                          }`}>
                              {index < currentStep ? <CheckCircle className="w-6 h-6 text-white" /> : <step.icon className={`w-6 h-6 ${index === currentStep ? 'text-white' : 'text-slate-400'}`} />}
                          </div>
                          <p className={`mt-3 font-semibold text-xs transition-colors ${
                            index < currentStep ? 'text-green-600' : 
                            index === currentStep ? 'text-blue-600' : 
                            'text-slate-500'
                          }`}>{step.title}</p>
                      </div>
                  ))}
                </div>
            </div>
        </div>
        
        {/* Main Step Container */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 shadow-2xl shadow-blue-500/10 rounded-3xl p-6 sm:p-10 min-h-[450px] flex items-center justify-center">
            <AnimatePresence mode="wait">
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
            >
                {renderStepContent()}
            </motion.div>
            </AnimatePresence>
        </div>

        <footer className="text-center mt-10 text-slate-400 text-xs">
            <p>© {new Date().getFullYear()} IA4PYMES - Soluciones especializas de inteligencia artificial.</p>
        </footer>
      </div>
    </>
  );
};

export default BudgetAutomationTool;