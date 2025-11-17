#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const providers = require('../lib/providers');
const { promises: fs } = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
require('dotenv').config();

program
  .version('1.0.0')
  .description('AI-powered ASCII/Pixel art generator for the terminal.');

program
  .command('gen <prompt>')
  .description('Generate pixel art from a text prompt.')
  .option('-p, --provider <name>', 'AI provider to use (e.g., openai, anthropic)', 'openai')
  .option('-m, --model <model_name>', 'Model to use for generation')
  .option('-o, --output <file>', 'Output file path')
  .action(async (prompt, options) => {
    try {
      const result = await providers.generate(prompt, options.provider, options.model);
      if (options.output) {
        await fs.writeFile(options.output, result);
        console.log(chalk.green(`Art saved to ${options.output}`));
      } else {
        console.log(result);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
    .command('create <file>')
    .alias('crt')
    .description('Create ASCII art from an image file.')
    .option('-w, --width <number>', 'Width of the output in characters', '80')
    .action(async (file, options) => {
        try {
            const imagePath = path.resolve(file);
            const data = await fs.readFile(imagePath);
            let image;

            if (imagePath.endsWith('.png')) {
                image = PNG.sync.read(data);
            } else if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
                image = jpeg.decode(data);
            } else {
                throw new Error('Unsupported image format. Please use PNG or JPEG.');
            }

            const ascii = toAscii(image, parseInt(options.width));
            console.log(ascii);

        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
        }
    });

function toAscii(image, width) {
    const aspectRatio = image.height / image.width;
    const height = Math.floor(width * aspectRatio * 0.5);
    let ascii = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const imageX = Math.floor(x * (image.width / width));
            const imageY = Math.floor(y * (image.height / height));
            const idx = (image.width * imageY + imageX) << 2;
            const r = image.data[idx];
            const g = image.data[idx + 1];
            const b = image.data[idx + 2];
            const gray = (r + g + b) / 3;
            ascii += gray > 128 ? ' ' : '@';
        }
        ascii += '\\n';
    }

    return ascii;
}

program
  .command('cfg')
  .description('Configure API keys and providers.')
  .action(() => {
    console.log(chalk.blue('To configure the tool, please edit the providers.xml and .env files.'));
  });

program.parse(process.argv);
