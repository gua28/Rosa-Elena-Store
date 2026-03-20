/**
 * ROSA BOT - MOTOR DE INTELIGENCIA HÍBRIDA (VERSIÓN LIBRE)
 * Este archivo gestiona la comunicación con la IA de Google a través de Vercel
 * y cuenta con un "Cerebro Local" avanzado para Interacción Libre sin API.
 */

export const askGemini = async (message, history = [], products = []) => {
    const lowerMsg = message.toLowerCase();
    
    // Función auxiliar para obtener una respuesta aleatoria de un array
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

    try {
        console.log("Rosa Bot conectando con la nube para interacción total...");
        const fetchWithTimeout = async (url, options, timeout = 5000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return res;
        };
        
        let response = null;
        try {
            // Intento #1: Vercel Serverless Function (Timeout 4s)
            response = await fetchWithTimeout('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history, products })
            }, 4000);
        } catch (e) {
            console.log("Fetch a Vercel falló o superó el tiempo...");
        }

        // Intento #2: Si Vercel no está levantado
        if (!response || !response.ok || response.status === 404) {
            console.log("Probando con Python Backend principal...");
            const { API_BASE_URL } = await import('./api');
            try {
                // Timeout de 5s para Render, si Render está dormido aborta rápido
                response = await fetchWithTimeout(`${API_BASE_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, history })
                }, 5000);
            } catch (e) {
                console.log("Python Backend falló o superó el tiempo...");
            }
        }

        if (response && response.ok) {
            const data = await response.json();
            if (data.reply) return data.reply;
        }
        
        throw new Error("Conexión perdida con ambos backends");

    } catch (error) {
        console.warn("Rosa Bot: Activando Cerebro de Interacción Libre Local (por demora de red o error).");

        // --- BASE DE DATOS SEMÁNTICA LOCAL ---
        
        // 1. CHAT LIBRE / SOCIAL
        if (lowerMsg.includes("quien eres") || lowerMsg.includes("tu nombre")) {
            return random([
                "¡Mucho gusto! Soy Rosa Bot 🎀, el alma digital de Creaciones Rosa Elena. Mi misión es que te sientas como una reina. ✨",
                "Soy tu asistente personal, Rosa Bot. 😊 Estoy aquí para ayudarte a elegir los detalles más lindos del mundo.",
                "¡Hola! Me llamo Rosa Bot 🌸, y soy experta en lazos, piñatas y todo lo que tenga un pedacito de amor."
            ]);
        }

        if (lowerMsg.includes("como estas") || lowerMsg.includes("que tal")) {
            return random([
                "¡Estoy radiante! ✨ Lista para mostrarte todas nuestras creaciones. ¿Y tú qué tal estás? 😊",
                "Muy bien, ¡con mucho ánimo de crear cosas bellas! 🎀 ¿En qué puedo alegrarte el día?",
                "¡Excelente! Brillando como la purpurina de nuestros productos. ✨ ¿Cómo te puedo ayudar hoy?"
            ]);
        }

        if (lowerMsg.includes("gracias") || lowerMsg.includes("agradezco")) {
            return "¡No hay de qué, corazón! 💖 Es un placer para mí. ¿Necesitas ver algo más de nuestro catálogo? 🎀";
        }

        if (lowerMsg.includes("chiste") || lowerMsg.includes("divertido")) {
            return "A ver... ¿Qué le dice un lazo a una trenza? ¡Oye, deja de enredarte tanto! 😂 Bromas aparte, ¡mis lazos nunca se portan mal! ✨";
        }

        // --- 2. SUPER CEREBRO LOCAL (ASESORÍA E INVENTARIO) ---
        const availableProducts = products.filter(p => p.stock > 0);

        // 2.1 INVENTARIO Y DISPONIBILIDAD GENERAL
        if (lowerMsg.includes("inventario") || lowerMsg.includes("disponible") || lowerMsg.includes("que tienes") || lowerMsg.includes("opciones") || lowerMsg.includes("catalogo") || lowerMsg.includes("catálogo")) {
            if (availableProducts.length === 0) {
                 return "En este momento estamos renovando el inventario, pero hacemos bellezas bajo pedido. 🌸 ¿Buscabas alguna temática o color en especial?";
            }
            const items = availableProducts.slice(0, 3).map(p => `${p.name} ($${p.price})`).join(", ");
            return `¡Tengo cositas hermosas listas de entrega inmediata! ✨ Por ejemplo: ${items}. Si buscas algo distinto, también trabajo bajo pedido. ¿Qué ideas tienes? 🎀`;
        }

        // 2.2 ASESORÍA Y RECOMENDACIÓN DE VENTAS
        if (lowerMsg.includes("recomienda") || lowerMsg.includes("sugiere") || lowerMsg.includes("que compro") || lowerMsg.includes("regalo") || lowerMsg.includes("busco algo para") || lowerMsg.includes("asesora") || lowerMsg.includes("ayudame a elegir")) {
            if (availableProducts.length > 0) {
                const prod = random(availableProducts);
                return `¡Ay, me fascina asesorar! 😍 Para un regalo espectacular, el "${prod.name}" está en tendencia. A las niñas les encanta y su precio es de $${prod.price}. ¡Además lo tengo listo para entrega! 🎁 ¿Te gustaría que te lo separe?`;
            } else if (products.length > 0) {
                const prod = random(products);
                return `¡Me encantaría ayudarte a elegir! ✨ El "${prod.name}" es nuestro producto estrella. Aunque toca hacerlo bajo pedido, queda precioso. Su valor referencial es $${prod.price}. ¿Qué opinas? 🌸`;
            }
            return "Para algo especial, te recomiendo un lazo estilo 'Gala' con cristales. ✨ ¡Pegan con todo y son el centro de atención! 🌸";
        }

        // 2.3 CONSULTAS SOBRE PRODUCTOS ESPECÍFICOS SEGÚN INVENTARIO
        const relevantProducts = products.filter(p => 
            lowerMsg.includes(p.name.toLowerCase()) || 
            (p.category && lowerMsg.includes(p.category.toLowerCase()))
        );

        if (relevantProducts.length > 0) {
            const p = relevantProducts[0];
            const stockMsg = p.stock > 0 ? "¡Y la súper noticia es que lo tengo para entrega inmediata! 🚀" : "Justo se nos agotó en la tienda, pero te lo fabrico igualito bajo pedido con el mayor amor. 😊";
            return `¡Qué buen gusto tienes! ✨ El "${p.name}" es una joya. 💎 Cuesta $${p.price}. ${stockMsg} ¿Te gustaría que gestionemos el pedido por WhatsApp? 🎀`;
        }

        // 2.4 PREGUNTAS POR CATEGORÍA DE PRODUCTOS
        if (lowerMsg.includes("lazo") || lowerMsg.includes("moño") || lowerMsg.includes("cintillo")) {
            const lazosStock = availableProducts.filter(p => p.name.toLowerCase().includes("lazo") || p.name.toLowerCase().includes("moño") || p.name.toLowerCase().includes("cintillo"));
            if (lazosStock.length > 0) {
                 return `¡Amo hacer lazos! 🎀 Y estás de suerte, ahorita tengo disponible en tienda: "${lazosStock[0].name}" a $${lazosStock[0].price}. ¡Es súper coqueto! ¿Quieres que te pase más detalles? ✨`;
            }
            return "¡Nuestros lazos son la firma de Rosa Elena! 🎀 Tenemos desde coquetos parches escolares hasta modelos majestuosos de gala. Todo hecho a tu gusto. ¿Buscabas para niña grande o bebé? ✨";
        }

        if (lowerMsg.includes("piñata")) {
            const pinatasStock = availableProducts.filter(p => p.name.toLowerCase().includes("piñat") || p.name.toLowerCase().includes("pinata"));
            if (pinatasStock.length > 0) {
                 return `¡Las piñatas son el alma de la fiesta! 🎈 Tengo lista para ti la de "${pinatasStock[0].name}" por $${pinatasStock[0].price}. ¿Es esa la temática que buscas, o quieres algo diferente? 🎉`;
            }
            return "¡Las piñatas en 3D y tambor de Rosa Elena son monumentales! 🎂 Las diseñamos bajo pedido para que tu fiesta sea inolvidable. Cuéntame, ¿qué temática te imaginas? 🎈";
        }

        // 2.5 CONSULTAS COMERCIALES
        if (lowerMsg.includes("precio") || lowerMsg.includes("costo") || lowerMsg.includes("cuanto val") || lowerMsg.includes("presupuesto")) {
            return "¡Me adapto a tu presupuesto! 🌸 Tengo detallitos tan cucos como apliques desde $2, hasta grandes piñatas personalizadas. Si me dices exactamente qué te gusta, ¡te calculo rápido! 😊";
        }

        if (lowerMsg.includes("personalizado") || lowerMsg.includes("pedido") || lowerMsg.includes("encargo")) {
            return "¡Los retos de creatividad son mi especialidad! 🎀 Si sueñas con un lazo de cierta temática o una piñata mágica, te lo cumplo. Nombres, colores, perlas... ¡Tú mandas! ✨";
        }

        if (lowerMsg.includes("donde estan") || lowerMsg.includes("ubicacion") || lowerMsg.includes("valencia") || lowerMsg.includes("tienda fisica")) {
            return "Somos tienda online ubicada en el corazón de Valencia, Carabobo 📍. Hacemos entregas locales rapidísimas y envíos súper seguros a toda Venezuela. 🚚💨 ¡Tu producto llega impecable!";
        }

        // 4. FALLBACK "INTELIGENTE" (SI NO ENTIENDE, SIGUE SIENDO LIBRE)
        return random([
            "¡Qué interesante lo que dices! 🌸 Cuéntame un poquito más para poder ayudarte mejor como tú te mereces. 🎀",
            "Me encanta tu energía, pero mis cables se cruzaron un poco. 😅 ¿Me hablabas de un producto o de un pedido especial? ✨",
            "¡Ay! Me quedé pensando en lo lindos que son nuestros lazos y me distraje. 😊 ¿Podrías repetirme eso último? 🎀"
        ]);
    }
};
