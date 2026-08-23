const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Pana-Bot D-9 activo B)');
});

app.listen(PORT, () => {
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

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const prompt = message.content.replace(`<@!${client.user.id}>`, '').trim();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        await message.reply(text);

    } catch (error) {
        console.error("Error con Gemini:", error);
        
        if (error.status === 429) {
            await message.reply("Efe mi gente, la llave se quedó sin cuota (Error 429). Toca meter una nueva key xd.");
        } else {
            await message.reply("Me dio un calambre mental procesando eso, carnal > < :v");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
