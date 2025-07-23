// src/voice-mode.ts

import { sendToAndroidLog, isAndroidBridgeAvailable } from './android-bridge'; // Assuming .ts extension for android-bridge
import type { PersonaStorage, MemoryStorage, MessageStorage, ConversationStorage } from './storage-wrapper'; // Assuming .ts extension for storage-wrapper and import type for type-only imports

// Extend the Window interface to include custom properties, if they exist globally
declare global {
    interface Window {
        Android?: {
            getAudioStream: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
        };
        showToast?: (message: string, type?: string) => void;
        webkitSpeechRecognition?: new () => SpeechRecognition;
        modalOpen?: boolean;
    }
}

const VOICE_MODE_DEBUG_TAG = 'VoiceMode';

// --- State Variables ---
let recognition: SpeechRecognition | undefined; // SpeechRecognition instance
let synth: SpeechSynthesis | undefined;       // SpeechSynthesis instance
let currentSpeechUtterance: SpeechSynthesisUtterance | null = null; // To manage ongoing speech
let isListening: boolean = false; // Is the recognition active?
let isSpeaking: boolean = false; // Is the synthesis active?
let isProcessing: boolean = false; // Is response being processed?
let silenceTimer: ReturnType<typeof setTimeout> | undefined; // Timer to detect prolonged silence
const SILENCE_TIMEOUT = 3000; // 3 seconds of silence to stop recognition
let handledSpeech: boolean = false; // Flag to track if we've processed speech already

// Audio visualization variables
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let audioStream: MediaStream | null = null;
let volumeInterval: ReturnType<typeof setInterval> | null = null;

// Configuration Interface
interface VivicaVoiceModeConfig {
    systemPrompt: string;
    conversationId: string | number | null;
    onSpeechResult: (transcript: string, isFinal: boolean) => void;
    onSpeechStart: () => void;
    onSpeechEnd: () => void;
    onSpeechError: (error: SpeechRecognitionErrorEvent | Error) => void;
    onSpeakingStart: () => void;
    onSpeakingEnd: () => void;
    onSpeakingError: (error: SpeechSynthesisErrorEvent | Error) => void;
    onListenStateChange: (state: 'listening' | 'speaking' | 'processing' | 'idle' | 'error') => void;
    onVisualizerData: (data: number) => void;
}

// --- Configuration (can be passed from main.js or managed internally) ---
let vivicaVoiceModeConfig: VivicaVoiceModeConfig = {
    systemPrompt: 'You are Vivica, a helpful AI assistant.',
    conversationId: null, // Current conversation context from main app
    onSpeechResult: (transcript, isFinal) => { }, // Callback for speech results
    onSpeechStart: () => { }, // Callback when recognition starts
    onSpeechEnd: () => { }, // Callback when recognition ends
    onSpeechError: (error) => { }, // Callback for recognition errors
    onSpeakingStart: () => { }, // Callback when TTS starts
    onSpeakingEnd: () => { }, // Callback when TTS ends
    onSpeakingError: (error) => { }, // Callback for TTS errors
    onListenStateChange: (state) => { }, // Callback for listening state (e.g., "listening", "speaking", "idle")
    onVisualizerData: (data) => { } // Callback for visualizer data (e.g., audio levels)
};

/**
 * Updates the configuration for the voice mode module.
 * @param {object} newConfig - New configuration object.
 */
export function updateVoiceModeConfig(newConfig: Partial<VivicaVoiceModeConfig>): void {
    vivicaVoiceModeConfig = { ...vivicaVoiceModeConfig, ...newConfig };
    debugLog('Config updated:', vivicaVoiceModeConfig);
}

export function setProcessingState(state: boolean): void {
    isProcessing = state;
    debugLog('Processing state:', state);
}

/**
 * Sets the current conversation ID for context.
 * @param {string | number | null} id - The ID of the current conversation.
 */
export function setCurrentConversationId(id: string | number | null): void {
    vivicaVoiceModeConfig.conversationId = id;
    debugLog('Current conversation ID set to:', id);
}

/**
 * Debug logging function, uses Android bridge if available.
 * @param {...any} args - Arguments to log.
 */
function debugLog(...args: any[]): void {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    if (isAndroidBridgeAvailable()) {
        sendToAndroidLog('INFO', VOICE_MODE_DEBUG_TAG, message);
    } else {
        console.log(`[${VOICE_MODE_DEBUG_TAG}]`, ...args);
    }
}

