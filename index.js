import http from 'node:http';

const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('¡El Franki-bot sigue vivo en Discord, mi Peps!\n');
});

server.listen(PORT, () => {
    console.log(`Servidor web falso escuchando en el puerto ${PORT}`);
});


import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'config.js');

const defaultConfig = `// For advanced configuration, edit \`constants.js\`.
const config = Object.freeze({
  defaultModel: 'gemini-1.5-flash',
  nanoBananaModel: 'gemini-2.5-flash-image',
  enableNanoBananaMode: false,
  maxGenerationAttempts: 1,
  defaultResponseFormat: 'Embedded',
  defaultResponseActionButtons: true,
  hexColour: '#505050',
  workInDMs: true,
  shouldDisplayPersonalityButtons: true,
  enableGeminiApiLogging: false,
  SEND_RETRY_ERRORS_TO_DISCORD: true,
  defaultPersonality:
    "You are Gemini, a large language model trained by Google.",
  activities: [
    {
      name: 'With Code',
      type: 'Playing',
    },
    {
      name: 'Something',
      type: 'Listening',
    },
    {
      name: 'Chicos estoy comiendo mortadela',
      type: 'Un enemigo de Fornite',
    },
  ],
  defaultServerSettings: {
    serverChatHistory: false,
    customServerPersonality: false,
    settingsSaveButton: 'decide',
    responseStyle: 'decide',
  },
  defaultChannelSettings: {
    alwaysRespond: false,
    channelWideChatHistory: false,
    customChannelPersonality: false,
    settingsSaveButton: 'decide',
    responseStyle: 'decide',
  },
  defaultGeminiToolPreferences: {
    googleSearch: true,
    urlContext: true,
    codeExecution: false,
  },
  chatHistoryLimits: {
    users: 10,
    servers: 12,
    channels: 15,
  },
  recentChannelMessagesLimit: 15,
});

export default config;


if (!fs.existsSync(configPath)) {
  console.log('config.js not found. Creating default configuration...');
  fs.writeFileSync(configPath, defaultConfig);
  console.log('Default config.js created.');
}

// Dynamically import the main application entry point
await import('./src/startup/main.js');
