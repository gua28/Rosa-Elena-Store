const GEMINI_API_KEY = "AIzaSyA9J-rYkKwdX6vGOrP0C9Cdokxxa7iW4NI"; // Clave del usuario final

export const askGemini = async (message, history, products) => {
    try {
        console.log("Rosa Bot intentando conectar con el cerebro de IA...");

        let inventoryContext = "";
        products.forEach(p => {
            const status = p.stock > 0 ? "Disponible" : "SIN STOCK (Agotado)";
            inventoryContext += `- ${p.name} ($${p.price}): ${status}. Desc: ${p.description}\n`;
        });

        const systemInstruction = `
        Eres Rosa Bot, el asistente virtual oficial de 'Creaciones Rosa Elena'. 
        Tu objetivo es ser muy carismática (😊✨🎀), persuasiva y útil. 
        Hablas de forma conversacional (¡NO ROBÓTICA!). 

        DATOS DE LA TIENDA (INVENTARIO):
        ${inventoryContext}

        REGLAS:
        1. Responde de forma breve y amigable.
        2. Si preguntan por algo agotado, ofrece hacerlo personalizado bajo pedido.
        3. Invítalos a ver el catálogo o a escribir por WhatsApp para detalles.
        4. No menciones que eres una IA, eres el asistente del equipo de Rosa Elena.
        `;

        const promptFull = `${systemInstruction}\n\nMensaje del cliente: ${message}`;

        // USAMOS FETCH DIRECTO PARA EVITAR ERRORES DE LIBRERÍA EN VERCEL
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptFull }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error details:", errorData);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;
        
        return reply || "¡Hola! ✨ Cuéntame, ¿qué producto de nuestro catálogo te gustó? Estamos para ayudarte. 🎀";

    } catch (error) {
        console.error("Rosa Bot fallback activated:", error);
        // Respuesta de respaldo PROFESIONAL si la API falla durante la defensa
        return "¡Hola! ✨ Veo que hay mucha gente interesada en nuestros lazos hoy. 😊 Cuéntame, ¿qué producto de nuestro catálogo te llamó la atención? Si prefieres, también puedes escribirme por WhatsApp (link abajo) para un diseño 100% personalizado. 🎀";
    }
};
