// src/PartidasChatbot.jsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Sparkles, FileText, CornerDownLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

// IMPORTANTE: Reemplaza esta URL por el endpoint de tu API RAG para el chatbot.
const CHATBOT_API_URL = "https://tu-api-gateway-rag.execute-api.eu-west-1.amazonaws.com/prod/query";

// Componente para mostrar las fuentes de la respuesta del RAG
const SourcePill = ({ source, index }) => (
  <motion.a
    href="#" // Idealmente, aquí iría un enlace a la fuente o un modal con más detalles.
    onClick={(e) => e.preventDefault()}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    className="flex items-center bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-medium px-3 py-1.5 rounded-full mr-2 mb-2"
  >
    <FileText className="w-3 h-3 mr-1.5" />
    <span>{source.name || 'Fuente Desconocida'}</span>
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
      // --- Llamada a la API del Chatbot RAG ---
      const response = await fetch(CHATBOT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
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
      // Opcional: enviar directamente el mensaje
      // handleSendMessage({ preventDefault: () => {} });
  }

  const suggestionPrompts = [
    "Precio de U.T. de Falso techo continuo de placas de yeso laminado",
    "¿Qué incluye la partida de acometida eléctrica?",
    "Rendimiento de m2 de alicatado en baño"
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl shadow-inner border border-slate-200">
      {/* Cabecera del Chat */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mr-4">
                <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">Asistente IA de Partidas</h2>
                <p className="text-sm text-slate-500">Consulta en tiempo real nuestra base de datos enriquecida</p>
            </div>
        </div>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`flex items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                
                <div className={`max-w-lg p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-white text-slate-800 rounded-bl-lg border border-slate-200'}`}>
                  <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  {msg.sender === 'ai' && msg.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-500 mb-2">Fuentes consultadas:</h4>
                        <div className="flex flex-wrap">
                            {msg.sources.map((src, i) => <SourcePill key={i} source={src} index={i} />)}
                        </div>
                      </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
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
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-slate-600" />
              </div>
              <div className="max-w-lg p-4 rounded-2xl bg-white rounded-bl-lg border border-slate-200 flex items-center space-x-2">
                 <motion.div className="w-2 h-2 bg-slate-400 rounded-full" animate={{ scale: [1, 1.2, 1], y: [0, -2, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}/>
                 <motion.div className="w-2 h-2 bg-slate-400 rounded-full" animate={{ scale: [1, 1.2, 1], y: [0, -2, 0] }} transition={{ duration: 0.8, delay: 0.1, repeat: Infinity, ease: "easeInOut" }}/>
                 <motion.div className="w-2 h-2 bg-slate-400 rounded-full" animate={{ scale: [1, 1.2, 1], y: [0, -2, 0] }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}/>
              </div>
            </div>
           </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de texto */}
      <div className="p-4 bg-white/60 backdrop-blur-sm border-t border-slate-200">
        
        {/* Sugerencias de prompts */}
        <div className="flex items-center gap-2 mb-2 px-2">
            <Sparkles className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {suggestionPrompts.map((prompt, i) => (
                <button
                    key={i}
                    onClick={() => handleSuggestionClick(prompt)}
                    className="hidden md:block bg-slate-100 text-slate-600 px-3 py-1 text-xs rounded-full hover:bg-slate-200 transition-colors"
                >
                    {prompt.substring(0, 50)}...
                </button>
            ))}
        </div>

        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta aquí..."
            className="w-full pl-4 pr-14 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition-all duration-300 transform shadow-lg disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? <CornerDownLeft className="w-5 h-5 animate-ping" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PartidasChatbot;