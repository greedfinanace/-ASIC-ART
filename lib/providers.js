const axios = require('axios');
const OpenAI = require('openai');

async function callOpenAIChat(prompt, apiKey, model, style) {
  const openai = new OpenAI({ apiKey });
  const systemPrompt = `You are an expert art generator. Create a piece of art in the style of '${style}' based on the following prompt. Only return the art itself, with no additional text, explanation, or markdown.`;

  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  });

  return completion.choices[0].message.content;
}

async function callOllamaLocal(prompt, model, style) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const url = `${host}/api/generate`;
  const systemPrompt = `You are an expert art generator. Create a piece of art in the style of '${style}' based on the following prompt. Only return the art itself, with no additional text, explanation, or markdown.`;

  const response = await axios.post(url, {
    model: model || 'llama2',
    prompt: `${systemPrompt}\n\n${prompt}`,
    stream: false
  });

  return response.data.response;
}

function generateOffline(prompt, style) {
  const templates = {
    ascii: [
      `
         .    .        *        .
            _.-._        *
         .-'     '-.    .     .
        (  *   *   )  ${prompt}
         '-._____.-'       .
      `,
      `
        . . .     .  .   .   .     .
          .--.      .--.   ${prompt}
         (    )    (    )   .  .
          '--'      '--'
      `
    ],
    chaos: [
      `▓░▒▓░ ${prompt} ░▒▓░\\n~*~*~*~*~`,
      `//\\\\//\\\\ ${prompt} \\\\//\\\\//`
    ],
    verse: [
      `${prompt}\\n    — an echo in ascii —`
    ],
    banner: [
      `##########\\n# ${prompt} #\\n##########`
    ]
  };

  const styleTemplates = templates[style] || templates.ascii;
  const template = styleTemplates[Math.floor(Math.random() * styleTemplates.length)];
  return template.replace(/\\n/g, '\n');
}

module.exports = {
  callOpenAIChat,
  callOllamaLocal,
  generateOffline,
};
