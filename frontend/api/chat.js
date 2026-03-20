import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyATh4YbbSBsH02XjBo1ajNLndIUDxRQi0w"; // Clave Maestra Limpia y Nueva

export default async function handler(req, res) {
    // Cabeceras CORS robustas
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
            return res.status(400).json({ error: 'Mensaje requerido' });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        // Probamos con gemini-1.5-flash o gemini-flash-latest según la región/permisos
        const modelNames = ["gemini-1.5-flash", "gemini-flash-latest", "gemini-1.5-flash-8b"];
        let model = null;
        let lastError = null;

        // Bucle de reintento inteligente para encontrar el modelo activo del usuario
        for (const name of modelNames) {
            try {
                const testModel = genAI.getGenerativeModel({ model: name });
                // Solo configuramos, no enviamos mensaje de prueba para no gastar cuota innecesaria
                model = testModel;
                break;
            } catch (e) {
                lastError = e;
            }
        }

        if (!model) {
            throw new Error(`No se pudo inicializar ningún modelo de Gemini: ${lastError?.message}`);
        }

        let inventoryContext = "";
        (products || []).forEach(p => {
            const status = p.stock > 0 ? "Disponible" : "SIN STOCK (Agotado)";
            inventoryContext += `- ${p.name} ($${p.price}): ${status}. Desc: ${p.description}\n`;
        });

        const systemInstruction = `
        Eres Rosa Bot, el asistente virtual oficial de 'Creaciones Rosa Elena'. 
        Tu objetivo es ser muy carismática (😊✨🎀), persuasiva y útil. 
        Hablas de forma conversacional (¡NO ROBÓTICA! ni preprogramada). 

        DATOS DE LA TIENDA (INVENTARIO):
        ${inventoryContext}

        REGLAS:
        1. Responde de forma breve, carismática y MUY ÚTIL.
        2. Si algo está agotado, ofrece hacerlo bajo pedido personalizado.
        3. Siempre anima al cliente a ver el catálogo o contactar por WhatsApp.
        4. No menciones que eres una IA, eres el asistente del equipo de Rosa Elena.
        `;

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'model', parts: [{ text: "¡Entendido! Soy Rosa Bot 🎀, estoy lista para ayudar a tus clientes de Creaciones Rosa Elena con inteligencia y carisma. ✨" }] },
                ...(history || []).map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                }))
            ],
            generationConfig: { 
                maxOutputTokens: 500,
                temperature: 0.7 
            }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        
        return res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Vercel Serverless Error (Rosa Bot):", error);
        return res.status(500).json({ error: error.message || "Error procesando la inteligencia de Rosa Bot. 🎀" });
    }
}
