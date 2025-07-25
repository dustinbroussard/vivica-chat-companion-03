import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionClass {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionClass;
    webkitSpeechRecognition: SpeechRecognitionClass;
  }
  
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  }
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface UseVoiceReturn {
  state: VoiceState;
  audioLevel: number;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  speak: (text: string) => Promise<void>;
}

export const useVoice = (): UseVoiceReturn => {
  const [state, setState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animationFrameRef = useRef<number>();
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support for SpeechRecognition
  useEffect(() => {
    let hasSpeechRecognition = false;
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      hasSpeechRecognition = true;
    }
    setIsSupported(hasSpeechRecognition);
  }, []);

  useEffect(() => {
    if (isSupported) {
      console.log('SpeechRecognition supported');
    } else {
      console.log('SpeechRecognition not supported');
    }
  }, [isSupported]);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = (dataArray[i] - 128) / 128;
      sum += value * value;
    }
    
    const rms = Math.sqrt(sum / dataArray.length);
    setAudioLevel(Math.min(rms * 10, 1)); // Normalize and cap at 1

    if (state === 'listening') {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [state]);

  // Setup audio capture
  const setupAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      return false;
    }
  }, []);

  // Setup speech recognition
  const setupSpeechRecognition = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('listening');
      monitorAudioLevel();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(prev => prev + interimTranscript); // Append interim results
      console.log('onresult interim:', interimTranscript);

      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        setTranscript(prev => prev + finalTranscript);
        setState('processing');
        recognition.stop();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Speech recognition error: ${event.error}`);
      setState('idle');
    };

    recognition.onend = () => {
      if (state === 'listening') {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
  }, [isSupported, monitorAudioLevel, state]);

  // Start voice capture
  const start = useCallback(async () => {
    if (!isSupported) {
      setError('Voice features not supported in this browser');
      return;
    }

    setError(null);
    
    const audioSetup = await setupAudioCapture();
    if (!audioSetup) return;

    setupSpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  }, [isSupported, setupAudioCapture, setupSpeechRecognition]);

  // Stop voice capture
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (speechSynthRef.current) {
      speechSynthesis.cancel();
    }

    setState('idle');
    setAudioLevel(0);
    setTranscript('');
  }, []);

  // Text-to-speech
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      speechSynthesis.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthRef.current = utterance;

      utterance.onstart = () => {
        setState('speaking');
      };

      utterance.onend = () => {
        setState('idle');
        setAudioLevel(0);
        resolve();
      };

      utterance.onerror = (event) => {
        setState('idle');
        setAudioLevel(0);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Simulate audio levels during speech
      const simulateSpeakingLevels = () => {
        if (state === 'speaking') {
          setAudioLevel(0.3 + Math.random() * 0.4);
          setTimeout(simulateSpeakingLevels, 100);
        }
      };

      speechSynthesis.speak(utterance);
      simulateSpeakingLevels();
    });
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    audioLevel,
    transcript,
    isSupported,
    error,
    start,
    stop,
    speak
  };
};