// --- Context Helpers ---
// NOTE: These functions rely on actual implementations of PersonaStorage, MemoryStorage, etc.
// For a full working example, you'd need the content of storage-wrapper.ts and actual data.
// Assuming these are imported correctly and have the necessary methods.

// Placeholder for Storage classes. In a real project, these would be imported from storage-wrapper.ts
// For this recreation, we'll assume they exist and have the necessary methods.
const PersonaStorage: any = { // Replace 'any' with actual types from your storage-wrapper
    getAllPersonas: async () => [{ id: 1, name: 'Default Persona', tone: 'natural', isActive: true }]
};
const MemoryStorage: any = {
    getAllMemories: async () => [{ content: 'Default memory context.' }]
};
const ConversationStorage: any = {
    getAllConversations: async () => [{ id: 123 }]
};
const MessageStorage: any = {
    getMessagesByConversationId: async (id: number) => [{ sender: 'user', content: 'Hello' }, { sender: 'assistant', content: 'Hi there!' }]
};


export async function getActivepersona(): Promise<any> { // Replace 'any' with actual Persona type
    const activeId = parseFloat(localStorage.getItem('activePersonaId') || '0'); // Use parseFloat
    const personas = await PersonaStorage.getAllPersonas();
    return personas.find((p: any) => p.id === activeId) || personas.find((p: any) => p.isActive) || personas[0];
}

export async function getMemoryContext(): Promise<string> {
    const memories = await MemoryStorage.getAllMemories();
    return memories.map((m: any) => m.content).join('\n');
}

export async function getLastConversationHistory(): Promise<{ role: string; content: string; }[]> {
    const convos = await ConversationStorage.getAllConversations();
    const latest = convos?.[0];
    if (!latest) return [];
    const messages = await MessageStorage.getMessagesByConversationId(latest.id);
    return messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
    }));
}

export async function buildVoicePrompt(userInput: string): Promise<any[]> {
    const persona = await getActivepersona();
    const memory = await getMemoryContext();
    const history = await getLastConversationHistory();
    const systemMessage = {
        role: 'system',
        content: `You are ${persona?.name || 'an AI assistant'}. Speak with a ${persona?.tone || 'natural'} tone.\nYou remember the following:\n${memory}`
    };
    return [systemMessage, ...history, { role: 'user', content: userInput }];
}

// --- Audio visualization helpers ---
async function startAudioVisualization(): Promise<void> {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            debugLog('Audio visualization not supported');
            return;
        }
        const audioConstraints: MediaStreamConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1 // Mono is better for speech and works better on Android
            }
        };

        // Use Android bridge if available, else fallback to browser API
        if (isAndroidBridgeAvailable() && window.Android?.getAudioStream) {
            try {
                audioStream = await window.Android.getAudioStream(audioConstraints);
            } catch (e: any) {
                debugLog('Using web audio fallback for visualization');
                audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
            }
        } else {
            audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        }

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(audioStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.fftSize);
        volumeInterval = setInterval(() => {
            analyser?.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const v = (dataArray[i] - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            vivicaVoiceModeConfig.onVisualizerData(rms);
        }, 50);
    } catch (err: any) {
        console.error('Audio visualization error:', err);
        if (window.showToast) window.showToast('Audio error: ' + err.message, 'error');
    }
}

function stopAudioVisualization(): void {
    if (volumeInterval) {
        clearInterval(volumeInterval);
        volumeInterval = null;
    }
    if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    vivicaVoiceModeConfig.onVisualizerData(0);
}

// --- Speech Recognition (Web Speech API) ---

/**
 * Initializes the Speech Recognition API.
 */
function initSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const Recog = (window.webkitSpeechRecognition || window.SpeechRecognition) as { new(): SpeechRecognition };
        recognition = new Recog();
        recognition.continuous = false;
        recognition.interimResults = true; // Enable interim for Android to detect speech start
        recognition.maxAlternatives = 3; // Get more alternatives on Android
        recognition.lang = 'en-US';

        // Android-specific optimized settings
        if (isAndroidBridgeAvailable()) {
            recognition.interimResults = false; // Disable on Android as it can cause duplication
            recognition.continuous = false; // Single-shot mode works better on Android
        }

        recognition.onstart = () => {
            debugLog('Speech recognition started.');
            isListening = true;
            vivicaVoiceModeConfig.onSpeechStart();
            vivicaVoiceModeConfig.onListenStateChange('listening');
            resetSilenceTimer();
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (handledSpeech) return; // Ignore duplicate results

            resetSilenceTimer(); // Reset on any speech input
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                handledSpeech = true;
                debugLog('Final speech result:', finalTranscript);
                let retryBtn = document.getElementById('voice-retry-btn') as HTMLButtonElement | null;
                if (retryBtn) retryBtn.style.display = 'none';
                vivicaVoiceModeConfig.onSpeechResult(finalTranscript.trim(), true);
            } else {
                debugLog('Interim speech result:', interimTranscript);
                vivicaVoiceModeConfig.onSpeechResult(interimTranscript.trim(), false);
            }
        };

        recognition.onerror = function (event: SpeechRecognitionErrorEvent) {
            setState('error');
            let retryBtn = document.getElementById('voice-retry-btn') as HTMLButtonElement | null;
            if (!retryBtn) {
                retryBtn = document.createElement('button');
                retryBtn.id = 'voice-retry-btn';
                retryBtn.innerHTML = '<i class="fas fa-microphone"></i> Tap to Retry';
                Object.assign(retryBtn.style, {
                    position: 'fixed',
                    bottom: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(60,0,80,0.95)',
                    color: '#fff',
                    fontSize: '1.2em',
                    border: 'none',
                    borderRadius: '18px',
                    padding: '14px 28px',
                    zIndex: '9999', // Z-index should be a string
                    boxShadow: '0 0 20px #b05cff90',
                });
                retryBtn.onclick = function () {
                    if (retryBtn) retryBtn.style.display = 'none'; // Check again for null
                    try { recognition?.start(); } catch (e) { } // Use optional chaining
                };
                document.body.appendChild(retryBtn);
            } else {
                retryBtn.style.display = 'block';
            }
            vivicaVoiceModeConfig.onSpeechError(event); // Pass the event object
        };

        recognition.onend = () => {
            debugLog('Speech recognition ended.');
            isListening = false;
            handledSpeech = false;
            clearSilenceTimer();
            vivicaVoiceModeConfig.onSpeechEnd();
            vivicaVoiceModeConfig.onListenStateChange('idle');
            stopAudioVisualization();
            if (typeof window.modalOpen === 'boolean' && !window.modalOpen && shouldRestartRecognition()) { // Check window.modalOpen type
                setTimeout(() => recognition?.start(), 500); // Use optional chaining
            }
        };

    } else {
        console.warn('Web Speech API not supported in this browser.');
        if (window.showToast) window.showToast('Voice mode not supported on this device/browser.', 'error');
    }
}

/**
 * Starts speech recognition.
 */
export function startListening(): void {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        if (window.showToast) window.showToast('Voice mode not supported on this device/browser.');
        return;
    }
    if (recognition && !isListening) {
        try {
            recognition.start();
            debugLog('Listening started.');
            startAudioVisualization();
        } catch (e: any) {
            console.error('Failed to start recognition:', e);
            vivicaVoiceModeConfig.onSpeechError(e);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            if (window.showToast) window.showToast('Voice error: ' + e.message, 'error');
        }
    } else if (!recognition) {
        initSpeechRecognition(); // Initialize if not already
        if (recognition) startListening(); // Try again after init
    }
}

/**
 * Stops speech recognition.
 */
export function stopListening(): void {
    if (recognition && isListening) {
        recognition.stop();
        debugLog('Listening stopped.');
        clearSilenceTimer();
        stopAudioVisualization();
    }
}

/**
 * Toggles speech recognition on/off.
 */
export function toggleListening(): void {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

/**
 * Resets the silence detection timer.
 */
function resetSilenceTimer(): void {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
        debugLog('Silence detected, stopping recognition.');
        stopListening();
    }, SILENCE_TIMEOUT);
}

/**
 * Clears the silence detection timer.
 */
function clearSilenceTimer(): void {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = undefined; // Set to undefined after clearing
    }
}

// --- Text-to-Speech (Web Speech API) ---

/**
 * Initializes the Speech Synthesis API.
 */
function initSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;
        // Preload voices
        synth.getVoices(); // Request voices as they might not be immediately available
        synth.onvoiceschanged = () => {
            debugLog('Speech Synthesis: Voices changed/loaded.');
        };
    } else {
        console.warn('Speech Synthesis API not supported in this browser.');
        if (window.showToast) window.showToast('Speech synthesis not supported on this device/browser.', 'error');
    }
}

/**
 * Speaks the given text.
 * @param {string} text - The text to speak.
 * @returns {Promise<void>} A promise that resolves when speech ends or rejects on error.
 */
