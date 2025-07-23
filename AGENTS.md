# AGENTS.md

## Project Name
Vivica: Local-First AI Assistant with Voice and Memory

## Purpose
Vivica is a local-first AI assistant web app with text and voice modes. It supports customizable AI personas, memory management, offline PWA usage, and Android WebView integration.

Users can chat or talk to Vivica using multiple AI personas (e.g., snarky roaster, helpful assistant). Conversations, memory snippets, and settings are stored in IndexedDB for persistence. personas define LLM behavior (model, system prompt, temperature, etc.).

## Key Features
- Chat and voice modes using the same memory and persona
- Local-only memory system (editable, taggable, infinite)
- AI persona system with persistent config per persona
- IndexedDB for conversations, messages, memory, personas
- Theme switching (dark/light + color themes)
- Voice support via Web Speech API and/or Google TTS
- Android bridge for native logs and toasts
- Fully installable PWA

## Vivica App Polish TODOs

- [ ] Fix/clarify persona switching (no refresh required, always updates current chat)
- [ ] Investigate/tweak scroll-to-bottom button logic or just remove if not needed
- [ ] Always show sidebar conversation action buttons (desktop & mobile)
      - Or: Implement long-press (mobile) and right-click (desktop) for action menu
- [ ] Move "Summarize & Save" to a persistent, obvious location in chat UI
- [ ] Remove Quick Actions from welcome screen; replace with something useful:
      - Welcome home, stats, recent activity, Vivica’s sassy message, etc.
      - Make Vivica logo/name in sidebar always return to welcome
- [ ] (Optional) Enhance the welcome screen with per-persona stats/snark
- [ ] Keep orb, keep logo handling as-is—no change needed

