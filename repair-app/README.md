# Tech Assist AI — Computer Repair Assistant

An AI-powered computer repair chat and voice assistant, bilingual (English/Spanish), with browser-based system diagnostics.

## Features
- 💬 AI chat support (GPT-4o-mini)
- 🎤 Voice input (speech-to-text)
- 🔊 Voice output (text-to-speech)
- 📊 System diagnostics panel
- 🌐 Bilingual: English / Spanish
- 📱 Mobile-friendly

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your OpenAI API key
Copy the config template:
```bash
cp src/config.example.js src/config.js
```
Then open `src/config.js` and paste your key from https://platform.openai.com/api-keys

### 3. Run locally
```bash
npm start
```
Opens at http://localhost:3000

### 4. Build for deployment
```bash
npm run build
```

## Deploying to Vercel
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your GitHub repo
3. Click Deploy — done!

## Notes
- The app works without an API key (uses helpful demo responses)
- `src/config.js` is in `.gitignore` — your key stays private
- Voice features require Chrome or Edge

## Contact
Tech support available within 40 miles of South Texas.