export function speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!synth) {
            initSpeechSynthesis();
            if (!synth) {
                const errMsg = 'Speech Synthesis not available.';
                console.error(errMsg);
                vivicaVoiceModeConfig.onSpeakingError(new Error(errMsg));
                return reject(new Error(errMsg));
            }
        }

        if (currentSpeechUtterance && isSpeaking) {
            synth.cancel(); // Stop current speech if any
            debugLog('Cancelled previous speech.');
        }

        currentSpeechUtterance = new SpeechSynthesisUtterance(text);
        currentSpeechUtterance.lang = 'en-US'; // Or dynamically set
        // Find a good voice if possible (e.g., a Google US English voice)
        const voices = synth.getVoices();
        const preferredVoice = voices.find(voice =>
            voice.lang === 'en-US' && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang === 'en-US'); // Fallback

        if (preferredVoice) {
            currentSpeechUtterance.voice = preferredVoice;
            debugLog('Using voice:', preferredVoice.name);
        } else {
            debugLog('No preferred voice found, using default.');
        }

        // Android-specific voice settings
        if (isAndroidBridgeAvailable()) {
            currentSpeechUtterance.rate = 0.9; // Slightly slower for clarity
            currentSpeechUtterance.pitch = 1.1; // Slightly higher for better Android TTS
        } else {
            currentSpeechUtterance.rate = 1.0;
            currentSpeechUtterance.pitch = 1.0;
        }

        currentSpeechUtterance.onstart = () => {
            debugLog('Speech synthesis started.');
            isSpeaking = true;
            vivicaVoiceModeConfig.onSpeakingStart();
            vivicaVoiceModeConfig.onListenStateChange('speaking');
            stopListening(); // Stop listening while speaking
        };

        currentSpeechUtterance.onend = () => {
            debugLog('Speech synthesis ended.');
            isSpeaking = false;
            vivicaVoiceModeConfig.onSpeakingEnd();
            vivicaVoiceModeConfig.onListenStateChange('idle');
            setProcessingState(false);
            resolve();

            // Auto-restart listening after speech ends
            // Check window.modalOpen type and existence
            if (recognition && (typeof window.modalOpen === 'boolean' && !window.modalOpen) && shouldRestartRecognition()) {
                setTimeout(() => recognition?.start(), 500); // Use optional chaining
                return;
            }
            restartRecognition();
        };

        currentSpeechUtterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            console.error('Speech synthesis error:', event.error);
            isSpeaking = false;
            vivicaVoiceModeConfig.onSpeakingError(event.error);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            if (window.showToast) window.showToast('Speech error: ' + event.error, 'error');
            reject(event.error);
        };

        synth.speak(currentSpeechUtterance);
    });
}


/**
 * Stops any ongoing speech synthesis.
 */
export function stopSpeaking(): void {
    if (synth && isSpeaking) {
        synth.cancel();
        isSpeaking = false;
        debugLog('Speech synthesis cancelled.');
        vivicaVoiceModeConfig.onSpeakingEnd();
        vivicaVoiceModeConfig.onListenStateChange('idle');
    }
}

/**
 * Gets the current listening state.
 * @returns {boolean} True if listening is active, false otherwise.
 */
export function getIsListening(): boolean {
    return isListening;
}

/**
 * Gets the current speaking state.
 * @returns {boolean} True if speaking is active, false otherwise.
 */
export function getIsSpeaking(): boolean {
    return isSpeaking;
}

/**
 * Initializes the voice mode module.
 * Call this once when the application starts.
 * @param {object} initialConfig - Initial configuration for the voice mode.
 */
export function initVoiceMode(initialConfig: Partial<VivicaVoiceModeConfig> = {}): void {
    updateVoiceModeConfig(initialConfig);
    initSpeechRecognition();
    initSpeechSynthesis();
    debugLog('Voice mode module initialized.');

    // Set window.modalOpen if not already set
    if (typeof window.modalOpen === 'undefined') {
        window.modalOpen = false;
    }
}

function setState(state: VivicaVoiceModeConfig['onListenStateChange'] extends (s: infer S) => any ? S : never): void {
    vivicaVoiceModeConfig.onListenStateChange(state);
}

// Helper functions for recognition restart logic
function shouldRestartRecognition(): boolean {
    return !isProcessing && !isSpeaking && !(window.modalOpen ?? false); // Use nullish coalescing for modalOpen
}

function restartRecognition(): void {
    try {
        if (recognition) {
            setState('listening');
            recognition.start();
        }
    } catch (e) {
        console.log('Recognition restart failed:', e);
    }
}
