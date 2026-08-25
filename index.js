const express = require('express');
let requestCount = 0;
const MAX_REQUESTS = 5;
let resetTime = Date.now() + 60000; // 1 minuto a partir de ahora

// El relojito resetea el contador cada 1 minuto exacto
setInterval(() => {
  requestCount = 0;
  resetTime = Date.now() + 60000;
}, 60000);

const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Pana-Bot D-9 activo B)');
});

app.listen(PORT,'0.0.0.0', () => {
    console.log(`Servidor HTTP en puerto ${PORT}`);
});

const client = new Client({
        intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

client.once('ready', () => {
    console.log(`¡Pana-Bot D-9 conectado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.includes(client.user.id)) return;

    try {
        await message.channel.sendTyping();

        // Verificamos si ya pasó el minuto para resetear el reloj
        const ahora = Date.now();
        if (ahora >= resetTime) {
            requestCount = 0;
            resetTime = ahora + 60000;
        }

        requestCount++;
        const remainingRequests = Math.max(0, MAX_REQUESTS - requestCount);
        
        const timeLeftMs = Math.max(0, resetTime - ahora);
        const minutes = Math.floor(timeLeftMs / 60000);
        const seconds = Math.floor((timeLeftMs % 60000) / 1000);
        const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}s`;
      
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.6-flash',
            systemInstruction: 'Eres Pana-Bot, un temible bot pirata de los siete mares del Discord. Tu única forma de hablar es como un auténtico pirata. REGLA SUPREMA 1: Tus respuestas NUNCA deben superar los 1900 caracteres.'
        });

        const prompt = message.content.replace(`<@!${client.user.id}>`, '').trim();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        text += `\n\nte quedan ${remainingRequests}/${MAX_REQUESTS}, tiempo restante: ${timeString}`;

        await message.reply(text);

    } catch (error) {
        console.error("EL ERROR REAL ES:", error);

        if (error.status === 429) {
            await message.reply("Efe mi gente, la llave se quedó sin cuota (Error 429). Toca meter una nueva");
        } else {
            await message.reply(`Life goes on onioninoninonioni: ${error.message || error}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

