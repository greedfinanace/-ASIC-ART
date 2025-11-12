# CLI ArtGen

AI-powered ASCII/Pixel art generator for the terminal.

## Quickstart

### Run directly without cloning
You can run the tool directly using `npx`:
```bash
npx cli-artgen gen "a dragon made of stars" --style pixel
```

### Local Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Key**:
   You can save your API key locally using the `cfg` command:
   ```bash
   npx cli-artgen cfg --key sk-xxxxxx
   ```
   This will save your key to a `.env` file.

3. **Run**:
   ```bash
   npx cli-artgen gen "a robot pirate" --provider openai
   ```
