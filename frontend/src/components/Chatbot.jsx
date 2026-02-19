import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Heart, User, Sparkles, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "¡Hola! Soy el asistente virtual de Creaciones Rosa Elena. ¿En qué puedo ayudarte hoy?", sender: 'bot' }
    ]);
    const messagesEndRef = useRef(null);

    const whatsappNumber = "584127827734";

    const faqs = [
        { q: "¿Qué productos venden?", a: "Vendemos lazos premium, piñatas personalizadas, birretes decorados y kits de decoración para fiestas." },
        { q: "¿Hacen pedidos personalizados?", a: "¡Sí! Todo lo que hacemos puede ser personalizado. Solo cuéntanos tu idea." },
        { q: "¿Métodos de pago?", a: "Aceptamos Pago Móvil, Zelle y transferencias bancarias." },
        { q: "¿Ubicación?", a: "Estamos en Valencia, Venezuela. Hacemos entregas personales y envíos." },
        { q: "Hablar con alguien", type: 'whatsapp' }
    ];

    const handleFaqClick = (faq) => {
        if (faq.type === 'whatsapp') {
            const message = encodeURIComponent("Hola, me gustaría recibir información detallada sobre sus productos.");
            window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
            return;
        }

        const newMessages = [
            ...messages,
            { id: Date.now(), text: faq.q, sender: 'user' },
            { id: Date.now() + 1, text: faq.a, sender: 'bot' }
        ];
        setMessages(newMessages);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-20 right-0 w-[350px] max-w-[calc(100vw-40px)] h-[500px] glass rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border-white/40 ring-1 ring-black/5"
                    >
                        {/* Header */}
                        <div className="bg-primary p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Rosa Elena Helper</h3>
                                    <p className="text-[10px] text-white/80">En línea ahora</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-white/30">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.sender === 'user'
                                            ? 'bg-primary text-white shadow-lg rounded-tr-none'
                                            : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* FAQs / Options */}
                        <div className="p-4 bg-white/50 border-t border-white/20 space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Preguntas frecuentes</p>
                            <div className="flex flex-wrap gap-2">
                                {faqs.map((faq, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleFaqClick(faq)}
                                        className={`text-[11px] px-3 py-2 rounded-xl border transition-all active:scale-95 ${faq.type === 'whatsapp'
                                                ? 'bg-green-500/10 border-green-200 text-green-600 hover:bg-green-500 text-white font-bold'
                                                : 'bg-white/80 border-gray-100 text-gray-600 hover:border-primary/30 hover:text-primary'
                                            }`}
                                    >
                                        {faq.type === 'whatsapp' ? (
                                            <span className="flex items-center gap-1.5 line-height-none">
                                                <MessageCircle className="h-3 w-3" /> WhatsApp Ventas
                                            </span>
                                        ) : faq.q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group relative ${isOpen ? 'bg-gray-800 text-white' : 'bg-primary text-white shadow-primary/30'
                    }`}
            >
                {isOpen ? <X className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-dark opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-dark border-2 border-white"></span>
                    </span>
                )}
            </button>
        </div>
    );
};

export default Chatbot;
