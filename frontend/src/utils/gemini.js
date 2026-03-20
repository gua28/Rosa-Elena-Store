const GEMINI_API_KEY = "AIzaSyA9J-rYkKwdX6vGOrP0C9Cdokxxa7iW4NI"; // Clave del usuario final

export const askGemini = async (message, history = [], products = []) => {
    try {
        console.log("Rosa Bot conectando con el cerebro de IA...");

        let inventoryContext = "";
        products.forEach(p => {
            const status = p.stock > 0 ? "Disponible" : "SIN STOCK (Agotado)";
            inventoryContext += `- ${p.name} ($${p.price}): ${status}. Desc: ${p.description}\n`;
        });

        const systemInstruction = `
        Eres Rosa Bot, el asistente virtual oficial de 'Creaciones Rosa Elena'. 
        Tu objetivo es ser muy carismática (😊✨🎀), persuasiva y útil. 
        Hablas de forma conversacional (¡NO ROBÓTICA!). 

        DATOS DE LA TIENDA (INVENTARIO ACTUAL):
        ${inventoryContext}

        REGLAS:
        1. Responde de forma breve y amigable.
        2. Si preguntan por algo agotado, ofrece hacerlo personalizado bajo pedido.
        3. Invítalos a ver el catálogo o a escribir por WhatsApp para detalles.
        4. No menciones que eres una IA, eres el asistente del equipo de Rosa Elena.
        `;

        // Formatear el historial correctamente para Gemini API v1beta
        const contents = [
            {
                role: 'user',
                parts: [{ text: systemInstruction }]
            },
            {
                role: 'model',
                parts: [{ text: "¡Entendido! Soy Rosa Bot 🎀, estoy lista para ayudar a tus clientes con todo el cariño y profesionalismo de Creaciones Rosa Elena. 😊✨" }]
            },
            ...history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })),
            {
                role: 'user',
                parts: [{ text: message }]
            }
        ];

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Gemini Error:", error);
            throw new Error("Error en API de Google");
        }

        const data = await response.json();
        const reply = data.candidates[0]?.content?.parts[0]?.text;
        
        return reply || "¡Hola! ✨ Cuéntame, ¿qué producto te gustó? Estoy aquí para ayudarte. 🎀";

    } catch (error) {
        console.error("Rosa Bot Fallback:", error);
        return "¡Hola! ✨ He tenido un pequeño 'parpadeo' creativo con tantas ideas. 😊 ¿Podrías repetirme tu consultita? O si prefieres, escríbenos por WhatsApp (link abajo) para atenderte personalmente. 🎀";
    }
};
