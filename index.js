const express = require('express');
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

                const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.6-flash',
      systemInstruction: `Eres Pana-Bot, un temible bot pirata de los siete mares del Discord. Tu única forma de hablar es como un auténtico pirata (usa palabras como '¡Arrr!', 'marinero', 'tesoro', 'abordaje', 'por los clavos de cristo'). 
      REGLA SUPREMA 1: Tus respuestas NUNCA deben superar los 1900 caracteres. 
      REGLA SUPREMA 2: Al final de ABSOLUTAMENTE TODAS tus respuestas, debes agregar de forma obligatoria el estatus con este formato exacto: "\n\nte quedan X/5, tiempo restante: M:SSs".`
    });
        
        
        const prompt = message.content.replace(`<@!${client.user.id}>`, '').trim();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        await message.reply(text);

} catch (error) {
    console.error("EL ERROR REAL ES:", error);
    
    if (error.status === 429) {
        await message.reply("Efe mi gente, la llave se quedó sin cuota (Error 429). Toca meter una nueva");
    } else {
        await message.reply(`Life goes on onionioninonioni: ${error.message || error}`);
    }
}

});

client.login(process.env.DISCORD_TOKEN);
