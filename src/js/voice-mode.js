// js/voice-mode.js
// Code Maniac - Voice Mode Integration Module for Vivica Chat App

/**
 * @fileoverview This module encapsulates all Speech Recognition and Text-to-Speech (TTS) logic.
 * It's designed to be imported and controlled by the main application (main.js)
 * to provide a seamless voice interaction mode.
 */

const isAndroidBridgeAvailable = () => false; // Default to false if bridge not available
const sendToAndroidLog = (level, tag, message) => console.log(`[${level}/${tag}] ${message}`); // Fallback logging

// Fallback storage implementation since storage-wrapper.js is missing
const Storage = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
};

const PersonaStorage = {
  getAllPersonas: async () => [],
  getActivePersona: async () => null
};

const MemoryStorage = {
  getAllMemories: async () => []
};

const MessageStorage = {
  getMessagesByConversationId: async () => []
};

const ConversationStorage = {
  getAllConversations: async () => [],
  updateConversation: async () => {}
};

const VOICE_MODE_DEBUG_TAG = 'VoiceMode';

// --- State Variables ---
let recognition; // SpeechRecognition instance
let synth;       // SpeechSynthesisUtterance instance
let currentSpeechUtterance = null; // To manage ongoing speech
let isListening = false; // Is the recognition active?
let isSpeaking = false; // Is the synthesis active?
let isProcessing = false; // Is response being processed?
let silenceTimer; // Timer to detect prolonged silence
const SILENCE_TIMEOUT = 3000; // 3 seconds of silence to stop recognition
let handledSpeech = false; // Flag to track if we've processed speech already

// Track whether the overall voice mode UI is active. Used to
// determine if recognition should auto-restart when it ends.
let voiceModeActive = false;
// Track if the user explicitly stopped listening
let userStopped = false;

// Audio visualization variables
let audioCtx = null;
let analyser = null;
let audioStream = null;
let volumeInterval = null;

async function ensureMicrophonePermission() {
    try {
        if (!navigator.permissions) {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            return true;
        }
        const status = await navigator.permissions.query({ name: 'microphone' });
        debugLog('Mic permission status:', status.state);
        if (status.state === 'granted') {
            return true;
        }
        if (status.state === 'denied') {
            debugLog('Microphone permission denied');
            return false;
        }
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (err) {
        debugLog('Microphone permission error:', err);
        return false;
    }
}

// --- Configuration (can be passed from main.js or managed internally) ---
let vivicaVoiceModeConfig = {
    systemPrompt: 'You are Vivica, a helpful AI assistant.',
    conversationId: null, // Current conversation context from main app
    onSpeechResult: (transcript, isFinal) => {}, // Callback for speech results
    onSpeechStart: () => {}, // Callback when recognition starts
    onSpeechEnd: () => {}, // Callback when recognition ends
    onSpeechError: (error) => {}, // Callback for recognition errors
    onSpeakingStart: () => {}, // Callback when TTS starts
    onSpeakingEnd: () => {}, // Callback when TTS ends
    onSpeakingError: (error) => {}, // Callback for TTS errors
    onListenStateChange: (state) => {}, // Callback for listening state (e.g., "listening", "speaking", "idle")
    onVisualizerData: (data) => {} // Callback for visualizer data (e.g., audio levels)
};

/**
 * Updates the configuration for the voice mode module.
 * @param {object} newConfig - New configuration object.
 */
export function updateVoiceModeConfig(newConfig) {
    vivicaVoiceModeConfig = { ...vivicaVoiceModeConfig, ...newConfig };
    debugLog('Config updated:', vivicaVoiceModeConfig);
}

export function setProcessingState(state) {
    isProcessing = state;
    debugLog('Processing state:', state);
}

/**
 * Sets the current conversation ID for context.
 * @param {string | number | null} id - The ID of the current conversation.
 */
export function setCurrentConversationId(id) {
    vivicaVoiceModeConfig.conversationId = id;
    debugLog('Current conversation ID set to:', id);
}

// Track whether the voice mode interface is active
export function setVoiceModeActive(active) {
    voiceModeActive = active;
    debugLog('Voice mode active:', active);
}

export function getVoiceModeActive() {
    return voiceModeActive;
}

/**
 * Debug logging function, uses Android bridge if available.
 * @param {...any} args - Arguments to log.
 */
function debugLog(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    if (isAndroidBridgeAvailable()) {
        sendToAndroidLog('INFO', VOICE_MODE_DEBUG_TAG, message);
    } else {
        console.log(`[${VOICE_MODE_DEBUG_TAG}]`, ...args);
    }
}

// --- Context Helpers ---
export async function getActivepersona() {
    const activeId = parseInt(localStorage.getItem('activePersonaId'), 10);
    const personas = await PersonaStorage.getAllPersonas();
    return personas.find(p => p.id === activeId) || personas.find(p => p.isActive) || personas[0];
}

export async function getMemoryContext() {
    const memories = await MemoryStorage.getAllMemories();
    return memories.map(m => m.content).join('\n');
}

export async function getLastConversationHistory() {
    const convos = await ConversationStorage.getAllConversations();
    const latest = convos?.[0];
    if (!latest) return [];
    const messages = await MessageStorage.getMessagesByConversationId(latest.id);
    return messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content
    }));
}

