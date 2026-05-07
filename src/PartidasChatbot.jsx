// src/PartidasChatbot.jsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Sparkles, FileText, ChevronDown, ChevronRight, Trash2, Lightbulb } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CHATBOT_API_URL =
    "https://smzu3mkc29.execute-api.eu-west-1.amazonaws.com/query";

// ╭─────────────────────────────────────────────╮
// │  SOURCE TABLE — Fuentes enriquecidas         │
// ╰─────────────────────────────────────────────╯

const SourcesTable = ({ sources }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-blue-100/50">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2"
            >
                {isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {sources.length} partida{sources.length !== 1 ? 's' : ''} consultada{sources.length !== 1 ? 's' : ''}
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="p-2 text-left font-semibold text-slate-600">Código</th>
                                        <th className="p-2 text-left font-semibold text-slate-600 min-w-[180px]">Descripción</th>
                                        <th className="p-2 text-right font-semibold text-slate-600">Obra</th>
                                        <th className="p-2 text-right font-semibold text-slate-600">Precio/ud</th>
                                        <th className="p-2 text-right font-semibold text-slate-600">Coste/ud</th>
                                        <th className="p-2 text-right font-semibold text-slate-600">Horas</th>
                                        <th className="p-2 text-right font-semibold text-slate-600">Avance</th>
                                        <th className="p-2 text-right font-semibold text-slate-600">Rentab.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sources.map((src, i) => (
                                        <tr key={i} className="border-t border-slate-200 hover:bg-white transition-colors">
                                            <td className="p-2 font-mono text-blue-600 font-semibold">{src.code || '–'}</td>
                                            <td className="p-2 text-slate-700 max-w-[180px]">
                                                <span className="line-clamp-2" title={src.desc}>{src.desc || '–'}</span>
                                            </td>
                                            <td className="p-2 text-right text-slate-500">{src.obra || '–'}</td>
                                            <td className="p-2 text-right font-medium text-slate-800">
                                                {src.venta_unit != null ? `${src.venta_unit.toFixed(2)}€` : '–'}
                                            </td>
                                            <td className="p-2 text-right text-slate-600">
                                                {src.coste_unit != null ? `${src.coste_unit.toFixed(2)}€` : '–'}
                                            </td>
                                            <td className="p-2 text-right text-slate-600">
                                                {src.horas_unit != null ? `${src.horas_unit.toFixed(2)}h` : '–'}
                                            </td>
                                            <td className="p-2 text-right text-slate-600">
                                                {src.avance_pct != null ? `${src.avance_pct.toFixed(0)}%` : '–'}
                                            </td>
                                            <td className="p-2 text-right text-green-600 font-medium">
                                                {src.rentabilidad != null ? `${src.rentabilidad.toFixed(2)}€` : '–'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ╭─────────────────────────────────────────────╮
// │  CALCULATION HIGHLIGHT — Cálculos destacados │
// ╰─────────────────────────────────────────────╯

const CalculationHighlight = ({ text }) => {
    // Detectar tablas de cálculo en el markdown
    const lines = text.split('\n');
    let inCalcTable = false;
    let calcLines = [];
    let beforeLines = [];
    let afterLines = [];

    for (const line of lines) {
        if (line.includes('📊') || line.includes('Cálculo')) {
            inCalcTable = true;
            calcLines.push(line);
        } else if (inCalcTable) {
            if (line.includes('---') || line.includes('|---')) continue;
            if (line.includes('⚠️') || line.includes('Valores orientativos')) {
                inCalcTable = false;
                afterLines.push(line);
            } else {
                calcLines.push(line);
            }
        } else {
            beforeLines.push(line);
        }
    }

    if (!inCalcTable && calcLines.length < 3) return null;

    return (
        <div className="mt-3">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-slate-700 whitespace-pre-line">
                    {beforeLines.join('\n')}
                </div>
                {calcLines.length > 0 && (
                    <div className="mt-3 bg-white rounded-lg border border-blue-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                {calcLines.map((line, i) => {
                                    const cells = line.split('|').filter(c => c.trim());
                                    if (cells.length < 2) return null;
                                    const isTotal = cells.some(c => c.includes('TOTAL') || c.includes('TOTAL'));
                                    return (
                                        <tr key={i} className={`border-t border-slate-100 ${isTotal ? 'bg-blue-50' : ''}`}>
                                            {cells.map((cell, j) => (
                                                <td key={j} className={`p-2 ${j === 0 ? 'text-slate-600' : 'text-right font-medium'} ${isTotal ? 'font-bold text-blue-700' : ''}`}>
                                                    {cell.trim()}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-3 text-xs text-slate-500 italic">
                    {afterLines.join('\n')}
                </div>
            </div>
        </div>
    );
};

// ╭─────────────────────────────────────────────╮
// │  SUGGESTIONS — Sugerencias contextuales     │
// ╰─────────────────────────────────────────────╯

const SUGGESTIONS = [
    { icon: "💰", text: "¿Cuánto cuesta 150 m² de falso techo continuo?", category: "Cálculo" },
    { icon: "🔍", text: "Buscar partida de acometida eléctrica", category: "Búsqueda" },
    { icon: "📊", text: "Comparar partidas de instalación de ascensor", category: "Comparativa" },
    { icon: "⏱️", text: "Rendimiento de alicatado de baño", category: "Rendimiento" },
    { icon: "🏗️", text: "¿Qué incluye la partida de solera de hormigón?", category: "Detalle" },
    { icon: "📈", text: "Partidas con mayor rentabilidad", category: "Análisis" },
];

const PartidasChatbot = () => {
    // ── Estado ──
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('chatbot_messages');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Solo mantener mensajes de las últimas 24h
                const now = Date.now();
                return parsed.filter(m => now - m.timestamp < 86400000);
            }
        } catch {}
        return [{
            id: 'init',
            sender: 'ai',
            text: '¡Hola! Soy **ConstructorIA**, tu consultor experto en partidas de obra. Puedo ayudarte a:\n\n• 🔍 Consultar descripciones y precios\n• 📊 Calcular costes totales (dime la cantidad)\n• 📈 Comparar partidas entre sí\n• 💡 Recomendar opciones según rentabilidad\n\n¿En qué puedo ayudarte?',
            sources: [],
            timestamp: Date.now()
        }];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // ── Persistencia ──
    useEffect(() => {
        try {
            localStorage.setItem('chatbot_messages', JSON.stringify(messages));
        } catch {}
    }, [messages]);

    // ── Scroll ──
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Enviar mensaje ──
    const handleSendMessage = async (e) => {
        e?.preventDefault?.();
        if (!input.trim() || isLoading) return;

        const userMsg = { id: Date.now(), sender: 'user', text: input.trim(), timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const conversation = messages.map(({ sender, text }) => ({ sender, text }));
            const response = await fetch(CHATBOT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMsg.text,
                    conversation,
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.answer || 'No he podido generar una respuesta.',
                sources: data.sources || [],
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error('Error:', error);
            toast.error('No se pudo obtener respuesta. Inténtalo de nuevo.');
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: 'Lo siento, hubo un error al conectar. Por favor, inténtalo más tarde.',
                sources: [],
                timestamp: Date.now(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now(),
            sender: 'ai',
            text: '¡Hola! Soy **ConstructorIA**, tu consultor experto en partidas de obra. ¿En qué puedo ayudarte?',
            sources: [],
            timestamp: Date.now()
        }]);
        localStorage.removeItem('chatbot_messages');
    };

    // ╭─────────────────────────────────────────────╮
    // │  RENDER                                      │
    // ╰─────────────────────────────────────────────╯

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-blue-50/30 rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* ── Header ── */}
            <div className="px-5 py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">ConstructorIA</h2>
                        <p className="text-xs text-slate-500">Consultor de partidas • {messages.filter(m => m.sender === 'user').length} consultas</p>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Limpiar chat"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* ── Mensajes ── */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
                <AnimatePresence>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                        >
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                            )}

                            <div className={`max-w-[85%] md:max-w-[75%] ${msg.sender === 'user' ? 'order-1' : ''}`}>
                                <div className={`p-4 rounded-2xl shadow-sm ${
                                    msg.sender === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-md'
                                        : 'bg-white text-slate-700 rounded-bl-md border border-slate-100'
                                }`}>
                                    <ReactMarkdown
                                        className={`prose prose-sm max-w-none ${msg.sender === 'user' ? 'prose-invert' : ''}`}
                                        remarkPlugins={[remarkGfm]}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                    <CalculationHighlight text={msg.text} />
                                    {msg.sources?.length > 0 && (
                                        <SourcesTable sources={msg.sources} />
                                    )}
                                </div>
                            </div>

                            {msg.sender === 'user' && (
                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <User className="w-4 h-4 text-slate-600" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl rounded-bl-md border border-slate-100 shadow-sm p-4 flex items-center gap-2">
                            <span className="text-sm text-slate-400">Consultando partidas</span>
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 bg-blue-400 rounded-full"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="p-4 bg-white/95 backdrop-blur-sm border-t border-slate-200/80">
                {/* Sugerencias */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                    <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    {SUGGESTIONS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => { setInput(s.text); }}
                            className="flex-shrink-0 flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 text-xs rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition-all"
                        >
                            <span>{s.icon}</span>
                            <span className="truncate max-w-[160px]">{s.text}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregunta sobre partidas, costes o rendimientos..."
                        className="w-full pl-4 pr-14 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-sm text-slate-800 placeholder-slate-400 bg-slate-50 shadow-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-lg hover:scale-105 transition-all disabled:bg-slate-300 disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <motion.div
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PartidasChatbot;
