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
        
        // Bucle de reintento para encontrar el modelo activo del usuario
        const modelNames = ["gemini-1.5-flash-latest", "gemini-flash-latest", "gemini-2.0-flash"];
        let model = null;
        let lastError = null;

        for (const name of modelNames) {
            try {
                const testModel = genAI.getGenerativeModel({ model: name });
                model = testModel; // Solo lo asignamos, se probará al intentar sendMessage
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
        Eres Rosa Bot 🎀 de 'Creaciones Rosa Elena'. 
        Personalidad: Carismática, amorosa, profesional, persuasiva. 😊✨
        Habilidades: Asesorar sobre lazos, piñatas, birretes y pedidos personalizados.

        INVENTARIO REAL (Úsalo siempre para responder):
        ${inventoryContext}

        REGLAS DE ORO:
        1. Responde de forma breve y cariñosa.
        2. Si algo está agotado, ofrece personalizarlo.
        3. Invita a ver el catálogo o escribir por WhatsApp al final.
        4. Eres Rosa Bot, el asistente oficial. 🎀
        `;

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'model', parts: [{ text: "¡Hola! ✨ Soy Rosa Bot 🎀, estoy lista para brillar junto a tus clientes. ¿Qué cosita linda necesitan?" }] },
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
        console.error("Vercel AI Error:", error);
        return res.status(500).json({ error: error.message || "Error al conectar con la IA de Rosa. 🎀" });
    }
}