export async function buildVoicePrompt(userInput) {
    const persona = await getActivepersona();
    const memory = await getMemoryContext();
    const history = await getLastConversationHistory();
    const systemMessage = {
        role: 'system',
        content: `You are ${persona?.name}. Speak with a ${persona?.tone || 'natural'} tone.\nYou remember the following:\n${memory}`
    };
    return [systemMessage, ...history, { role: 'user', content: userInput }];
}

// --- Audio visualization helpers ---
async function startAudioVisualization() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            debugLog('Audio visualization not supported');
            return;
        }
        const audioConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1 // Mono is better for speech and works better on Android
            }
        };

        // Use Android bridge if available, else fallback to browser API
        if (isAndroidBridgeAvailable()) {
            try {
                audioStream = await window.Android.getAudioStream(audioConstraints);
            } catch (e) {
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
            analyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const v = (dataArray[i] - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            vivicaVoiceModeConfig.onVisualizerData(rms);
        }, 50);
    } catch (err) {
        console.error('Audio visualization error:', err);
        if (window.showToast) window.showToast('Audio error: ' + err.message, 'error');
    }
}

function stopAudioVisualization() {
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
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const Recog = window.SpeechRecognition || window.webkitSpeechRecognition;
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
            debugLog('Speech recognition started');
            isListening = true;
            vivicaVoiceModeConfig.onSpeechStart();
            vivicaVoiceModeConfig.onListenStateChange('listening');
            resetSilenceTimer();
        };

        recognition.onresult = (event) => {
            console.log('[VoiceMode] onresult', event);
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
                debugLog('Final result:', finalTranscript);
                let retryBtn = document.getElementById('voice-retry-btn');
                if (retryBtn) retryBtn.style.display = 'none';
                vivicaVoiceModeConfig.onSpeechResult(finalTranscript.trim(), true);
                stopListening();
            } else {
                debugLog('Interim result:', interimTranscript);
                vivicaVoiceModeConfig.onSpeechResult(interimTranscript.trim(), false);
            }
        };

        recognition.onerror = function(event) {
            console.error('[VoiceMode] onerror', event);
            debugLog('Speech recognition error:', event.error);
            isListening = false;
            handledSpeech = false;
            userStopped = true;
            clearSilenceTimer();
            vivicaVoiceModeConfig.onSpeechError(event.error);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            stopAudioVisualization();
            if (window.showToast) {
                window.showToast('Voice error: ' + event.error + '. Please try Chrome or Edge.', 'error');
            }
        };

        recognition.onend = () => {
            console.log('[VoiceMode] onend');
            debugLog('Speech recognition ended');
            isListening = false;
            handledSpeech = false;
            clearSilenceTimer();
            vivicaVoiceModeConfig.onSpeechEnd();
            vivicaVoiceModeConfig.onListenStateChange('idle');
            stopAudioVisualization();
            if (voiceModeActive && !userStopped) {
                debugLog('Auto-restarting recognition');
                startListening();
            }
        };

    } else {
        console.warn('Web Speech API not supported in this browser.');
        if (window.showToast) window.showToast('Voice mode not supported on this device/browser. Please use Chrome or Edge.', 'error');
    }
}

