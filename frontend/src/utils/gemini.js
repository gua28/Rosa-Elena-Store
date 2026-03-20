import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyA9J-rYkKwdX6vGOrP0C9Cdokxxa7iW4NI"; // Clave del usuario final

export const askGemini = async (message, history = [], products = []) => {
    try {
        console.log("Rosa Bot conectando con el cerebro oficial de Google...");

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

        // Formatear el historial para el SDK oficial
        // Debe alternar entre user y model.
        const chatHistory = history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));

        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemInstruction }]
                },
                {
                    role: 'model',
                    parts: [{ text: "¡Entendido! Soy Rosa Bot 🎀, estoy lista para ayudar a tus clientes de Creaciones Rosa Elena con mucho carisma. ✨" }]
                },
                ...chatHistory
            ],
            generationConfig: { maxOutputTokens: 250 }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        
        return responseText || "¡Hola! ✨ ¿En qué puedo ayudarte hoy?";

    } catch (error) {
        console.error("Rosa Bot SDK Error:", error);
        return "¡Uy! ✨ Tuve un pequeño 'parpadeo' creativo con tantas ideas digitales. 😊 ¿Me podrías repetir tu consultita? ¡Gracias! 🎀";
    }
};
