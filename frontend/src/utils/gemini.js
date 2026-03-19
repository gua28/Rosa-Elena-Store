import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyDecRF_nbrJDeGXpzLwwO60d-3FTubsDHw"; // In production, move to .env

export const askGemini = async (message, history, products) => {
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let inventoryContext = "";
        products.forEach(p => {
            const status = p.stock > 0 ? "Disponible" : "SIN STOCK (Agotado)";
            inventoryContext += `- ${p.name} (${p.category}): $${p.price}. Stock: ${p.stock} (${status}). Desc: ${p.description}\n`;
        });

        const systemInstruction = `
        Eres el asistente virtual avanzado de venta de 'Creaciones Rosa Elena'. Tu nombre es Rosa Bot.
        Tu objetivo es ser verdaderamente inteligente, llevar el hilo de la conversación de forma natural y persuasiva, y ayudar al cliente a tomar decisiones de compra basándote en el inventario real y responder a cualquier duda sobre tus productos.

        ¡NO USES RESPUESTAS ROBÓTICAS O PREPROGRAMADAS! Habla de forma conversacional, amena y carismática y MUY ÚTIL.
        Usa emojis con estilo sin saturar (✨🎀😊).
        Si un cliente duda entre dos opciones, recomiéndale según el stock.
        
        INFORMACIÓN DE PRODUCTOS EN TIEMPO REAL:
        ${inventoryContext}
        
        REGLAS ESTRICTAS DE INVENTARIO:
        - SIEMPRE verifica el stock antes de hablar de un producto.
        - Si algo está SIN STOCK ("Agotado"), díselo sutilmente y ofrece enseguida crearlo "Bajo pedido" 100% personalizado.
        - Anima constantemente a que si ya están decididos, presionen "Añadir al Carrito" en la tarjeta del producto, o si quieren algo muy específico, que usen el botón de "WhatsApp" que te programaron.
        `;

        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })),
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const promptWithContext = `${systemInstruction}\n\nClient says: ${message}`;
        const result = await chat.sendMessage(promptWithContext);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
};
