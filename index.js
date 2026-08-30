const express = require('express');
let requestCount = 0;
const MAX_REQUESTS = 5;
let resetTime = Date.now() + 60000; // 1 minuto a partir de ahora

// El relojito resetea el contador cada 1 minuto exacto
setInterval(() => {
  requestCount = 0;
  resetTime = Date.now() + 60000;
}, 60000);

    // Arriba de todo esto dejas el diccionario de perfiles (lo podés poner afuera del client.on para que no se reescriba cada vez)
    const perfilesPanas = {
        "cadetecraft": "Es el Cadete. Tiene un humor muy internauta, su avatar es un traje galáctico y le encanta dibujar de vez en cuando.",
        "monster_dark1264": "Es Dark. Tiene un humor demasiado pasado de tono, siempre anda caliente y le re encanta dibujar. Su avatar es un pez diablo.",
        "cartoontv01": "Es Juan. Es staff del server, tiene una personalidad tranquila pero comparte el humor de los demás panas, y le encanta dibujar con su avatar de pintor.",
        "itzzred777": "Es Red. Es staff del server, tiene un humor ácido e internauta, le encanta dibujar y su avatar es literalmente un color rojo.",
        "mgj019": "Es MG. Uno de los creador del server, la persona más carismática y tranquila que se conecta cada mil años. Su avatar es el Vault Boy.",
        "pepotes777": "Es Pepo. El creador, dueño del server y admin principal. Tiene un humor ácido, pero le encanta que le respondas en un modo bastante neutro y siempre dando alguna sugerencia útil sin que él te la pida."
    };

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
        
        const timeLeftNs = Math.max(0, resetTime - ahora);
        const minutes = Math.floor(timeLeftNs / 60000);
        const seconds = Math.floor((timeLeftNs % 60000) / 1000);
        const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

                const usernameKey = message.author.username.toLowerCase();
        const descripcionPana = perfilesPanas[usernameKey] || "Es un miembro casual del servidor de amigos.";
        const apodoServidor = message.member ? message.member.displayName : message.author.username;

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            systemInstruction: 'Eres Pana-Bot, un asistente de IA en un servidor de Discord de amigos. Tu meta es responder siempre usando el apodo oficial del usuario y adaptando tu tono a su descripción.'
        });

        const contenidoLimpio = message.content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();
        
        const prompt = `Estás hablando con un compa del server:
- Su username es: "${message.author.username}"
- SU APODO OFICIAL (Obligatorio usar este nombre para hablarle): "${apodoServidor}"
- Su descripción: "${descripcionPana}"

Instrucción: Respóndele a "${apodoServidor}" adaptando tu personalidad basándote en su descripción para que le encante.
Mensaje: "${contenidoLimpio}"`;

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
            await message.reply(`Life gous on onioninoninonioni: ${error.message || error}`);
        }
      }

});

client.login(process.env.DISCORD_TOKEN);

