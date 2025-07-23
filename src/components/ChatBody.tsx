
import { forwardRef, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotateCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { WeatherWidget } from "@/components/WeatherWidget";
import { RSSWidget } from "@/components/RSSWidget";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  failed?: boolean;
  isCodeResponse?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage?: string;
  timestamp: Date;
}

interface ChatBodyProps {
  conversation: Conversation | null;
  isTyping: boolean;
  onRetryMessage?: (messageId: string) => void;
  onSendMessage: (content: string) => void;
}

export const ChatBody = forwardRef<HTMLDivElement, ChatBodyProps>(
  ({ conversation, isTyping, onRetryMessage, onSendMessage }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { color, variant } = useTheme();
    const logoSrc = `/logo-${color}${variant}.png`;

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [conversation?.messages, isTyping]);


    const handleCopyMessage = (content: string) => {
      navigator.clipboard.writeText(content);
      toast.success("Message copied to clipboard");
    };

    const formatTimestamp = (timestamp: Date) => {
      return timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {!conversation?.messages.length ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <img src={logoSrc} alt="Vivica" className="w-32 h-32 mx-auto" />
              <h2 className="text-3xl font-bold">Welcome to Vivica</h2>
              <p className="text-lg text-muted-foreground">
                Start a new conversation to begin
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
              <WeatherWidget />
              <RSSWidget onSendMessage={onSendMessage} />
            </div>
          </div>
        ) : (
          // Messages
          <div className="space-y-6 max-w-4xl mx-auto">
            {conversation.messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } slide-up group`}
              >
                <div className="flex items-start gap-3 max-w-[85%] md:max-w-[70%]">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      V
                    </div>
                  )}
                  
                  <div className={`message-bubble ${message.role} ${
                    message.failed ? 'border-accent/50 bg-accent/10' : ''
                  } ${message.isCodeResponse ? 'code-bubble' : ''}`}>
                    <div className="prose prose-invert break-words max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className={`flex items-center gap-2 text-xs opacity-60 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {message.isCodeResponse && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500/70" 
                                title="Code response" />
                        )}
                        {formatTimestamp(message.timestamp)}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMessage(message.content)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        
                        {message.failed && onRetryMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRetryMessage(message.id)}
                            className="h-6 w-6 p-0 text-accent hover:text-accent/90"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      U
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start slide-up">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">
                    V
                  </div>
                  <div className="message-bubble assistant">
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <span className="ml-2">Vivica is typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    );
  }
);

ChatBody.displayName = "ChatBody";
