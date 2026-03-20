export const askGemini = async (message, history = [], products = []) => {
    try {
        console.log("Rosa Bot conectando con el puente de inteligencia en Vercel...");

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, products })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Algo falló en el puente");
        }

        const data = await response.json();
        
        return data.reply || "¡Hola! ✨ ¿En qué puedo ayudarte hoy?";

    } catch (error) {
        console.error("Rosa Bot API Error:", error);
        return "¡Uy! ✨ Tuve un pequeño 'parpadeo' creativo procesando eso. 😊 ¿Me podrías repetir tu consultita? ¡Gracias! 🎀";
    }
};
