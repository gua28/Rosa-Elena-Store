import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyB2dyWD3XkcpSvGosu1NRLsrMxEty8SRVM";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

    try {
        const { message, history, products } = req.body;
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        // Probamos modelos disponibles para esta clave
        const modelNames = ["gemini-1.5-flash-latest", "gemini-flash-latest", "gemini-2.0-flash"];
        let model = null;

        for (const name of modelNames) {
            try {
                model = genAI.getGenerativeModel({ model: name });
                break;
            } catch (e) { continue; }
        }

        if (!model) throw new Error("No model found");

        let inventory = "";
        (products || []).slice(0, 10).forEach(p => {
            inventory += `- ${p.name} ($${p.price}): ${p.stock > 0 ? "Disponible" : "A pedido"}\n`;
        });

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: `Eres Rosa Bot de Creaciones Rosa Elena. Inventario: ${inventory}. Reglas: Sé carismática, breve y ofrece ayuda por WhatsApp.` }] },
                { role: 'model', parts: [{ text: "¡Entendido! Soy Rosa Bot 🎀." }] },
                ...(history || []).map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] }))
            ]
        });

        const result = await chat.sendMessage(message);
        return res.status(200).json({ reply: result.response.text() });

    } catch (error) {
        return res.status(500).json({ error: "API Error" });
    }
}
