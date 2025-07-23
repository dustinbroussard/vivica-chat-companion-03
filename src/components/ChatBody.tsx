
import { forwardRef, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotateCcw, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaUser, FaRobot } from "react-icons/fa";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { WeatherWidget } from "@/components/WeatherWidget";
import { RSSWidget } from "@/components/RSSWidget";
import { ChatService, ChatMessage } from "@/services/chatService";
import { Storage } from "@/utils/storage";
import { getCachedWelcomeMessages, saveWelcomeMessage } from "@/utils/indexedDb";

const getUserName = () => {
  try {
    const profileId = localStorage.getItem('vivica-current-profile') || '';
    const profileMem = profileId
      ? JSON.parse(localStorage.getItem(`vivica-memory-profile-${profileId}`) || 'null')
      : null;
    const globalMem = JSON.parse(localStorage.getItem('vivica-memory-global') || 'null');
    const legacyMem = JSON.parse(localStorage.getItem('vivica-memory') || 'null');
    const mem = profileMem || globalMem || legacyMem || {};
    return mem.identity?.name || 'User';
  } catch {
    return 'User';
  }
};

const getProfileName = (id?: string) => {
  try {
    const list: { id: string; name: string }[] = JSON.parse(localStorage.getItem('vivica-profiles') || '[]');
    const pid = id || localStorage.getItem('vivica-current-profile');
    return list.find((p) => p.id === pid)?.name || 'Vivica';
  } catch {
    return 'Vivica';
  }
};

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

interface ProfileBrief {
  isVivica?: boolean;
  model: string;
  systemPrompt: string;
  temperature: number;
}

interface ChatBodyProps {
  conversation: Conversation | null;
  isTyping: boolean;
  onRetryMessage?: (messageId: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onEditMessage?: (message: Message) => void;
  onSendMessage: (content: string) => void;
  onNewChat: () => void;
}

export const ChatBody = forwardRef<HTMLDivElement, ChatBodyProps>(
  ({ conversation, isTyping, onRetryMessage, onRegenerateMessage, onEditMessage, onSendMessage, onNewChat }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { color, variant } = useTheme();
    const logoSrc = `/logo-${color}${variant}.png`;
    const [welcomeMsg, setWelcomeMsg] = useState('');

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [conversation?.messages, isTyping]);

    // Fetch a dynamic welcome message from the LLM whenever the welcome screen appears
    useEffect(() => {
      const fetchWelcome = async () => {
        if (conversation?.messages.length) return;
        // Try cached messages first
        const cached = await getCachedWelcomeMessages();
        if (cached.length) {
          setWelcomeMsg(cached[cached.length - 1].text);
          return;
        }
        try {
          const raw = localStorage.getItem('vivica-profiles') || '[]';
          const profiles = JSON.parse(raw) as ProfileBrief[];
          const vivica = profiles.find(p => p.isVivica) || Storage.createVivicaProfile();

          const apiKey = localStorage.getItem('openrouter-api-key');
          if (!apiKey) throw new Error('missing api key');

          // Use Vivica's persona/model to generate the opening line
          const chatService = new ChatService(apiKey);
          const systemPrompt = vivica.systemPrompt;
          const prompt = `${systemPrompt}\n\nGive me a single, short, witty, and slightly unpredictable welcome message as Vivica. Make it snarky, playful, or a little challenging, but never mention being an AI. Don’t repeat past responses.`;

          const reqMessages: ChatMessage[] = [{ role: 'system', content: prompt }];
          const res = await chatService.sendMessage({
            model: vivica.model,
            messages: reqMessages,
            temperature: vivica.temperature,
            max_tokens: 60,
          });
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            setWelcomeMsg(text);
            saveWelcomeMessage(text); // Cache for later
          } else {
            setWelcomeMsg('Well, well. Look who finally showed up.');
          }
        } catch {
          // If the call fails (offline, quota, etc.), use a hardcoded snarky line
          setWelcomeMsg('Well, well. Look who finally showed up.');
        }
      };

      fetchWelcome();
    }, [conversation?.id]);


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
                {welcomeMsg || 'Start a new conversation to begin'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
              <WeatherWidget />
              <RSSWidget onSendMessage={onSendMessage} onNewChat={onNewChat} />
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
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                      <FaRobot className="w-3 h-3" />
                      {getProfileName(message.profileId)}
                    </span>
                  )}
                  
                  <div className={`message-bubble ${message.role} ${
                    message.failed ? 'border-accent/50 bg-accent/10' : ''
                  } ${message.isCodeResponse ? 'code-bubble' : ''}`}>
                    {/* TODO(vivica-audit): add CSS for .code-bubble so code responses
                        stand out from normal messages */}
                    <div className="prose dark:prose-invert break-words max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {
                          // Avoid rendering raw objects like [object Object]
                          // If the message content isn't a string, log it and
                          // fall back to JSON so the UI stays readable
                          typeof message.content === 'string'
                            ? message.content
                            : (console.log('Non-string message', message.content),
                              JSON.stringify(message.content))
                        }
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
                          onClick={() =>
                            handleCopyMessage(
                              typeof message.content === 'string'
                                ? message.content
                                : JSON.stringify(message.content)
                            )
                          }
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>

                        {message.role === 'user' && onEditMessage && (
                          (() => {
                            const lastIndex = conversation?.messages.length ? conversation.messages.length - 1 : -1;
                            const isLastUser =
                              (index === lastIndex && message.role === 'user') ||
                              (index === lastIndex - 1 && conversation?.messages[lastIndex].role === 'assistant');
                            return isLastUser ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditMessage(message)}
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            ) : null;
                          })()
                        )}

                        {message.role === 'assistant' && onRegenerateMessage && (
                          index === conversation?.messages.length - 1 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRegenerateMessage(message.id)}
                              className="h-6 w-6 p-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          ) : null
                        )}

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
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                      <FaUser className="w-3 h-3" />
                      {getUserName()}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start slide-up">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                    <FaRobot className="w-3 h-3" />
                    {getProfileName()}
                  </span>
                  <div className="message-bubble assistant">
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <span className="ml-2">{getProfileName()} is typing...</span>
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
