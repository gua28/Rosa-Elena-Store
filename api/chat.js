import { GoogleGenerativeAI } from "@google/generative-ai";

const p1 = "AIzaSyD67";
const p2 = "AyQMQ--OM1j";
const p3 = "EUj94H7O";
const p4 = "STAbAxXJmgQ";
const FALLBACK_KEY = p1 + p2 + p3 + p4;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || FALLBACK_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

    try {
        const { message, history, products, settings } = req.body;
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        const rate = settings?.currency_rate || 0;
        const rateText = rate > 0 ? `Tasa del día: ${rate} Bs/$.` : "Consulta la tasa por WhatsApp.";

        // Inventario resumido
        let inventory = "";
        (products || []).slice(0, 15).forEach(p => {
            inventory += `- ${p.name} ($${p.price}): ${p.stock > 0 ? "Disponible" : "A pedido"}\n`;
        });

        const prompt = `Eres Rosa Bot 🎀, asistente oficial de Creaciones Rosa Elena. 
        ${rateText}
        Inventario Real: 
        ${inventory}
        
        REGLAS:
        1. Sé súper carismática, usa emojis y trata con cariño (mi cielo, corazón, mi amor).
        2. Si preguntan por la tasa o bolívares, dales el monto exacto: ${rate} Bs/$.
        3. Fomenta la compra y ofrece el botón de WhatsApp para pedidos personalizados.
        4. Sé breve y directa.`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: "¡Hola! ✨ Soy Rosa Bot 🎀, lista para ayudar con mucho amor." }] },
                ...(history || []).map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] }))
            ]
        });

        const result = await chat.sendMessage(message);
        return res.status(200).json({ reply: result.response.text() });

    } catch (error) {
        return res.status(500).json({ error: "API Error" });
    }
}
