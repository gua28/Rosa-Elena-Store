export const askGemini = async (message, history = [], products = []) => {
    const lowerMsg = message.toLowerCase();
    
    try {
        console.log("Rosa Bot intentando conectar con el cerebro en la nube...");

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, products })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.reply) return data.reply;
        }
        
        throw new Error("Conexión limitada");

    } catch (error) {
        console.warn("Rosa Bot activando Inteligencia Local de Respaldo...");
        
        // --- MOTOR DE INTELIGENCIA LOCAL (A PRUEBA DE FALLOS) ---
        
        // 1. Saludos
        if (lowerMsg.includes("hola") || lowerMsg.includes("buenos días") || lowerMsg.includes("buenas tardes")) {
            return "¡Hola! ✨ Soy Rosa Bot 🎀, tu asistente de Creaciones Rosa Elena. Estoy aquí para ayudarte a elegir el detalle perfecto. ¿Qué tienes en mente hoy? 😊";
        }

        // 2. Búsqueda inteligente en el inventario
        const relevantProducts = products.filter(p => 
            lowerMsg.includes(p.name.toLowerCase()) || 
            lowerMsg.includes(p.category?.toLowerCase()) ||
            (lowerMsg.includes("lazo") && p.category?.toLowerCase().includes("lazo")) ||
            (lowerMsg.includes("piñata") && p.name.toLowerCase().includes("piñata"))
        );

        if (relevantProducts.length > 0) {
            const p = relevantProducts[0];
            let resp = `¡Excelente elección! ✨ El ${p.name} es uno de nuestros favoritos. `;
            resp += p.stock > 0 ? `Lo tenemos disponible por solo $${p.price}. 🎀` : `Ahorita no tenemos en stock, pero podemos hacértelo personalizado bajo pedido. 😊`;
            resp += " ¿Te gustaría que te ayude a concretar el pedido por WhatsApp?";
            return resp;
        }

        // 3. Consultas sobre personalización
        if (lowerMsg.includes("personalizado") || lowerMsg.includes("pedido") || lowerMsg.includes("hacer")) {
            return "¡Claro que sí! 🎀 En Creaciones Rosa Elena somos especialistas en pedidos 100% personalizados. Podemos adaptar colores, nombres y temáticas. ✨ Escríbenos al WhatsApp con tu idea y le daremos vida.";
        }

        // 4. Precios o Catálogo
        if (lowerMsg.includes("precio") || lowerMsg.includes("cuanto cuesta") || lowerMsg.includes("valor")) {
            return "Nuestros precios varían según el diseño y el tamaño. 🌸 En el catálogo puedes ver los precios base, ¡pero recuerda que lo personalizado tiene un toque especial! ¿Buscas algo de algún presupuesto en particular? 😊";
        }

        // 5. Ubicación o Envíos
        if (lowerMsg.includes("donde") || lowerMsg.includes("ubicacion") || lowerMsg.includes("envio")) {
            return "Estamos en Valencia, Venezuela 📍. Hacemos entregas personales y envíos nacionales para que tus creaciones lleguen seguras. 🚚✨";
        }

        // 6. Respuesta Genérica Carismática (Último recurso)
        return "¡Qué lindo escucharte! ✨ Rosa Elena siempre dice que cada detalle cuenta. 🎀 No estoy segura de entenderte del todo, pero si buscas algo especial, ¡seguro lo tenemos en el catálogo o lo podemos crear! ¿Te cuento más sobre nuestros lazos o piñatas? 😊";
    }
};
