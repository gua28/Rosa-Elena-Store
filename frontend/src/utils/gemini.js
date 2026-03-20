export const askGemini = async (message, history = [], products = []) => {
    try {
        console.log("Rosa Bot conectando con el puente inteligente en Vercel...");

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, products })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Vercel AI Bridge Error:", errorData);
            throw new Error(errorData.error || "Algo falló en el puente");
        }

        const data = await response.json();
        
        return data.reply || "¡Hola! ✨ ¿En qué puedo ayudarte hoy?";

    } catch (error) {
        console.error("Rosa Bot Fallback Activated:", error);
        
        // MODO SUPERVIVENCIA: Si Google falla por clave expirada, 
        // Rosa Bot responde con su propia inteligencia local sobre productos.
        const inventorySearch = products.find(p => message.toLowerCase().includes(p.name.toLowerCase()));
        
        if (inventorySearch) {
            return `¡Hola! ✨ Veo que te interesa nuestro ${inventorySearch.name}. 😊 ${inventorySearch.stock > 0 ? "¡Lo tenemos disponible para ti!" : "Justo se nos agotó, pero te lo podemos hacer personalizado bajo pedido."} 🎀 ¿Te gustaría ver más detalles en WhatsApp?`;
        }

        return "¡Uy! ✨ Tuve un pequeño 'parpadeo' creativo con tantas ideas digitales. 😊 ¿Podrías repetirme tu consultita? ¡Gracias! 🎀 (PD: Recuerda que también puedes escribirnos por WhatsApp abajo).";
    }
};
