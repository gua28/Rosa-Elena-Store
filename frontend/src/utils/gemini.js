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
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, products })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.reply) return data.reply;
        }
        throw new Error("Local Mode");

    } catch (error) {
        console.warn("Rosa Bot: Activando Cerebro de Interacción Libre Local.");

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

        // 2. ASESORÍA Y RECOMENDACIONES (INTERACCIÓN LIBRE)
        if (lowerMsg.includes("recomienda") || lowerMsg.includes("sugiere") || lowerMsg.includes("que compro")) {
            const prod = products.length > 0 ? random(products) : null;
            if (prod) {
                return `¡Ay, qué difícil elegir! 😍 Pero si me preguntas, el ${prod.name} es tendencia ahorita. ¿Te cuento cuánto cuesta? 🎀`;
            }
            return "Te recomiendo nuestros lazos de la nueva colección. ✨ Son hechos a mano con cintas importadas. ¡Pegan con todo! 🌸";
        }

        // 3. CONSULTAS DE NEGOCIO (PRECIOS, STOCK, PEDIDOS)
        const relevantProducts = products.filter(p => 
            lowerMsg.includes(p.name.toLowerCase()) || 
            (p.category && lowerMsg.includes(p.category.toLowerCase()))
        );

        if (relevantProducts.length > 0) {
            const p = relevantProducts[0];
            const stockMsg = p.stock > 0 ? "¡Y lo mejor es que lo tengo para entrega inmediata! 🚀" : "Justo se nos acabó, pero te lo podemos fabricar igualito bajo pedido. 😊";
            return `¡Tuviste suerte! El ${p.name} es una joya. 💎 Su valor es de $${p.price}. ${stockMsg} ¿Te gustaría que te pase el link de WhatsApp? 🎀`;
        }

        if (lowerMsg.includes("lazo") || lowerMsg.includes("moño")) {
            return "¡Nuestros lazos son nuestra firma! 🎀 Tenemos desde los clásicos escolares hasta modelos 'Gala' con cristales. ¿Buscas algún color en especial? ✨";
        }

        if (lowerMsg.includes("piñata")) {
            return "¡Las piñatas de Rosa Elena son de otro nivel! 🎂 Las hacemos en 3D, estilo tambor o tradicionales. Cuéntame de qué temática es tu fiesta para enviarte ideas. 🎈";
        }

        if (lowerMsg.includes("precio") || lowerMsg.includes("costo") || lowerMsg.includes("cuanto val")) {
            return "¡Tenemos opciones para todos! 🌸 Los detalles pequeños empiezan en $2 y las piñatas grandes varían según el diseño. ¿De cuánto es tu presupuesto aproximado? 😊";
        }

        if (lowerMsg.includes("personalizado") || lowerMsg.includes("pedido")) {
            return "¡Amo los retos! 🎀 Podemos personalizar cualquier lazo o piñata con nombres, colores y temas. Es lo que más nos piden. ¿Qué idea loca tienes en mente? ✨";
        }

        if (lowerMsg.includes("donde estan") || lowerMsg.includes("ubicacion") || lowerMsg.includes("valencia")) {
            return "Estamos ubicados en la hermosa ciudad de Valencia, Venezuela 📍. Hacemos entregas locales y envíos seguros a todo el país. 🚚💨";
        }

        // 4. FALLBACK "INTELIGENTE" (SI NO ENTIENDE, SIGUE SIENDO LIBRE)
        return random([
            "¡Qué interesante lo que dices! 🌸 Cuéntame un poquito más para poder ayudarte mejor como tú te mereces. 🎀",
            "Me encanta tu energía, pero mis cables se cruzaron un poco. 😅 ¿Me hablabas de un producto o de un pedido especial? ✨",
            "¡Ay! Me quedé pensando en lo lindos que son nuestros lazos y me distraje. 😊 ¿Podrías repetirme eso último? 🎀"
        ]);
    }
};
