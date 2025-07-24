
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mic, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voiceAnimation } from "@/js/voice-animation";
import { 
  initVoiceMode, 
  startListening,
  stopListening,
  getIsListening,
  updateVoiceModeConfig,
  setVoiceModeActive
} from "@/js/voice-mode";

interface VoiceAnimationProps {
  isVisible: boolean;
  onClose: () => void;
  currentProfile: Record<string, unknown>;
  getMemoryPrompt: () => Promise<string>;
  buildSystemPrompt: () => Promise<string>;
  onSendMessage: (content: string) => void;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoiceAnimation = ({
  isVisible,
  onClose,
  currentProfile,
  getMemoryPrompt,
  buildSystemPrompt,
  onSendMessage
}: VoiceAnimationProps) => {
  // Current state reported by the voice API (idle, listening, etc)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  // Track whether recognition is actually listening
  const [isListeningState, setIsListeningState] = useState(false);
  // Whether Web Speech API is available
  const [unsupported, setUnsupported] = useState(false);

  const handleClose = () => {
    voiceAnimation.setState('idle');
    voiceAnimation.hide();
    stopListening();
    setVoiceModeActive(false);
    onClose();
  };

  // Toggle recognition on or off. UI will update via event callbacks
  const handleToggleListening = () => {
    if (getIsListening()) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    if (!isVisible) {
      voiceAnimation.hide();
      stopListening();
      return;
    }

    const supported =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (!supported) {
      setUnsupported(true);
      voiceAnimation.hide();
      stopListening();
      return;
    }
    setUnsupported(false);

    // Initialize voice mode with callbacks
    voiceAnimation.show();
    voiceAnimation.setState('idle');
    
    updateVoiceModeConfig({
      onListenStateChange: (state) => {
        voiceAnimation.setState(state);
        setVoiceState(state);
        setIsListeningState(state === 'listening');
      },
      onVisualizerData: voiceAnimation.updateVolume,
      onSpeechResult: (text, isFinal) => {
        if (isFinal) {
          onSendMessage(text);
        }
      }
    });

    buildSystemPrompt().then(prompt => {
      initVoiceMode({
        systemPrompt: prompt,
        conversationId: currentProfile.id,
      });
    });

    return () => {
      voiceAnimation.hide();
      stopListening();
      setIsListeningState(false);
    };
  }, [isVisible, currentProfile, buildSystemPrompt, onSendMessage]);

  const getStateLabel = (state: VoiceState) => {
    switch (state) {
      case 'idle':
        return 'Ready';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Ready';
    }
  };

  const getStateColor = (state: VoiceState) => {
    switch (state) {
      case 'idle':
        return 'text-gray-300';
      case 'listening':
        return 'text-blue-300';
      case 'processing':
        return 'text-yellow-300';
      case 'speaking':
        return 'text-accent/70';
      default:
        return 'text-accent/70';
    }
  };

  if (!isVisible) return null;

  const container = document.getElementById('voice-animation-container');
  if (!container) return null;

  const content = unsupported ? (
    <div className="flex items-center justify-center h-full text-center text-white">
      <div>
        <p className="mb-4 text-lg">Voice mode is not supported on this device.</p>
        <Button onClick={handleClose}>Close</Button>
      </div>
    </div>
  ) : (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
      >
        <X className="w-6 h-6" />
      </Button>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 px-4 text-center w-full max-w-xs">
        <h2 className="text-xl font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
          {currentProfile?.name || 'Vivica'}
        </h2>
        <Button
          variant="outline"
          onClick={handleToggleListening}
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center gap-2"
        >
          {isListeningState ? (
            <>
              <StopCircle className="w-4 h-4" /> Stop Listening
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" /> Start Listening
            </>
          )}
        </Button>
        <p className={`text-sm ${getStateColor(voiceState)}`}>{getStateLabel(voiceState)}</p>
        {voiceState === 'speaking' && (
          <div className="mt-1 flex justify-center">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-accent rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.sin(Date.now() / 300 + i) * 8}px`,
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, container);
};
