
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceAnimationProps {
  isVisible: boolean;
  onClose: () => void;
  currentProfile: Record<string, unknown>;
  getMemoryPrompt: () => string;
  buildSystemPrompt: () => string;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoiceAnimation = ({
  isVisible,
  onClose,
  currentProfile,
  getMemoryPrompt,
  buildSystemPrompt
}: VoiceAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [voiceState, setVoiceState] = useState<VoiceState>('listening');
  const [audioLevel, setAudioLevel] = useState(0.1);
  const [unsupported, setUnsupported] = useState(false);

  const supportsAudio = !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices?.getUserMedia &&
    window.AudioContext
  );
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect audio support
  useEffect(() => {
    if (isVisible && !supportsAudio) {
      setUnsupported(true);
    }
  }, [isVisible, supportsAudio]);

  // Simulate voice state changes for demo - much slower transitions
  useEffect(() => {
    if (!isVisible || unsupported || reducedMotion) return;

    const stateSequence: VoiceState[] = ['listening', 'processing', 'speaking', 'idle'];
    let currentStateIndex = 0;

    const interval = setInterval(() => {
      currentStateIndex = (currentStateIndex + 1) % stateSequence.length;
      setVoiceState(stateSequence[currentStateIndex]);
    }, 6000); // Slower state changes - 6 seconds instead of 3

    return () => clearInterval(interval);
  }, [isVisible]);

  // Simulate audio level changes - much more subtle
  useEffect(() => {
    if (!isVisible || unsupported || reducedMotion) return;

    const interval = setInterval(() => {
      if (voiceState === 'speaking') {
        setAudioLevel(0.3 + Math.random() * 0.3); // More controlled range
      } else if (voiceState === 'listening') {
        setAudioLevel(0.1 + Math.random() * 0.2); // Very subtle
      } else if (voiceState === 'processing') {
        setAudioLevel(0.2 + Math.sin(Date.now() / 1000) * 0.1); // Much slower sine wave
      } else {
        setAudioLevel(0.05); // Very minimal for idle
      }
    }, 200); // Slower updates

    return () => clearInterval(interval);
  }, [isVisible, voiceState]);

  useEffect(() => {
    if (!isVisible || unsupported || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let phase = 0;

    const getStateColors = (state: VoiceState) => {
      switch (state) {
        case 'idle':
          return {
            primary: 'rgba(100, 100, 100, 0.4)',
            secondary: 'rgba(150, 150, 150, 0.3)',
            glow: 'rgba(100, 100, 100, 0.2)',
          };
        case 'listening':
          return {
            primary: 'rgba(0, 123, 255, 0.6)',
            secondary: 'rgba(0, 150, 255, 0.4)',
            glow: 'rgba(0, 123, 255, 0.3)',
          };
        case 'processing':
          return {
            primary: 'rgba(255, 193, 7, 0.6)',
            secondary: 'rgba(255, 220, 60, 0.4)',
            glow: 'rgba(255, 193, 7, 0.3)',
          };
        case 'speaking':
          return {
            primary: 'rgba(239, 68, 68, 0.7)',
            secondary: 'rgba(248, 113, 113, 0.5)',
            glow: 'rgba(239, 68, 68, 0.4)',
          };
        default:
          return {
            primary: 'rgba(239, 68, 68, 0.6)',
            secondary: 'rgba(248, 113, 113, 0.4)',
            glow: 'rgba(239, 68, 68, 0.3)',
          };
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.12;
      
      // Much slower phase increment
      phase += voiceState === 'processing' ? 0.02 : 0.01;
      
      const colors = getStateColors(voiceState);
      
      // Much more subtle radius changes
      let radiusMultiplier = 1;
      if (voiceState === 'speaking') {
        radiusMultiplier = 1 + audioLevel * 0.3; // Reduced from 0.8
      } else if (voiceState === 'listening') {
        radiusMultiplier = 1 + audioLevel * 0.1; // Reduced from 0.3
      } else if (voiceState === 'processing') {
        radiusMultiplier = 1 + Math.sin(phase * 4) * 0.15; // Reduced from 0.4
      }
      
      const radius = baseRadius * radiusMultiplier + Math.sin(phase) * (baseRadius * 0.05); // Reduced from 0.1

      // Softer outer glow - fewer layers for less intensity
      for (let i = 2; i >= 1; i--) {
        const glowRadius = radius * (1.5 + i * 0.3); // Reduced spread
        const glowAlpha = 0.05 / i; // Much more subtle
        
        const outerGradient = ctx.createRadialGradient(
          centerX, centerY, radius * 0.3,
          centerX, centerY, glowRadius
        );
        outerGradient.addColorStop(0, colors.glow);
        outerGradient.addColorStop(0.5, colors.glow.replace(/[\d.]+\)$/g, glowAlpha + ')'));
        outerGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.beginPath();
        ctx.fillStyle = outerGradient;
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main orb with gentler pulsing
      const mainGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
      mainGradient.addColorStop(0, colors.primary);
      mainGradient.addColorStop(0.5, colors.secondary);
      mainGradient.addColorStop(0.8, colors.secondary.replace(/[\d.]+\)$/g, '0.2)'));
      mainGradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.fillStyle = mainGradient;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Softer inner core
      const coreIntensity = voiceState === 'speaking' ? 0.4 : 0.3; // Reduced intensity
      const coreGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 0.4
      );
      coreGradient.addColorStop(0, `rgba(255, 255, 255, ${coreIntensity})`);
      coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.fillStyle = coreGradient;
      ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Much subtler particle effect for speaking state
      if (voiceState === 'speaking') {
        for (let i = 0; i < 4; i++) { // Fewer particles
          const angle = (phase + i * Math.PI / 2) % (Math.PI * 2); // Slower rotation
          const distance = radius * (1.2 + Math.sin(phase * 2 + i) * 0.1); // Smaller movement
          const particleX = centerX + Math.cos(angle) * distance;
          const particleY = centerY + Math.sin(angle) * distance;
          const particleSize = 2 + Math.sin(phase * 3 + i) * 1; // Smaller particles
          
          ctx.beginPath();
          ctx.fillStyle = colors.primary.replace(/[\d.]+\)$/g, '0.6)'); // More transparent
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, voiceState, audioLevel, unsupported, reducedMotion]);

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
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
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
          VIVICA
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
          onClick={() => setVoiceState(voiceState === 'listening' ? 'idle' : 'listening')}
          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
        >
          {voiceState === 'listening' ? "Stop Listening" : "Start Listening"}
        </Button>
      </div>
    </div>
  );
};
