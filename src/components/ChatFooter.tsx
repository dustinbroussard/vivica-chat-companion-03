
import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatFooterProps {
  onSendMessage: (message: string) => void;
  onVoiceToggle: () => void;
  isVoiceMode: boolean;
  editingMessage?: string | null;
}

export const ChatFooter = ({ onSendMessage, onVoiceToggle, isVoiceMode, editingMessage }: ChatFooterProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage !== undefined) {
      setMessage(editingMessage || "");
      if (editingMessage) textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
      <div className="max-w-4xl mx-auto">
        {editingMessage && (
          <div className="text-xs text-muted-foreground mb-2">Editing previous message</div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Voice Mode Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onVoiceToggle}
            className={`${
              isVoiceMode
                ? 'bg-accent/20 border-accent/40 text-accent-foreground/80 pulse-glow'
                : 'hover:bg-muted'
            } transition-all duration-200`}
          >
            {isVoiceMode ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-[120px] resize-none pr-3 bg-background border-input"
              disabled={isVoiceMode}
            />
            
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isVoiceMode}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Character count */}
        {message.length > 0 && (
          <div className="text-xs text-muted-foreground mt-2 text-right">
            {message.length} characters
          </div>
        )}
      </div>
    </footer>
  );
};
