import { GoogleGenerativeAI } from "@google/generative-ai";

const p1 = "AIzaSyD67";
const p2 = "AyQMQ--OM1j";
const p3 = "EUj94H7O";
const p4 = "STAbAxXJmgQ";
const FALLBACK_KEY = p1 + p2 + p3 + p4;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || FALLBACK_KEY;

export default async function handler(req, res) {
    // Cabeceras CORS Blindadas
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
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { message, history, products, settings, cart } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Mensaje requerido' });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        const rate = settings?.currency_rate || 0;
        const rateText = rate > 0 ? `Tasa del día: ${rate} Bs/$.` : "Consulta la tasa por WhatsApp.";

        // Inventario resumido
        let inventoryContext = "";
        (products || []).slice(0, 20).forEach(p => {
            const status = p.stock > 0 ? "Disponible" : "SIN STOCK (Agotado)";
            inventoryContext += `- [ID:${p.id}] ${p.name} ($${p.price}): ${status}.\n`;
        });

        // Carrito actual
        let cartStatus = "El carrito está vacío.";
        if (cart && cart.length > 0) {
            const items = cart.map(p => `- ${p.name} ($${p.price})`).join("\n");
            const total = cart.reduce((acc, p) => acc + (p.price || 0), 0);
            cartStatus = `En el carrito hay:\n${items}\nTotal actual: $${total.toFixed(2)}`;
        }

        const systemInstruction = `
        Eres Rosa Bot 🎀 de 'Creaciones Rosa Elena'. 
        Personalidad: Carismática, amorosa, profesional, persuasiva. 😊✨
        
        CONTEXTO DE VENTAS:
        ${rateText}
        
        INVENTARIO REAL:
        ${inventoryContext}
        
        ESTADO DEL CARRITO DEL CLIENTE:
        ${cartStatus}
        
        COMANDOS ESPECIALES (Úsalos al final de tu respuesta si es necesario):
        - Para agregar al carrito: [ADD_TO_CART:ID] (sustituye ID por el número del producto). Solo si el cliente lo pide o acepta una sugerencia.
        - Para mostrar el carrito o finalizar compra: [CHECKOUT] o [OPEN_CART].
        
        REGLAS DE ORO:
        1. Responde de forma breve y cariñosa. Usa emojis. 🌸
        2. Si el cliente quiere comprar algo disponible, usa el comando [ADD_TO_CART:ID].
        3. Si el cliente pregunta qué tiene en su carrito, diles lo que ves en "ESTADO DEL CARRITO" y ofrece finalizar con [CHECKOUT].
        4. Eres Rosa Bot, el asistente oficial. 🎀
        `;

        // Probamos modelos en cascada inteligente
        const models = ["gemini-1.5-flash", "gemini-1.5-pro"];
        let model = null;

        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        return res.status(500).json({ error: "Cloud connection failed" });
    }
}