/**
 * Starts speech recognition and requests microphone access if needed.
 */
export async function startListening() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        if (window.showToast) window.showToast('Voice mode not supported on this device/browser. Please use Chrome or Edge.');
        return;
    }
    debugLog('startListening called');
    if (!recognition) {
        initSpeechRecognition();
    }
    if (recognition && !isListening) {
        try {
            userStopped = false;
            handledSpeech = false;
            const permitted = await ensureMicrophonePermission();
            if (!permitted) {
                throw new Error('Microphone permission denied');
            }
            // Request mic permission via the visualizer setup
            await startAudioVisualization();
            recognition.start();
            debugLog('Listening start requested.');
        } catch (e) {
            console.error('Failed to start recognition:', e);
            vivicaVoiceModeConfig.onSpeechError(e);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            stopAudioVisualization();
            if (window.showToast) window.showToast('Voice error: ' + e.message + '. Please try Chrome or Edge.', 'error');
        }
    }
}

/**
 * Stops speech recognition.
 */
export function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        debugLog('Listening stopped.');
        isListening = false;
        userStopped = true;
        clearSilenceTimer();
        stopAudioVisualization();
        vivicaVoiceModeConfig.onListenStateChange('idle');
    }
}

/**
 * Toggles speech recognition on/off.
 */
export function toggleListening() {
    debugLog('toggleListening', isListening ? 'stopping' : 'starting');
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

/**
 * Resets the silence detection timer.
 */
function resetSilenceTimer() {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
        debugLog('Silence detected, stopping recognition.');
        stopListening();
    }, SILENCE_TIMEOUT);
}

/**
 * Clears the silence detection timer.
 */
function clearSilenceTimer() {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }
}

// --- Text-to-Speech (Web Speech API) ---

/**
 * Initializes the Speech Synthesis API.
 */
function initSpeechSynthesis() {
    synth = window.speechSynthesis;
    // Preload voices
    synth.getVoices(); // Request voices as they might not be immediately available
    synth.onvoiceschanged = () => {
        debugLog('Speech Synthesis: Voices changed/loaded.');
    };
}

/**
 * Speaks the given text.
 * @param {string} text - The text to speak.
 * @returns {Promise<void>} A promise that resolves when speech ends or rejects on error.
 */
export function speak(text) {
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
            if (voiceModeActive) {
                debugLog('Restarting listening after speech end');
                startListening();
            }
        };

        currentSpeechUtterance.onerror = (event) => {
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
export function stopSpeaking() {
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
export function getIsListening() {
    return isListening;
}

/**
 * Gets the current speaking state.
 * @returns {boolean} True if speaking is active, false otherwise.
 */
export function getIsSpeaking() {
    return isSpeaking;
}

/**
 * Initializes the voice mode module.
 * Call this once when the application starts.
 * @param {object} initialConfig - Initial configuration for the voice mode.
 */
export function initVoiceMode(initialConfig = {}) {
    updateVoiceModeConfig(initialConfig);
    initSpeechRecognition();
    initSpeechSynthesis();
    debugLog('Voice mode module initialized.');

    // Set window.modalOpen if not already set
    if (typeof window.modalOpen === 'undefined') {
        window.modalOpen = false;
    }
}

function setState(state) {
    vivicaVoiceModeConfig.onListenStateChange(state);
}
