# Vivica: Your Local AI Chat Companion

**Vivica** is a privacy-first, AI-powered chat assistant built for real personality, deep memory, and full user control—all running locally as a PWA. She’s more than just another chatbot: Vivica remembers, adapts, and reacts in ways no other assistant does.


## Features

- **True Local-First Design:**  
  All chat, memory, API keys, and settings are stored _locally_. No cloud sync, no account needed, and your data is yours.

- **Personalities & Personas:**  
  - **Vivica** is the always-on, never-deletable default persona:  
    > “Sharp wit, sultry charm, unapologetic presence, and a little dangerous.”
  - Add and edit your own profiles, each with their own model, prompt, and settings.

- **Multi-Model Support:**  
  - Choose your own AI model for each profile.
  - Assign a specialized coder model (like `qwen/qwen-2.5-coder-32b-instruct:free`) for programming questions, with seamless handoff to Vivica for human-style delivery.

- **Voice Mode (with Custom Animation):**  
  - Beautiful orb animation for speech recognition and text-to-speech.
  - VoiceMode is responsive, visually dynamic, and designed to *feel* like a real companion—not just a boring mic button.

- **Memory System (Knowledge Base):**  
  - **Global memory**: persistent knowledge shared by all profiles.
  - **Profile-specific memory**: each persona can remember unique facts or stories.
  - Memories are summarized and saved with one click, can be edited or deleted, and are included as context in future chats.

- **Save & Summarize:**  
  - Click the bookmark icon to save a conversation summary and key facts to memory, with Vivica’s voice and style.

- **Reliable API Key Management:**  
  - Add up to three OpenRouter keys; Vivica automatically falls back to the next key on error or rate limit.
  - Brave Search API support for live web results—key is stored locally and never sent to a server.

- **Web Search Integration:**  
  - Use `/search your topic` in chat to fetch real-time results via Brave Search.
  - Vivica summarizes, analyzes, or jokes about search results in her own style.

- **Weather Widget:**  
  - Up-to-the-minute local weather in the sidebar/welcome screen.

- **Animated RSS News Ticker:**  
  - Scrolls through the latest headlines from your chosen (or default CNN US) RSS feed.
  - Click a headline to inject it into chat—Vivica will summarize, comment, or roast the news on demand.

- **Progressive Web App (PWA):**  
  - Installable on desktop and mobile.
  - Works offline, full data persistence, fast loading.

- **Modern UI & Theme System:**  
  - Multiple color themes, dark/light toggle (with advanced dark themes for AMOLED screens).
  - Clean, focused layout designed for both desktop and mobile use.

---

## Quick Start

1. **Clone or download the repo.**
2. `npm install`
3. `npm run dev` (or `npm run build` for production)
4. Open in your browser. Vivica is ready!

## Usage Notes

- **API Keys:**  
  Add your OpenRouter and Brave Search keys in the settings menu.  
  (All keys are saved locally and never shared.)
- **Profiles:**  
  Vivica is always available. Add/edit other personas as you wish!
- **Memory:**  
  Save important chat moments, facts, or summaries to memory.  
  Edit or delete anytime in the Memory Manager.
- **RSS/Weather:**  
  Customize in settings, or enjoy the defaults.

---

## Credits & License

Built by [Dustin] and ChatGPT (Cadence)—with heart, humor, and way too many late-night debugging sessions.  
Inspired by the blues, open-source, and the dream of a truly personal AI.

**MIT License.**  
Feel free to fork, remix, and build your own companion.

---

*“Sharp wit, sultry charm, unapologetic presence, and a little dangerous.”*  
— Vivica, probably

