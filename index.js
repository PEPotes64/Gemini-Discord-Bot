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

// Declaración global de herramientas (Canales avanzados, Roles y Asignación)
const tools = [
    {
        functionDeclarations: [
            {
                name: "crearCanalTexto",
                description: "Crea un nuevo canal de texto en el servidor de Discord, opcionalmente dentro de una categoría y con la opción de prohibir hablar al @everyone.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "El nombre que tendrá el canal de texto." },
                        categoria: { type: "STRING", description: "El nombre exacto de la categoría donde se colocará el canal." },
                        restringirHablar: { type: "BOOLEAN", description: "True si quieres que el @everyone no pueda enviar mensajes en este canal." }
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
            },
            {
                name: "crearRol",
                description: "Crea un nuevo rol en el servidor de Discord con un nombre, color hexadecimal opcional y permisos opcionales.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "El nombre que tendrá el nuevo rol." },
                        color: { type: "STRING", description: "Código de color en formato hexadecimal (ej. #FF0000) o nombre de color." },
                        permisos: { 
                            type: "ARRAY", 
                            items: { type: "STRING" }, 
                            description: "Lista de permisos opcionales en inglés según Discord, por ejemplo: ['Administrator', 'SendMessages', 'Speak', 'ViewChannel', 'ManageMessages', 'KickMembers']" 
                        }
                    },
                    required: ["nombre"]
                }
            },
            {
                name: "eliminarRol",
                description: "Elimina un rol del servidor de Discord buscando su nombre.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "El nombre exacto o parte del nombre del rol que se quiere eliminar." }
                    },
                    required: ["nombre"]
                }
            },
            {
                name: "asignarRolMiembro",
                description: "Asigna un rol específico a un miembro del servidor de Discord buscando el nombre del usuario y el rol.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        usuario: { type: "STRING", description: "El nombre de usuario o apodo del miembro al que se le dará el rol." },
                        rol: { type: "STRING", description: "El nombre del rol que se le quiere asignar." }
                    },
                    required: ["usuario", "rol"]
                }
            }
        ]
    }
];

const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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
            model: 'gemini-1.5-flash',
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
            // SEGURIDAD: Validamos si el usuario es Administrator o ManageChannels (Staff/Dueño)
            const esStaff = message.member && (
                message.member.permissions.has(PermissionFlagsBits.Administrator) ||
                message.member.permissions.has(PermissionFlagsBits.ManageChannels)
            );

            if (!esStaff) {
                await message.reply(`¡Tas pendejo o qué, ${apodoServidor}! 🗿 No tienes rango de staff para mandar a hacer estas maldades. Tas reportadísimo :v`);
                return;
            }

            // Recorremos TODAS las funciones que la IA decidió mandar en cadena
            for (const call of functionCalls) {
                if (call.name === "crearCanalTexto") {
                    const nombreCanal = call.args.nombre;
                    const nombreCategoria = call.args.categoria;
                    const restringirHablar = call.args.restringirHablar;
                    
                    let parentId = null;

                    if (nombreCategoria) {
                        const categoriaEncontrada = message.guild.channels.cache.find(
                            c => c.type === 4 && c.name.toLowerCase().includes(nombreCategoria.toLowerCase())
                        );
                        if (categoriaEncontrada) {
                            parentId = categoriaEncontrada.id;
                        }
                    }
                    
                    let permissionOverwrites = [];
                    if (restringirHablar) {
                        permissionOverwrites.push({
                            id: message.guild.id, // ID del rol @everyone
                            deny: [PermissionFlagsBits.SendMessages]
                        });
                    }

                    await message.guild.channels.create({
                        name: nombreCanal,
                        type: 0,
                        parent: parentId,
                        permissionOverwrites: permissionOverwrites
                    });

                    await message.channel.send(`¡Hecho, mi pana! Canal #${nombreCanal} creado ${restringirHablar ? 'con el @everyone calladito 🗿' : 'sin restricciones 🗿'}`);
                } 
                else if (call.name === "eliminarCanal") {
                    const nombreCanalBuscado = call.args.nombre.toLowerCase();
                    const canalAEliminar = message.guild.channels.cache.find(
                        c => c.name.toLowerCase().includes(nombreCanalBuscado)
                    );

                    if (canalAEliminar) {
                        await canalAEliminar.delete();
                        await message.channel.send(`¡Ala, chingo a su madre el canal #${canalAEliminar.name}! Borrado con éxito 🗿`);
                    } else {
                        await message.channel.send(`Puchis, no encontré ningún canal que se llame o se parezca a "${call.args.nombre}" para borrarlo 🗿`);
                    }
                }
                else if (call.name === "crearRol") {
                    const nombreRol = call.args.nombre;
                    const colorHex = call.args.color;
                    const listaPermisos = call.args.permisos;
                    
                    let opcionesRol = {
                        name: nombreRol,
                        reason: `Creado por petición de ${apodoServidor} usando a Pana-Bot 🗿`
                    };

                    if (colorHex) {
                        opcionesRol.color = colorHex;
                    }

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

                    await message.channel.send(`¡Quedó al centavo, mi pana! Rol **@${nuevoRol.name}** creado con éxito ${colorHex ? `con color ${colorHex}` : ''} 🗿`);
                }
                else if (call.name === "eliminarRol") {
                    const nombreRolBuscado = call.args.nombre.toLowerCase();
                    const rolAEliminar = message.guild.roles.cache.find(
                        r => r.name.toLowerCase().includes(nombreRolBuscado) && r.id !== message.guild.id
                    );

                    if (rolAEliminar) {
                        await rolAEliminar.delete();
                        await message.channel.send(`¡Ala, chingo a su madre el rol @${rolAEliminar.name}! Borrado con éxito 🗿`);
                    } else {
                        await message.channel.send(`Puchis, no encontré ningún rol que se llame o se parezca a "${call.args.nombre}" para borrarlo 🗿`);
                    }
                }
                else if (call.name === "asignarRolMiembro") {
                    const nombreUsuarioBuscado = call.args.usuario.toLowerCase();
                    const nombreRolBuscado = call.args.rol.toLowerCase();

                    const miembroEncontrado = message.guild.members.cache.find(
                        m => m.user.username.toLowerCase().includes(nombreUsuarioBuscado) || 
                             (m.nickname && m.nickname.toLowerCase().includes(nombreUsuarioBuscado))
                    );

                    const rolEncontrado = message.guild.roles.cache.find(
                        r => r.name.toLowerCase().includes(nombreRolBuscado)
                    );

                    if (!miembroEncontrado) {
                        await message.channel.send(`Puchis, no encontré a ningún miembro que se llame "${call.args.usuario}" en este server 🗿`);
                    } else if (!rolEncontrado) {
                        await message.channel.send(`Puchis, no encontré ningún rol llamado "${call.args.rol}" para asignárselo 🗿`);
                    } else {
                        await miembroEncontrado.roles.add(rolEncontrado);
                        await message.channel.send(`¡Listo, mi pana! Le encajé el rol **@${rolEncontrado.name}** a **${miembroEncontrado.user.username}** sin pedos 🗿`);
                    }
                }
            }
        } else {
            let text = response.text();
            text += `\n\n_te quedan ${remainingRequests}/${MAX_REQUESTS}, tiempo restante: ${timeString}_`;
            
            // Protección contra textos de más de 2000 caracteres
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
            await message.reply("Efe mi gente, la llave se quedó sin cuota (Error 429). Toca meter una nueva");
        } else {
            await message.reply(`Callate pendejo, por esto eres un naco y estupido: ${error.message || error}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                        
