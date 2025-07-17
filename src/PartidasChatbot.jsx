// src/PartidasChatbot.jsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Sparkles, FileText, CornerDownLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CHATBOT_API_URL =
  "https://smzu3mkc29.execute-api.eu-west-1.amazonaws.com/query";


// Componente para mostrar las fuentes de la respuesta del RAG
const SourcePill = ({ source, index }) => (
    <motion.a
        href="#" // Idealmente, aquí iría un enlace a la fuente o un modal con más detalles.
        onClick={(e) => e.preventDefault()}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }} // Animación más rápida para las fuentes
        className="flex items-center bg-blue-100 hover:bg-blue-200 transition-colors text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full mr-2 mb-2 shadow-sm"
    >
        <FileText className="w-3 h-3 mr-1.5" />
        <span
            className="truncate"
            title={source.desc || ''}
            >
            {source.code || '–'} · {source.venta_unit?.toFixed(2)} €/ {source.unit}
        </span>
    </motion.a>
);

const PartidasChatbot = () => {
    const [messages, setMessages] = useState([
        {
            id: 'init',
            sender: 'ai',
            text: '¡Hola! Soy CorsamIA, tu asistente de IA para partidas de obra. Pregúntame sobre precios, descripciones, o rendimientos y te ayudaré a encontrar la información que necesitas.',
            sources: []
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // conversación completa (= mensajes existentes + el que acabas de añadir)
            const conversationPayload = [...messages, userMessage].map(({ sender, text }) => ({
                sender,
                text,
              }));
            
              const response = await fetch(CHATBOT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: userMessage.text,
                  conversation: conversationPayload,
                }),
            });

            if (!response.ok) {
                throw new Error(`Error en la API: ${response.statusText}`);
            }

            const data = await response.json(); // Se espera una respuesta como { answer: "...", sources: [...] }

            const aiMessage = {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.answer,
                // Asumimos que la API devuelve un array 'sources' con metadatos
                sources: data.sources || []
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error al contactar la IA:", error);
            toast.error('No se pudo obtener una respuesta. Inténtalo de nuevo.');
            const errorMessage = {
                id: Date.now() + 1,
                sender: 'ai',
                text: 'Lo siento, he tenido un problema para conectar con mis servicios. Por favor, inténtalo más tarde.',
                sources: []
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
    }

    const suggestionPrompts = [
        "Precio de U.T. de Falso techo continuo de placas de yeso laminado",
        "¿Qué incluye la partida de acometida eléctrica?",
        "Rendimiento de m2 de alicatado en baño",
        "Detalle de unidad de obra de solera de hormigón"
    ];

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
            {/* Cabecera del Chat */}
            <div className="p-5 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20">
                        <Bot className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Asistente IA de Partidas</h2>
                        <p className="text-sm text-slate-500">Consultando base de datos enriquecida en tiempo real</p>
                    </div>
                </div>
            </div>

            {/* Área de Mensajes */}
            <div className="flex-1 p-6 overflow-y-auto space-y-8 bg-slate-50">
                <AnimatePresence>
                    {messages.map(msg => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <div className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
                                        <Bot className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}

                                <div className={`max-w-xl p-4 rounded-2xl relative ${msg.sender === 'user' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-lg shadow-md' : 'bg-white text-slate-800 rounded-bl-lg shadow-md border border-slate-100'}`}>
                                     <ReactMarkdown
                                        className={`prose prose-sm max-w-none ${msg.sender === 'user' ? 'prose-invert' : ''}`}
                                        remarkPlugins={[remarkGfm]}
                                     >
                                        {msg.text}
                                     </ReactMarkdown>
                                    {msg.sender === 'ai' && msg.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-blue-200/50">
                                            <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center">
                                                <FileText className="w-3.5 h-3.5 mr-2 text-slate-400" /> Fuentes consultadas:
                                            </h4>
                                            <div className="flex flex-wrap -mr-2 -mb-2">
                                                {msg.sources.map((src, i) => <SourcePill key={i} source={src} index={i} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {msg.sender === 'user' && (
                                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-4"
                    >
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
                            <Bot className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="max-w-lg p-4 rounded-2xl bg-white rounded-bl-lg border border-slate-200 shadow-md flex items-center space-x-3">
                            <span className="text-sm text-slate-500 italic">CorsamIA está escribiendo...</span>
                            <motion.div
                                className="w-2 h-2 bg-blue-500 rounded-full"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="w-2 h-2 bg-blue-500 rounded-full"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.7, delay: 0.15, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="w-2 h-2 bg-blue-500 rounded-full"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.7, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input de texto y sugerencias */}
            <div className="p-5 bg-white/95 backdrop-blur-sm border-t border-slate-200/80">

                {/* Sugerencias de prompts */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
                    <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 ml-1" />
                    {suggestionPrompts.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => handleSuggestionClick(prompt)}
                            className="flex-shrink-0 bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-medium rounded-full hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 whitespace-nowrap"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu consulta aquí..."
                        className="w-full pl-5 pr-16 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all text-sm text-slate-800 placeholder-slate-500 shadow-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:scale-105 transition-all duration-300 transform shadow-md disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PartidasChatbot;
