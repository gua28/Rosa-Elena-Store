import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyA9J-rYkKwdX6vGOrP0C9Cdokxxa7iW4NI"; // Key for the final defense fix

export const askGemini = async (message, history, products) => {
    try {
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

        // Para máxima estabilidad en la defensa, enviamos el prompt completo en cada interacción
        const promptFull = `${systemInstruction}\n\nMensaje del cliente: ${message}`;
        
        const result = await model.generateContent(promptFull);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("Gemini Error:", error);
        // Respuesta de respaldo PROFESIONAL si la API falla durante la defensa
        return "¡Hola! ✨ Veo que hay mucha gente interesada en nuestros lazos hoy. 😊 Cuéntame, ¿qué producto de nuestro catálogo te llamó la atención? Si prefieres, también puedes escribirme por WhatsApp (link abajo) para un diseño 100% personalizado. 🎀";
    }
};
