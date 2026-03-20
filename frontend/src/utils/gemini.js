export const askGemini = async (message, history = [], products = []) => {
    try {
        console.log("Rosa Bot conectando con el puente inteligente de la tienda...");

        // Llamamos al ENDPOINT de Vercel centralizado
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, products })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Vercel AI Error:", errorData);
            throw new Error(errorData.error || "Algo falló en el puente");
        }

        const data = await response.json();
        
        return data.reply || "¡Hola! ✨ ¿En qué puedo ayudarte hoy? 🎀";

    } catch (error) {
        console.error("Rosa Bot Local Memory Activated:", error);
        
        // MODO SUPERVIVENCIA: Inteligencia local basada en el inventario real.
        // Si el servidor falla, el bot todavía sabe sobre los productos.
        const lowerMsg = message.toLowerCase();
        const found = products.find(p => lowerMsg.includes(p.name.toLowerCase()));
        
        if (found) {
            const status = found.stock > 0 ? "¡Lo tenemos disponible!" : "Justo se nos agotó, pero te lo podemos hacer personalizado bajo pedido. 😊";
            return `¡Qué buen gusto! ✨ Sobre el ${found.name}: ${status} Cuesta $${found.price}. 🎀 ¿Te gustaría ver más en WhatsApp o el catálogo?`;
        }
        
        if (lowerMsg.includes("personalizado") || lowerMsg.includes("pedido")) {
            return "¡Por supuesto! 🎀 Hacemos pedidos 100% personalizados para lazos, piñatas y birretes. Cuéntanos tu idea o escríbenos por WhatsApp abajo. ✨";
        }
        
        if (lowerMsg.includes("hola") || lowerMsg.includes("saludo")) {
             return "¡Hola! ✨ Soy Rosa Bot 🎀, tu asistente de Creaciones Rosa Elena. Estoy para ayudarte a elegir lo más lindo de nuestro catálogo. ¿Qué buscas hoy? 😊";
        }

        // Si no sabe qué decir, da una respuesta carismática de contacto
        return "¡Uy! ✨ Mis hilos digitales se enredaron un poquito, pero aquí estoy. 😊 ¿Buscas algún lazo o piñata especial? 🎀 Para detalles específicos, ¡nuestro bot de WhatsApp te espera en los botones de abajo!";
    }
};
