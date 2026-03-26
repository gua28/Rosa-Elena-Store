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
        const { message, history, products, settings, cart } = req.body;
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        const rate = settings?.currency_rate || 0;
        const rateText = rate > 0 ? `Tasa del día: ${rate} Bs/$.` : "Consulta la tasa por WhatsApp.";

        // Inventario resumido
        let inventory = "";
        (products || []).slice(0, 20).forEach(p => {
            inventory += `- [ID:${p.id}] ${p.name} ($${p.price}) - ${p.stock > 0 ? "DISPONIBLE" : "BAJO PEDIDO"}\n`;
        });

        // Carrito actual
        let cartStatus = "El carrito está vacío.";
        if (cart && cart.length > 0) {
            const items = cart.map(p => `- ${p.name} ($${p.price})`).join("\n");
            const total = cart.reduce((acc, p) => acc + (p.price || 0), 0);
            cartStatus = `En el carrito hay:\n${items}\nTotal actual: $${total.toFixed(2)}`;
        }

        const prompt = `Eres Rosa Bot 🎀, asistente oficial de Creaciones Rosa Elena.
        *** CONTEXTO DE VENTAS ***:
        ${rateText}
        
        CATÁLOGO DISPONIBLE:
        ${inventory}
        
        ESTADO DEL CARRITO DEL CLIENTE:
        ${cartStatus}
        
        COMANDOS ESPECIALES (Úsalos al final de tu respuesta si es necesario):
        - Para agregar al carrito: [ADD_TO_CART:ID] (sustituye ID por el número del producto). Solo si el cliente lo pide o acepta una sugerencia.
        - Para mostrar el carrito/finalizar compra: [CHECKOUT] o [OPEN_CART].
        
        REGLAS DE ORO:
        1. Eres extremadamente cariñosa y usas emojis (corazón, mi amor, mi cielo). 🌸
        2. Si el cliente quiere comprar algo disponible, usa el comando [ADD_TO_CART:ID].
        3. Si el cliente pregunta qué tiene en su carrito, diles lo que ves en "ESTADO DEL CARRITO" y ofrece finalizar con [CHECKOUT].
        4. Tus respuestas deben ser breves, dulces y eficientes. ✨`;

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
        console.error("Vercel AI Error:", error);
        return res.status(500).json({ error: "Cloud sync failed" });
    }
}
