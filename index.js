const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios'); // Asegúrate de tener axios en tu package.json
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Pana-Bot Supremo Multi-IA activo > :v');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP en puerto ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Tu key de Groq en las variables de entorno

// ==========================================
// 🧠 MEMORIA AISLADA GLOBAL POR USUARIO (HISTORIAL PLANO)
// Estructura: userId -> [ { role: 'user'/'model', parts: [{text: '...'}] } ]
// ==========================================
const historialesUsuarios = new Map();

client.once('ready', () => {
    console.log(`PANA-BOT SUPREMO conectado como ${client.user.tag}!`);
});

// ==========================================
// 🛡️ MOTOR DE AUTO-FALLBACK SUPREMO (GOOGLE ➡️ GROQ)
// ==========================================
async function obtenerRespuestaInteligente(userId, apodoServidor, systemInstruction, mensajeNuevo) {
    // 1. Inicializar historial del usuario si no existe
    if (!historialesUsuarios.has(userId)) {
        historialesUsuarios.set(userId, []);
    }
    const historial = historialesUsuarios.get(userId);

    // Agregar el mensaje actual del usuario al historial local
    historial.push({
        role: 'user',
        parts: [{ text: `[Usuario actual: ${apodoServidor}] - Mensaje: "${mensajeNuevo}"` }]
    });

    // Lista de modelos de Google a probar en orden
    const modelosGoogle = ['gemini-3.5-flash', 'gemini-3.5-pro'];

    let respuestaTexto = null;
    let errorCriticoGoogle = null;

    // FASE 1: Intentar con los modelos de Google en cadena
    for (const modeloId of modelosGoogle) {
        try {
            console.log(`🤖 Intentando con Google (${modeloId}) para el usuario ${apodoServidor}...`);
            const model = genai.getGenerativeModel({
                model: modeloId,
                systemInstruction: systemInstruction
            });

            // Creamos un chat temporal con el historial acumulado de este usuario
            const chat = model.startChat({ history: historial.slice(0, -1) }); // Excluimos el último para enviarlo con sendMessage
            const result = await chat.sendMessage(`[Usuario actual: ${apodoServidor}] - Mensaje: "${mensajeNuevo}"`);
            
            respuestaTexto = result.response.text();
            
            // Si triunfó, guardamos la respuesta del bot en el historial y salimos
            historial.push({ role: 'model', parts: [{ text: respuestaTexto }] });
            return { texto: respuestaTexto, proveedor: 'Google', modelo: modeloId };

        } catch (err) {
            console.log(`⚠️ Google (${modeloId}) falló (Status: ${err.status || 'Desconocido'}). Probando siguiente modelo...`);
            errorCriticoGoogle = err;
            // Si es 429 u otro error de cuota, pasamos al siguiente modelo de Google
            if (err.status === 429 || (err.message && err.message.includes('quota'))) {
                continue;
            } else {
                // Si es otro error de cliente, rompemos el ciclo de Google para evaluar irnos a Groq
                break;
            }
        }
    }

    // FASE 2: SALTO DE EMERGENCIA A GROQ (Si Google se murió por completo o dio 429)
    if (GROQ_API_KEY) {
        console.log(`🚨 Google colapsó con todas sus cuotas. Saltando a emergencia con GROQ (Llama 3)...`);
        try {
            // Traducimos el historial de Google al formato que acepta Groq
            // Groq usa: [{ role: 'system'/'user'/'assistant', content: '...' }]
            const mensajesGroq = [
                { role: 'system', content: systemInstruction }
            ];

            for (const h of historial) {
                const rolGroq = h.role === 'model' ? 'assistant' : 'user';
                const contenido = h.parts && h.parts[0] ? h.parts[0].text : '';
                mensajesGroq.push({ role: rolGroq, content: contenido });
            }

            const responseGroq = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama3-70b-8192', // O el modelo de Groq que prefieras
                messages: mensajesGroq,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            respuestaTexto = responseGroq.data.choices[0].message.content;

            // Guardamos la respuesta en el historial local adaptada
            historial.push({ role: 'model', parts: [{ text: respuestaTexto }] });
            return { texto: respuestaTexto, proveedor: 'Groq', modelo: 'llama3-70b' };

        } catch (errGroq) {
            console.error("❌ HASTA GROQ FALLÓ ALV:", errGroq.response?.data || errGroq.message);
            throw new Error("Se murieron todas las IAs, estamos jodidos alv.");
        }
    }

    throw errorCriticoGoogle;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const esMencionado = message.mentions.has(client.user);
    const esReplyASuMensaje = message.reference && message.reference.messageId;

    let esReplyDeEl = false;
    if (esReplyASuMensaje) {
        try {
            const mensajeOriginal = await message.channel.messages.fetch(message.reference.messageId);
            if (mensajeOriginal && mensajeOriginal.author.id === client.user.id) {
                esReplyDeEl = true;
            }
        } catch (e) {}
    }

    if (!esMencionado && !esReplyDeEl) return;

    try {
        await message.channel.sendTyping();

        const userId = message.author.id;
        const apodoServidor = message.member ? message.member.displayName : message.author.username;
        const contenidoLimpio = message.content
            .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
            .trim();

        const systemInstruction = `Eres Pana-Bot, una IA con una personalidad única, camaleónica y totalmente privada para cada persona con la que hablas.
No compartes información ni memorias de otros usuarios. 
Conforme vayas platicando con ${apodoServidor}, debes analizar su forma de escribir, sus gustos, su nivel de humor (si le gustan las groserías, el sarcasmo o ser directo) y adaptar tu forma de ser específicamente para encajar con él de forma natural, como si fueras un amigo personal exclusivo suyo.`;

        // Llamada a nuestro motor blindado con burbujas de memoria persistentes
        const resultadoIA = await obtenerRespuestaInteligente(userId, apodoServidor, systemInstruction, contenidoLimpio);

        console.log(`✨ Respuesta generada exitosamente mediante [${resultadoIA.proveedor} -> ${resultadoIA.modelo}] para ${apodoServidor}`);

        let text = resultadoIA.texto;

        if (text.length > 2000) {
            for (let i = 0; i < text.length; i += 2000) {
                await message.channel.send(text.substring(i, i + 2000));
            }
        } else {
            await message.reply(text);
        }

    } catch (error) {
        console.error("EL ERROR REAL ES:", error);
        await message.reply(`¡Efe mi gente, se fueron al carajo todas las IAs por exceso de tráfico (Error crítico)! Descansando un ratito alv 💀`);
    }
});

client.login(process.env.DISCORD_TOKEN);
