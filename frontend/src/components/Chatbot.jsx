import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Heart, User, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../utils/api';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "¡Hola! Soy el asistente virtual de Creaciones Rosa Elena. ¿En qué puedo ayudarte hoy?", sender: 'bot' }
    ]);
    const [products, setProducts] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/products`);
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Error fetching products for chatbot:", error);
            }
        };
        fetchProducts();
    }, []);

    const whatsappNumber = "584127827734"; // Actualizar al número real

    const faqs = [
        { q: "¿Qué productos venden?", a: "Vendemos lazos premium, piñatas personalizadas, birretes decorados y kits de decoración para fiestas." },
        { q: "¿Hacen pedidos personalizados?", a: "¡Sí! Todo lo que hacemos puede ser personalizado. Solo cuéntanos tu idea." },
        { q: "¿Métodos de pago?", a: "Aceptamos Pago Móvil, Zelle y transferencias bancarias." },
        { q: "¿Ubicación?", a: "Estamos en Valencia, Venezuela. Hacemos entregas personales y envíos." },
        { q: "Hablar con alguien", type: 'whatsapp' }
    ];

    const handleSendMessage = async (text, isFaq = false, faqAnswer = "") => {
        if (!text.trim()) return;

        const newUserMessage = { id: Date.now(), text: text, sender: 'user' };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        if (isFaq) {
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now() + 1, text: faqAnswer, sender: 'bot' }]);
                setIsTyping(false);
            }, 800);
            return;
        }

        try {
            const historyForBackend = messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'bot',
                content: m.text
            }));

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: historyForBackend
                })
            });

            const data = await response.json();

            // Auto-detect if AI wants to show WhatsApp button
            const needsWhatsapp = data.reply.toLowerCase().includes('whatsapp') ||
                data.reply.toLowerCase().includes('bajo pedido') ||
                data.reply.toLowerCase().includes('escribenos');

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: data.reply,
                sender: 'bot',
                showWhatsAppBtn: needsWhatsapp
            }]);
        } catch (error) {
            console.error("Error al conectar con la IA:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Uy, tuve un pequeño parpadeo intentando conectarme con mi cerebro de IA. 🎀 ¿Podrías repetirlo?",
                sender: 'bot'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleInputSubmit = (e) => {
        e.preventDefault();
        handleSendMessage(inputValue);
    };

    const handleFaqClick = (faq) => {
        if (faq.type === 'whatsapp') {
            const message = encodeURIComponent("Hola, me gustaría recibir información detallada sobre sus productos.");
            window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
            return;
        }

        handleSendMessage(faq.q, true, faq.a);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-16 sm:bottom-20 right-0 w-[calc(100vw-32px)] sm:w-[360px] h-[70vh] sm:h-[550px] glass rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border-white/40 ring-1 ring-black/5 bg-white/50 backdrop-blur-2xl"
                    >
                        {/* Header */}
                        <div className="bg-accent/95 p-5 text-white flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Asistente Virtual</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                                        <p className="text-[10px] text-white/90">En línea</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-white/40">
                            {messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id}
                                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed mb-1 ${msg.sender === 'user'
                                        ? 'bg-accent text-white shadow-md rounded-tr-[4px]'
                                        : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-[4px]'
                                        }`}>
                                        {msg.text}
                                    </div>

                                    {msg.showWhatsAppBtn && (
                                        <motion.button
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            onClick={() => handleFaqClick({ type: 'whatsapp' })}
                                            className="mt-2 mb-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-all hover:scale-105 active:scale-95 border border-green-400"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            Hablar por WhatsApp
                                        </motion.button>
                                    )}
                                </motion.div>
                            ))}
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-[4px] shadow-sm border border-gray-100">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* FAQs / Quick Replies (Horizontal Scroll) */}
                        <div className="px-4 py-3 bg-white/60 border-t border-gray-100 overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2">
                            {faqs.map((faq, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleFaqClick(faq)}
                                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all active:scale-95 inline-block ${faq.type === 'whatsapp'
                                        ? 'bg-green-500/10 border-green-200 text-green-700 hover:bg-green-100 font-medium'
                                        : 'bg-white border-accent/20 text-accent hover:bg-accent/5 hover:border-accent/40'
                                        }`}
                                >
                                    {faq.type === 'whatsapp' ? (
                                        <span className="flex items-center gap-1.5">
                                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                        </span>
                                    ) : faq.q}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleInputSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                disabled={isTyping}
                                className="flex-grow bg-gray-50 border border-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isTyping}
                                className="bg-accent hover:bg-accent-dark text-white p-2.5 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-accent group"
                            >
                                <Send className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group relative ${isOpen ? 'bg-gray-800 text-white' : 'bg-accent text-white shadow-accent/40'
                    }`}
            >
                {isOpen ? <X className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-dark opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-accent-dark border-2 border-white"></span>
                    </span>
                )}
            </button>
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Chatbot;
