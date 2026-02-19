import React from 'react';
import { MessageCircle } from 'lucide-react';

const FloatWhatsApp = () => {
    const whatsappNumber = "584127827734"; // Updated number
    const message = encodeURIComponent("¡Hola! Me gustaría hacer un pedido en Creaciones Rosa Elena.");

    return (
        <a
            href={`https://wa.me/${whatsappNumber}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group"
        >
            <MessageCircle className="h-7 w-7 fill-white" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/80 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                ¿Necesitas ayuda?
            </span>
        </a>
    );
};

export default FloatWhatsApp;
