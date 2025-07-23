
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voiceAnimation } from "@/js/voice-animation";
import { 
  initVoiceMode, 
  startListening, 
  stopListening, 
  getIsListening,
  updateVoiceModeConfig 
} from "@/js/voice-mode";

interface VoiceAnimationProps {
  isVisible: boolean;
  onClose: () => void;
  currentProfile: Record<string, unknown>;
  getMemoryPrompt: () => string;
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
  const [voiceState, setVoiceState] = useState<VoiceState>('listening');
  const [unsupported] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      voiceAnimation.hide();
      stopListening();
      return;
    }

    // Initialize voice mode with callbacks
    voiceAnimation.show();
    voiceAnimation.setState('listening');
    
    updateVoiceModeConfig({
      onListenStateChange: (state) => {
        voiceAnimation.setState(state);
        setVoiceState(state);
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
    };
  }, [isVisible, currentProfile, buildSystemPrompt]);

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
  if (unsupported) {
    return (
      <div className="voice-animation-container flex items-center justify-center text-center text-white">
        <div>
          <p className="mb-4 text-lg">Voice mode is not supported on this device.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-animation-container">
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
      >
        <X className="w-6 h-6" />
      </Button>
      {/* Vivica label */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-center">
        <h2 className="text-4xl font-bold text-white tracking-wide mb-2">
          {String(currentProfile?.name || 'Vivica').toUpperCase()}
        </h2>
        <p className={`text-lg ${getStateColor(voiceState)}`}>
          {getStateLabel(voiceState)}
        </p>
        {voiceState === 'speaking' && (
          <div className="mt-2 flex justify-center">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-accent rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.sin(Date.now() / 300 + i) * 8}px`, // Slower animation
                    animationDelay: `${i * 150}ms`, // Slower delays
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice controls */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            if (getIsListening()) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          {voiceState === 'listening' ? "Stop Listening" : "Start Listening"}
        </Button>
      </div>
    </div>
  );
};
