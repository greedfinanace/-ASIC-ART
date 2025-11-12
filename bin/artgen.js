#!/usr/bin/env node
require('dotenv').config();

const { Command } = require('commander');
const chalk = require('chalk');
const axios = require('axios');
const OpenAI = require('openai');
const fs = require('fs').promises;
const xml2js = require('xml2js');
const path = require('path');
const { callOpenAIChat, callOllamaLocal, generateOffline } = require('../lib/providers');

const program = new Command();

program
  .name('artgen')
  .description('AI-powered ASCII/Pixel art generator for the terminal.')
  .version('1.0.0');

program
  .command('gen <prompt>')
  .description('Generate art from a text prompt.')
  .option('--provider <provider>', 'The AI provider to use.', 'openai')
  .option('--model <model>', 'The specific AI model to use (provider-dependent).', 'gpt-4o-mini')
  .option('--style <style>', 'The style of the generated art.', 'ascii')
  .action(async (prompt, options) => {
    const { provider, model, style } = options;

    try {
      const providersXmlPath = path.resolve(__dirname, '../providers.xml');
      const providersXml = await fs.readFile(providersXmlPath, 'utf8');
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
      const providersXml = await fs.readFile(providersXmlPath, 'utf8');
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
        envContent = await fs.readFile('.env', 'utf8');
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

      await fs.writeFile('.env', newLines.join('\n'));
      console.log(chalk.green(`API key for '${provider}' saved to .env file.`));
    } catch (error) {
      console.error(chalk.red('Error saving API key:'), error.message);
    }
  });

program.parse(process.argv);
