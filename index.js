const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Servidor HTTP falso para mantener vivo a Render desde el segundo uno
app.get('/', (req, res) => {
    res.send('Pana-Bot D-8 está activo y operando con estilo B)');
});

app.listen(PORT, () => {
    console.log(`Servidor HTTP corriendo en el puerto ${PORT}`);
});

// 2. Configuración del cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Inicialización de la API de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

client.once('ready', () => {
    console.log(`¡Pana-Bot D-8 conectado como ${client.user.tag}!`);
    // Aquí puedes intentar poner el estado personalizado si te deja la librería
    client.user.setActivity('Comiendo mortadela xd');
});

// 4. Manejador de mensajes blindado contra caídas
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Solo responde si lo mencionan o en un canal específico
    if (!message.content.includes(client.user.id)) return;

    try {
        await message.channel.sendTyping();

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const prompt = message.content.replace(`<@!${client.user.id}>`, '').trim();

        // Intento único y controlado
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        await message.reply(text);

    } catch (error) {
        console.error("Error al procesar con Gemini:", error);
        
        if (error.status === 429) {
            await message.reply("Efe mi gente, la llave de la API se quedó sin cuota (Error 429). Toca esperar un momento o cambiar de key xd.");
        } else {
            await message.reply("Me dio un calambre mental procesando eso, carnal. Inténtalo de nuevo más tarde > < :v");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

