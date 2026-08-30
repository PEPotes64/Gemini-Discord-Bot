const express = require('express');
let requestCount = 0;
const MAX_REQUESTS = 5;
let resetTime = Date.now() + 60000; // 1 minuto a partir de ahora

// El relojito resetea el contador cada 1 minuto exacto
setInterval(() => {
    requestCount = 0;
    resetTime = Date.now() + 60000;
}, 60000);

// Diccionario de perfiles
const perfilesPanas = {
    "cadetecraft": "Es el Cadete. Tiene un humor muy internauta, su avatar es un traje galáctico y le encanta dibujar.",
    "monster_dark1264": "Es Dark. Tiene un humor demasiado pasado de tono, siempre anda caliente y le re encanta dibujar.",
    "cartoontv01": "Es Juan. Es staff del server, tiene una personalidad tranquila pero comparte el humor de los demás panas.",
    "itzzred777": "Es Red. Es staff del server, tiene un humor ácido e internauta, le encanta dibujar y su avatar es 1.",
    "mg019": "Es M6. Uno de los creador del server, la persona más carismática y tranquila que se conecta cada mil años.",
    "pepotes777": "Es Pepo. El creador, dueño del server y admin principal. Tiene un humor ácido, pero le encanta que le respue"
};

// Declaración global de herramientas (Crear y Eliminar canales)
const tools = [
    {
        functionDeclarations: [
            {
                name: "crearCanalTexto",
                description: "Crea un nuevo canal de texto en el servidor de Discord, opcionalmente dentro de una categoría.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "El nombre que tendrá el canal de texto." },
                        categoria: { type: "STRING", description: "El nombre exacto de la categoría donde se colocará el canal." }
                    },
                    required: ["nombre"]
                }
            },
            {
                name: "eliminarCanal",
                description: "Elimina un canal de texto o voz del servidor de Discord buscando su nombre.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "El nombre exacto o parte del nombre del canal que se quiere eliminar." }
                    },
                    required: ["nombre"]
                }
            }
        ]
    }
];

const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Pana-Bot D-9 activo 🗿');
});

app.listen(PORT, '0.0.0.0', () => {
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
            tools: tools, 
            systemInstruction: 'Eres Pana-Bot, un asistente con permisos de administración en Discord.'
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

        const functionCalls = response.functionCalls ? response.functionCalls() : null;

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            
            if (call.name === "crearCanalTexto") {
                const nombreCanal = call.args.nombre;
                const nombreCategoria = call.args.categoria;
                
                let parentId = null;

                if (nombreCategoria) {
                    const categoriaEncontrada = message.guild.channels.cache.find(
                        c => c.type === 4 && c.name.toLowerCase().includes(nombreCategoria.toLowerCase())
                    );
                    if (categoriaEncontrada) {
                        parentId = categoriaEncontrada.id;
                    }
                }
                
                await message.guild.channels.create({
                    name: nombreCanal,
                    type: 0,
                    parent: parentId 
                });

                await message.reply(`¡Hecho, mi pana! Canal #${nombreCanal} creado con éxito ${parentId ? 'en su respectiva categoría 🗿' : 'suelto porque no hallé la categoría 🗿'}`);
            } 
            else if (call.name === "eliminarCanal") {
                const nombreCanalBuscado = call.args.nombre.toLowerCase();
                const canalAEliminar = message.guild.channels.cache.find(
                    c => c.name.toLowerCase().includes(nombreCanalBuscado)
                );

                if (canalAEliminar) {
                    await canalAEliminar.delete();
                    await message.reply(`¡Ala, chingo a su madre el canal #${canalAEliminar.name}! Borrado con éxito 🗿`);
                } else {
                    await message.reply(`Puchis, no encontré ningún canal que se llame o se parezca a "${call.args.nombre}" para borrarlo 🗿`);
                }
            }
        } else {
            let text = response.text();
            text += `\n\n_te quedan ${remainingRequests}/${MAX_REQUESTS}, tiempo restante: ${timeString}_`;
            await message.reply(text);
        }

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
    
