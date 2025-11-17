const axios = require('axios');
const { Parser } = require('xml2js');
const { promises: fs } = require('fs');
const path = require('path');
const OpenAI = require('openai');

async function getProviderConfig() {
  const xmlPath = path.resolve(__dirname, '../providers.xml');
  const xmlData = await fs.readFile(xmlPath, 'utf8');
  const parser = new Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlData);
  return result.providers.provider;
}

async function generate(prompt, providerName, model) {
  const providers = await getProviderConfig();
  const provider = providers.find(p => p.$.name === providerName);

  if (!provider) {
    throw new Error(`Provider "${providerName}" not found.`);
  }

  const apiKey = process.env[provider.env_var];
  if (!apiKey && providerName !== 'offline' && providerName !== 'ollama_local') {
    throw new Error(`API key for ${providerName} not set. Please set ${provider.env_var} in your .env file.`);
  }

  switch (providerName) {
    case 'openai':
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: `Generate ASCII art for the following prompt: ${prompt}` }],
      });
      return response.choices[0].message.content;

    case 'anthropic':
        // Anthropic specific implementation
        const anthropicResponse = await axios.post('https://api.anthropic.com/v1/messages', {
            model: model || "claude-3-opus-20240229",
            max_tokens: 1024,
            messages: [{ role: "user", content: `Generate ASCII art for the following prompt: ${prompt}` }]
        }, {
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });
        return anthropicResponse.data.content[0].text;

    case 'ollama_local':
        const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
        const ollamaResponse = await axios.post(`${ollamaHost}/api/generate`, {
            model: ollamaModel,
            prompt: `Generate ASCII art for the following prompt: ${prompt}`,
            stream: false
        });
        return ollamaResponse.data.response;

    case 'offline':
      return `
      Offline mode:
      Prompt: ${prompt}
      WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
      WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
      WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
      WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
      `;

    default:
      throw new Error(`Provider "${providerName}" is not supported yet.`);
  }
}

module.exports = { generate };
