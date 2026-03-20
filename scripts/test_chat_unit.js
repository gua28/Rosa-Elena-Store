import handler from '../frontend/api/chat.js';

async function testChat() {
    console.log("🕵️‍♂️ Iniciando Test de Rosa Bot...");
    
    // Mock de la petición de Vercel
    const req = {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: {
            message: "Hola Rosa, qué vendes?",
            history: [],
            products: [
                { name: "Lazo Rosa Encanto", price: 3.50, stock: 15, description: "Un lazo premium artesanal." }
            ]
        }
    };

    // Mock de la respuesta de Vercel
    const res = {
        statusCode: 200,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log("\n✅ RESPUESTA RECIBIDA (Status " + this.statusCode + "):");
            console.log(JSON.stringify(data, null, 2));
            return this;
        },
        setHeader: function(name, value) {
            // console.log("Header set: " + name + " = " + value);
        },
        end: function() { console.log("Request ended."); }
    };

    try {
        console.log("🚀 Llamando al controlador /api/chat.js...");
        await handler(req, res);
    } catch (err) {
        console.error("\n❌ ERROR EN EL TEST:");
        console.error(err);
    }
}

testChat();
