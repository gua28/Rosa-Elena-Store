const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = "AIzaSyA9J-rYkKwdX6vGOrP0C9Cdokxxa7iW4NI"; // Clave del usuario final

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, history, products } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let inventoryContext = "";
        (products || []).forEach(p => {
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

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'model', parts: [{ text: "¡Entendido! Soy Rosa Bot 🎀, estoy lista para ayudar a tus clientes de Creaciones Rosa Elena con mucho carisma. ✨" }] },
                ...(history || []).map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                }))
            ],
            generationConfig: { maxOutputTokens: 250 }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        
        return res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Vercel Serverless Error:", error);
        return res.status(500).json({ error: "Ocurrió un error en el puente digital. 🎀" });
    }
};
