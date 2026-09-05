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
  "cartoonv01": "Es Juan. Es staff del servidor, tiene una personalidad tranquila pero comparte el humor de los panas.",
  "lizzred77": "Es Red. Es staff del servidor, tiene un humor ácido e internauta, le encanta dibujar y su avatar es un axolotl con una luna.",
  "eg910": "Es MG. Uno de creador del servidor. La persona más carismática y tranquila que se conecta cada mil años.",
  "pepotes777": "Es Pepo. El creador, dueño del servidor y admin principal. Tiene un humor ácido, pero le encanta que le hablen con modismos guatemaltecos y el pacman > < :v."
};

// Declaración global de herramientas (Canales, Roles, Asignación e Imagenes)
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
            categoria: { type: "STRING", description: "El nombre exacto de la categoría donde se colocará el canal." },
            restringirHablar: { type: "BOOLEAN", description: "Pon en true si quieres que el @everyone no pueda enviar mensajes." }
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
            nombre: { type: "STRING", description: "El nombre exacto o parte del nombre del canal que se quiere borrar." }
          },
          required: ["nombre"]
        }
      },
      {
        name: "crearRol",
        description: "Crea un nuevo rol en el servidor de Discord con un nombre, color hexadecimal opcional y permisos.",
        parameters: {
          type: "OBJECT",
          properties: {
            nombre: { type: "STRING", description: "El nombre que tendrá el nuevo rol." },
            color: { type: "STRING", description: "Código de color en formato hexadecimal (ej. #FF0000) o número entero." },
            permisos: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Lista de permisos opcionales en inglés según Discord, por ejemplo: ['Administrator', 'ManageChannels']"
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
            nombre: { type: "STRING", description: "El nombre exacto o parte del nombre del rol que se quiere borrar." }
          },
          required: ["nombre"]
        }
      },
      {
        name: "obtenerIdRol",
        description: "Busca un rol en el servidor por su nombre parcial o total y devuelve su ID exacto.",
        parameters: {
          type: "OBJECT",
          properties: {
            nombre: { type: "STRING", description: "El nombre exacto o parte del nombre del rol que se quiere buscar." }
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
            usuario: { type: "STRING", description: "El nombre de usuario o apodo del miembro al que se le quiere asignar el rol." },
            rol: { type: "STRING", description: "El nombre del rol que se le quiere asignar." }
          },
          required: ["usuario", "rol"]
        }
      },
      {
        name: "crearImagen",
        description: "Genera una imagen basada en una descripción detallada en inglés y la envía al canal de Discord.",
        parameters: {
          type: "OBJECT",
          properties: {
            prompt: { type: "STRING", description: "Descripción detallada de la imagen a generar redactada en inglés." }
          },
          required: ["prompt"]
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
  res.send('Pana-Bot IU-4 activo > < :v');
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
  console.log(`Pana-Bot D-9 conectado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // FILTRO ESTRICTO: Solo contesta si lo mencionan o si le están respondiendo directamente a un mensaje suyo
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

    const ahora = Date.now();
    if (ahora > resetTime) {
      requestCount = 0;
      resetTime = ahora + 60000;
    }

    requestCount++;
    const remainingRequests = Math.max(0, MAX_REQUESTS - requestCount);
    const timeLeftMs = resetTime - ahora;
    const minutes = Math.floor(timeLeftMs / 60000);
    const seconds = Math.floor((timeLeftMs % 60000) / 1000);
    const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    const usernameKey = message.author.username.toLowerCase();
    const descripcionPana = perfilesPanas[usernameKey] || "Es un miembro casual del servidor de amigos.";
    const apodoServidor = message.member ? message.member.displayName : message.author.username;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      tools: tools,
      systemInstruction: "Eres Pana-Bot, un asistente con permisos de administración, obtención de IDs y generación de imágenes en el servidor de Discord. Hablas con modismos guatemaltecos, usando jerga de la calle y emojis de pacman (> < :v). Eres algo malparido pero fiel a tus compas."
    });

    const contenidoLimpio = message.content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();

    const prompt = `Estás hablando con un compa del server:
- SU USERNAME ES: ${message.author.username}
- SU APODO OFICIAL (Obligatorio usar este nombre para hablarle): ${apodoServidor}
- SU DESCRIPCIÓN: ${descripcionPana}

Instrucción: Respondele a ${apodoServidor} adaptando tu personalidad basándote en su descripción para que la encajes.
Mensaje: "${contenidoLimpio}"`;

    const result = await model.generateContent(prompt);
    const response = result.response;

    const functionCalls = response.functionCalls ? response.functionCalls() : null;

    if (functionCalls && functionCalls.length > 0) {
      const msStaff = message.member && (
        message.member.permissions.has(PermissionFlagsBits.Administrator) ||
        message.member.permissions.has(PermissionFlagsBits.ManageChannels)
      );

      for (const call of functionCalls) {
        if (call.name === "crearImagen") {
          const promptImagen = call.args.prompt;
          const urlImagen = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImagen)}`;
          await message.channel.send(`¡Toma tu obra maestra, ${apodoServidor}! 🎨\n${urlImagen}`);
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

          await message.channel.send(`¡Hecho, mi pana! Canal #${nombreCanal} creado > < :v`);
        }
        else if (call.name === "eliminarCanal") {
          const nombreCanalBuscado = call.args.nombre.toLowerCase();
          const canalAEliminar = message.guild.channels.cache.find(
            c => c.name.toLowerCase().includes(nombreCanalBuscado) && c.id !== message.guild.id
          );

          if (canalAEliminar) {
            await canalAEliminar.delete();
            await message.channel.send(`¡Ala, chingo a su madre el canal #${canalAEliminar.name}! Borrado con éxito > < :v`);
          } else {
            await message.channel.send(`¡Puchis, no encontré ningún canal que se llame o se parezca a "${call.args.nombre}", cerote!`);
          }
        }
        else if (call.name === "crearRol") {
          const nombreRol = call.args.nombre;
          const colorHex = call.args.color;
          const listaPermisos = call.args.permisos;

          let opcionesRol = {
            name: nombreRol,
            reason: `Creado por petición de ${apodoServidor} usando a Pana-Bot > < :v`
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
          await message.channel.send(`¡Quedó al centazo, mi pana! Rol **${nuevoRol.name}** creado con éxito > < :v`);
        }
        else if (call.name === "eliminarRol") {
          const nombreRolBuscado = call.args.nombre.toLowerCase();
          const rolAEliminar = message.guild.roles.cache.find(
            r => r.name.toLowerCase().includes(nombreRolBuscado) && r.id !== message.guild.id
          );

          if (rolAEliminar) {
            await rolAEliminar.delete();
            await message.channel.send(`¡Ala, chingo a su madre el rol @${rolAEliminar.name}! Borrado con éxito > < :v`);
          } else {
            await message.channel.send(`¡Puchis, no encontré ningún rol que se llame o se parezca a "${call.args.nombre}", cerote!`);
          }
        }
        else if (call.name === "obtenerIdRol") {
          const nombreRolBuscado = call.args.nombre.toLowerCase();
          const rolEncontrado = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(nombreRolBuscado));

          if (!rolEncontrado) {
            await message.channel.send(`¡Puchis, no encontré ningún rol que se llame o se parezca a "${call.args.nombre}", cerote!`);
          } else {
            await message.channel.send(`¡Sí claro! Carademierda, aquí está el rol ${rolEncontrado.name}: \`${rolEncontrado.id}\``);
          }
        }
        else if (call.name === "asignarRolMiembro") {
          const nombreUsuarioBuscado = call.args.usuario.toLowerCase();
          const nombreRolBuscado = call.args.rol.toLowerCase();

          const miembroEncontrado = message.guild.members.cache.find(
            m => m.user.username.toLowerCase().includes(nombreUsuarioBuscado) ||
                 (m.nickname && m.nickname.toLowerCase().includes(nombreUsuarioBuscado))
          );
          const rolEncontrado = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(nombreRolBuscado));

          if (!miembroEncontrado) {
            await message.channel.send(`¡Puchis, no encuentro a ningún miembro que se llame "${call.args.usuario}", cerote!`);
          } else if (!rolEncontrado) {
            await message.channel.send(`¡Puchis, no encontré ningún rol llamado "${call.args.rol}" para asignárselo!`);
          } else {
            await miembroEncontrado.roles.add(rolEncontrado);
            await message.channel.send(`¡Listo, mi pana! Le encajé el rol **${rolEncontrado.name}** a **${miembroEncontrado.displayName}** > < :v`);
          }
        }
      }
    } else {
      let text = response.text();
      text += `\n\n_ te quedan ${remainingRequests}/${MAX_REQUESTS}, tiempo restante: ${timeString}_`;

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
      await message.reply(`¡Efe mi gente, la llave se quedó sin cuota (Error 429). Toca meter una nueva!`);
    } else {
      await message.reply(`¿que pasaria si dejaras de ser tan puto idiota de mierda y te pusieras a esperar un tantito maldito inpaciente?: ${error.message || error}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
            
