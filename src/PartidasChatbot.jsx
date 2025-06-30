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
        className="flex items-center bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mr-2 mb-2 shadow-sm"
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
            text: '¡Hola! Soy tu asistente de IA para partidas de obra. Pregúntame sobre precios, descripciones, o rendimientos y te ayudaré a encontrar la información que necesitas.',
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
        // Opcional: enviar directamente el mensaje si se desea
        // handleSendMessage({ preventDefault: () => {} });
    }

    const suggestionPrompts = [
        "Precio de U.T. de Falso techo continuo de placas de yeso laminado",
        "¿Qué incluye la partida de acometida eléctrica?",
        "Rendimiento de m2 de alicatado en baño",
        "Detalle de unidad de obra de solera de hormigón"
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Cabecera del Chat */}
            <div className="p-6 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
                <div className="flex items-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center mr-4 shadow-md">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">Asistente IA de Partidas</h2>
                        <p className="text-md text-slate-500 mt-1">Consulta en tiempo real nuestra base de datos enriquecida</p>
                    </div>
                </div>
            </div>

            {/* Área de Mensajes */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
                <AnimatePresence>
                    {messages.map(msg => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <div className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <Bot className="w-5 h-5 text-slate-600" />
                                    </div>
                                )}

                                <div className={`max-w-xl p-4 rounded-3xl shadow-lg relative ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`}>
                                    <ReactMarkdown
                                      className="prose prose-sm max-w-none text-sm"
                                      remarkPlugins={[remarkGfm]}
                                    >
                                      {msg.text}
                                    </ReactMarkdown>
                                    {msg.sender === 'ai' && msg.sources.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200/60">
                                            <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center">
                                                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Fuentes consultadas:
                                            </h4>
                                            <div className="flex flex-wrap -mr-2 -mb-2">
                                                {msg.sources.map((src, i) => <SourcePill key={i} source={src} index={i} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {msg.sender === 'user' && (
                                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <User className="w-5 h-5 text-white" />
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
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="max-w-lg p-4 rounded-3xl bg-white rounded-bl-none border border-slate-200 shadow-lg flex items-center space-x-2">
                                <motion.div
                                    className="w-2.5 h-2.5 bg-slate-400 rounded-full"
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <motion.div
                                    className="w-2.5 h-2.5 bg-slate-400 rounded-full"
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ duration: 0.6, delay: 0.1, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <motion.div
                                    className="w-2.5 h-2.5 bg-slate-400 rounded-full"
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ duration: 0.6, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input de texto y sugerencias */}
            <div className="p-6 bg-white/90 backdrop-blur-sm border-t border-slate-200">

                {/* Sugerencias de prompts */}
                <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
                    <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 ml-1" />
                    {suggestionPrompts.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => handleSuggestionClick(prompt)}
                            className="flex-shrink-0 bg-blue-50 text-blue-700 px-4 py-2 text-sm rounded-full hover:bg-blue-100 transition-all duration-200 shadow-sm whitespace-nowrap"
                        >
                            {prompt} <CornerDownLeft className="inline-block w-3 h-3 ml-2 -mt-0.5 text-blue-400" />
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu consulta aquí..."
                        className="w-full pl-5 pr-16 py-3.5 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-base text-slate-800 placeholder-slate-400 shadow-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:scale-105 transition-all duration-300 transform shadow-lg disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PartidasChatbot;