# CLI ArtGen

A versatile command-line tool to generate ASCII art from either text prompts (using AI) or image files.

## Features

- **Text-to-Art**: Generate ASCII art from a text prompt using AI providers like OpenAI.
- **Image-to-Art**: Convert local image files (PNG, JPEG) directly into ASCII art.
- **Simple Configuration**: Easily save your API keys with a built-in command.

## Quickstart

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure API Key (for AI)**:
    To use the AI-powered text-to-art feature, you need to save an API key.
    ```bash
    # Example for OpenAI
    npx cli-artgen cfg --provider openai --key sk-xxxxxx
    ```

## Usage

### Generate Art from a Text Prompt

Use the `gen` command to generate art with an AI provider.

```bash
npx cli-artgen gen "a dragon made of stars" --provider openai
```

### Convert an Image to ASCII Art

Use the `create` command (or its alias `crt`) to convert an image file.

```bash
npx cli-artgen create ./path/to/your/image.png
```

### Offline Generation

You can also use the `gen` command with the offline provider for simple text-based art without an API key.

```bash
npx cli-artgen gen "hello world" --provider offline
```
