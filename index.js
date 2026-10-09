const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Pana-Bot IA 4.5 Dinámico activo > :v');
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

// ==========================================
// 🧠 MEMORIA AISLADA POR USUARIO (MAPA DE CHATS)
// ==========================================
const sesionesUsuarios = new Map(); // Guarda un objeto chat por cada userId

client.once('ready', () => {
    console.log(`ULTRA-BOT DINÁMICO conectado como ${client.user.tag}!`);
});

// ==========================================
// 🛡️ FUNCIÓN DE ENVÍO DE MENSAJE CON AUTO-FALLBACK
// ==========================================
async function enviarMensajeConResguardo(chatSession, mensajeTexto) {
    const modelosDisponibles = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
    ];

    let ultimoError = null;

    for (const modeloId of modelosDisponibles) {
        try {
            // Nota: Si cambiamos de modelo en caliente, recreamos la sesión o usamos sendMessage
            const result = await chatSession.sendMessage(mensajeTexto);
            return result.response;
        } catch (err) {
            ultimoError = err;
            console.log(`⚠️ Error con modelo en chat individual (Status: ${err.status || 'Desconocido'}). Probando respaldo...`);
            if (err.status === 429 || (err.message && err.message.includes('quota'))) {
                continue;
            } else {
                throw err;
            }
        }
    }
    throw ultimoError;
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

        // ==========================================
        // 🧬 CREAR O RECUPERAR LA SESIÓN ÚNICA DEL USUARIO
        // ==========================================
        if (!sesionesUsuarios.has(userId)) {
            console.log(`✨ Creando nueva burbuja mental aislada para el usuario: ${apodoServidor} (${userId})`);
            
            const model = genai.getGenerativeModel({
                model: 'gemini-1.5-flash',
                systemInstruction: `Eres Pana-Bot, una IA con una personalidad única, camaleónica y totalmente privada para cada persona con la que hablas.
No compartes información ni memorias de otros usuarios. 
Conforme vayas platicando con ${apodoServidor}, debes analizar su forma de escribir, sus gustos, su nivel de humor (si le gustan las groserías, el sarcasmo o ser directo) y adaptar tu forma de ser específicamente para encajar con él de forma natural, como si fueras un amigo personal exclusivo suyo.
Tienes acceso a herramientas para crear canales, roles y generar imágenes si te lo pide explícitamente.`
            });

            // Iniciamos un chat independiente exclusivo para este ID de usuario
            const chat = model.startChat({
                history: []
            });
            sesionesUsuarios.set(userId, chat);
        }

        const chatUsuario = sesionesUsuarios.get(userId);

        // Construir el prompt individual
        const promptFinal = `[Usuario actual: ${apodo]: ${apodoServidor}] - Mensaje: "${contenidoLimpio}"`;

        // 🛡️ ENVIAR MENSAJE A LA SESIÓN PRIVADA CON AUTO-FALLBACK
        const response = await enviarMensajeConResguardo(chatUsuario, promptFinal);

        const functionCalls = response.functionCalls ? response.functionCalls() : null;

        if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
                if (call.name === "crearImagen") {
                    const promptImagen = call.args.prompt;
                    const urlImagen = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImagen)}`;
                    await message.channel.send(`¡Toma tu obra maestra exclusiva, ${apodoServidor}! 🎨 \n${urlImagen}`);
                }
                else if (call.name === "crearCanalTexto") {
                    const nombreCanal = call.args.nombre;
                    const nombreCategoria = call.args.categoria;
                    const restringirHablar = call.args.restringirHablar;

                    let parentId = null;
                    if (nombreCategoria) {
                        const categoriaEncontrada = message.guild.channels.cache.find(
                            c => c.type === 4 && c.name.toLowerCase().includes(nombreCategoria.toLowerCase())
                        );
                        if (categoriaEncontrada) parentId = categoriaEncontrada.id;
                    }

                    let permissionOverwrites = [];
                    if (restringirHablar) {
                        permissionOverwrites.push({
                            id: message.guild.id,
                            deny: [PermissionFlagsBits.SendMessages]
                        });
                    }

                    await message.guild.channels.create({
                        name: nombreCanal,
                        type: 0,
                        parent: parentId,
                        permissionOverwrites: permissionOverwrites
                    });

                    await message.channel.send(`¡Hecho, mi pana ${apodoServidor}! Canal #${nombreCanal} creado`);
                }
                else if (call.name === "eliminarCanal") {
                    const nombreCanalBuscado = call.args.nombre.toLowerCase();
                    const canalAEliminar = message.guild.channels.cache.find(
                        c => c.name.toLowerCase().includes(nombreCanalBuscado) && c.id !== message.guild.id
                    );

                    if (canalAEliminar) {
                        await canalAEliminar.delete();
                        await message.channel.send(`¡Extermine el canal #${canalAEliminar.name} por orden de ${apodoServidor}!`);
                    } else {
                        await message.channel.send(`¡Esa nmd no existe we, escribí bien!`);
                    }
                }
                else if (call.name === "crearRol") {
                    const nombreRol = call.args.nombre;
                    const colorHex = call.args.color;
                    const listaPermisos = call.args.permisos;

                    let opcionesRol = {
                        name: nombreRol,
                        reason: `Creado por petición de ${apodoServidor}`
                    };

                    if (colorHex) opcionesRol.color = colorHex;

                    if (listaPermisos && Array.isArray(listaPermisos)) {
                        let permisosFinales = [];
                        for (const perm of listaPermisos) {
                            if (PermissionFlagsBits[perm]) {
                                permisosFinales.push(PermissionFlagsBits[perm]);
                            }
                        }
                        opcionesRol.permissions = permisosFinales;
                    }

                    const nuevoRol = await message.guild.roles.create(opcionesRol);
                    await message.channel.send(`¡Ya esta ${apodoServidor}! Rol **${nuevoRol.name}** creado con éxito`);
                }
                else if (call.name === "eliminarRol") {
                    const nombreRolBuscado = call.args.nombre.toLowerCase();
                    const rolAEliminar = message.guild.roles.cache.find(
                        r => r.name.toLowerCase().includes(nombreRolBuscado) && r.id !== message.guild.id
                    );

                    if (rolAEliminar) {
                        await rolAEliminar.delete();
                        await message.channel.send(`¡Extermine el rol @${rolAEliminar.name}!`);
                    } else {
                        await message.channel.send(`¡Eso de "${call.args.nombre}" no existe idiota!`);
                    }
                }
            }
        } else {
            let text = response.text();
            
            if (text.length > 2000) {
                for (let i = 0; i < text.length; i += 2000) {
                    await message.channel.send(text.substring(i, i + 2000));
                }
            } else {
                await message.reply(text);
            }
        }

    } catch (error) {
        console.error("EL ERROR REAL ES:", error);
        if (error.status === 429) {
            await message.reply('¡Efe mi gente, la cuota se saturó con tantas memorias individuales (Error 429). Descansando un ratito alv! 💀');
        } else {
            await message.reply(`¡Error de mrda alv: ${error.message || error} :v`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
  
