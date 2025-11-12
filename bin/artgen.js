#!/usr/bin/env node
require('dotenv').config();

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const jpeg = require('jpeg-js');
const xml2js = require('xml2js');
const { callOpenAIChat, callOllamaLocal, generateOffline } = require('../lib/providers');

const program = new Command();

program
  .name('artgen')
  .description('A versatile tool to generate ASCII art from text or images.')
  .version('3.0.0');

program
  .command('gen <prompt>')
  .description('Generate art from a text prompt using an AI provider.')
  .option('--provider <provider>', 'The AI provider to use.', 'openai')
  .option('--model <model>', 'The specific AI model to use (provider-dependent).', 'gpt-4o-mini')
  .option('--style <style>', 'The style of the generated art.', 'ascii')
  .action(async (prompt, options) => {
    const { provider, model, style } = options;

    try {
      const providersXmlPath = path.resolve(__dirname, '../providers.xml');
      const providersXml = await fs.promises.readFile(providersXmlPath, 'utf8');
      const parsedXml = await xml2js.parseStringPromise(providersXml);
      const providers = parsedXml.providers.provider;
      const selectedProvider = providers.find(p => p.$.name === provider);

      if (!selectedProvider) {
        console.log(chalk.red(`Provider '${provider}' not found in providers.xml.`));
        return;
      }

      let art = null;
      const envVars = selectedProvider.env_var;
      let allVarsSet = true;

      for (const envVar of envVars) {
        if (envVar && !process.env[envVar]) {
          allVarsSet = false;
          console.log(chalk.red(`${envVar} environment variable not set. Falling back to offline provider.`));
          art = generateOffline(prompt, style);
          break;
        }
      }

      if (allVarsSet) {
        switch (provider) {
          case 'openai':
            const apiKey = process.env[envVars[0]];
            console.log(chalk.green(`Querying OpenAI with model ${model}...`));
            art = await callOpenAIChat(prompt, apiKey, model, style);
            break;
          case 'ollama_local':
            console.log(chalk.green(`Querying Ollama with model ${model}...`));
            art = await callOllamaLocal(prompt, model, style);
            break;
          case 'offline':
            art = generateOffline(prompt, style);
            break;
          default:
            console.log(chalk.yellow(`Provider '${provider}' is not yet implemented. Falling back to offline provider.`));
            art = generateOffline(prompt, style);
            break;
        }
      }
      console.log(chalk.blue.bold('--- Generated Art ---'));
      console.log(art);
      console.log(chalk.blue.bold('---------------------'));
    } catch (error) {
      console.error(chalk.red('An error occurred:'), error.message);
      console.log(chalk.yellow('Falling back to offline provider.'));
      const art = generateOffline(prompt, style);
      console.log(chalk.blue.bold('--- Generated Art (Offline) ---'));
      console.log(art);
      console.log(chalk.blue.bold('-------------------------------'));
    }
  });

program
  .command('cfg')
  .description('Configure the CLI with your API key.')
  .option('--provider <provider>', 'The provider to configure.', 'openai')
  .option('--key <key>', 'The API key to save.')
  .action(async (options) => {
    const { provider, key } = options;
    if (!key) {
      console.log(chalk.red('Please provide an API key with the --key option.'));
      return;
    }

    try {
      const providersXmlPath = path.resolve(__dirname, '../providers.xml');
      const providersXml = await fs.promises.readFile(providersXmlPath, 'utf8');
      const parsedXml = await xml2js.parseStringPromise(providersXml);
      const providers = parsedXml.providers.provider;
      const selectedProvider = providers.find(p => p.$.name === provider);

      if (!selectedProvider) {
        console.log(chalk.red(`Provider '${provider}' not found in providers.xml.`));
        return;
      }

      const envVar = selectedProvider.env_var[0];
      if (!envVar) {
        console.log(chalk.red(`Provider '${provider}' does not require an API key.`));
        return;
      }

      let envContent = '';
      try {
        envContent = await fs.promises.readFile('.env', 'utf8');
      } catch (error) {
        // .env file does not exist yet, which is fine.
      }

      const lines = envContent.split('\n').filter(line => line.trim() !== '');
      let keyFound = false;
      const newLines = lines.map(line => {
        if (line.startsWith(`${envVar}=`)) {
          keyFound = true;
          return `${envVar}=${key}`;
        }
        return line;
      });

      if (!keyFound) {
        newLines.push(`${envVar}=${key}`);
      }

      await fs.promises.writeFile('.env', newLines.join('\n'));
      console.log(chalk.green(`API key for '${provider}' saved to .env file.`));
    } catch (error) {
      console.error(chalk.red('Error saving API key:'), error.message);
    }
  });

program
  .command('create <imagePath>')
  .alias('crt')
  .description('Convert an image file to ASCII art.')
  .action(async (imagePath) => {
    const filePath = path.resolve(imagePath);

    if (!fs.existsSync(filePath)) {
      console.log(chalk.red(`Error: The file "${filePath}" was not found.`));
      return;
    }

    console.log(chalk.green(`Processing image: ${filePath}`));

    try {
      const ascii = await convertImageToAscii(filePath);
      console.log(ascii);
    } catch (error) {
      console.log(chalk.red('An error occurred during conversion:'), error.message);
    }
  });

async function convertImageToAscii(filePath) {
  const fileExtension = path.extname(filePath).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);

  let rawImageData;
  if (fileExtension === '.png') {
    rawImageData = PNG.sync.read(fileBuffer);
  } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
    rawImageData = jpeg.decode(fileBuffer);
  } else {
    throw new Error('Unsupported image format. Please use PNG or JPEG.');
  }

  const { width, height, data } = rawImageData;
  let asciiArt = '';
  const asciiChars = '`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const charIndex = Math.floor((gray / 255) * (asciiChars.length - 1));
      asciiArt += asciiChars[charIndex];
    }
    asciiArt += '\n';
  }

  return asciiArt;
}

program.parse(process.argv);
