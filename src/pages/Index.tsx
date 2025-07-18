import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatBody } from "@/components/ChatBody";
import { ChatFooter } from "@/components/ChatFooter";
import { VoiceAnimation } from "@/components/VoiceAnimation";
import { SettingsModal } from "@/components/SettingsModal";
import { ProfilesModal } from "@/components/ProfilesModal";
import { MemoryModal } from "@/components/MemoryModal";
import { toast } from "sonner";
import { ChatService, ChatMessage } from "@/services/chatService";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  failed?: boolean;
  profileId?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage?: string;
  timestamp: Date;
}

interface Profile {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  [key: string]: unknown; // Add index signature for console.log compatibility
}

const Index = () => {
  console.log("Index component rendering...");
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceAnimation, setShowVoiceAnimation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Initialize default profiles and load data
  useEffect(() => {
    console.log("Index component mounted, initializing...");
    initializeProfiles();
    loadConversations();
    loadCurrentProfile();
    const handler = () => loadCurrentProfile();
    window.addEventListener('profilesUpdated', handler);
    return () => window.removeEventListener('profilesUpdated', handler);
  }, []);

  const initializeProfiles = () => {
    const savedProfiles = localStorage.getItem('vivica-profiles');
    if (!savedProfiles) {
      const defaultProfiles: Profile[] = [
        {
          id: '1',
          name: 'Assistant',
          model: 'gpt-3.5-turbo',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 2000,
        },
        {
          id: '2',
          name: 'Creative Writer',
          model: 'gpt-4',
          systemPrompt: 'You are a creative writing assistant specializing in storytelling and creative content.',
          temperature: 0.9,
          maxTokens: 3000,
        },
      ];
      localStorage.setItem('vivica-profiles', JSON.stringify(defaultProfiles));
    }
  };

  const loadCurrentProfile = () => {
    const savedProfileId = localStorage.getItem('vivica-current-profile');
    const savedProfiles = localStorage.getItem('vivica-profiles');
    
    if (savedProfiles) {
      const profiles: Profile[] = JSON.parse(savedProfiles);
      if (savedProfileId) {
        const profile = profiles.find(p => p.id === savedProfileId);
        if (profile) {
          setCurrentProfile(profile);
          return;
        }
      }
      // Fallback to first profile
      if (profiles.length > 0) {
        setCurrentProfile(profiles[0]);
        localStorage.setItem('vivica-current-profile', profiles[0].id);
      }
    }
  };

  const loadConversations = () => {
    const saved = localStorage.getItem('vivica-conversations');
    const savedCurrent = localStorage.getItem('vivica-current-conversation');
    
    if (saved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedConversations = JSON.parse(saved).map((conv: any) => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setConversations(parsedConversations);
      
      if (savedCurrent) {
        const current = parsedConversations.find((conv: Conversation) => conv.id === savedCurrent);
        if (current) {
          setCurrentConversation(current);
        }
      } else if (parsedConversations.length > 0) {
        setCurrentConversation(parsedConversations[0]);
      }
    } else {
      handleNewChat();
    }
  };

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('vivica-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Save current conversation ID
  useEffect(() => {
    if (currentConversation) {
      localStorage.setItem('vivica-current-conversation', currentConversation.id);
    }
  }, [currentConversation]);

  const handleProfileChange = (profile: Profile) => {
    setCurrentProfile(profile);
    localStorage.setItem('vivica-current-profile', profile.id);
    toast.success(`Switched to ${profile.name} profile`);
  };

  const getMemoryPrompt = () => {
    const memoryActive = localStorage.getItem('vivica-memory-active');
    const savedMemory = localStorage.getItem('vivica-memory');
    
    if (memoryActive === 'true' && savedMemory) {
      const memory = JSON.parse(savedMemory);
      let prompt = "";
      
      if (memory.identity?.name) {
        prompt += `The user's name is ${memory.identity.name}. `;
      }
      
      if (memory.identity?.pronouns) {
        prompt += `Use ${memory.identity.pronouns} pronouns when referring to the user. `;
      }
      
      if (memory.identity?.occupation) {
        prompt += `The user works as ${memory.identity.occupation}. `;
      }
      
      if (memory.identity?.location) {
        prompt += `The user is located in ${memory.identity.location}. `;
      }
      
      if (memory.personality?.tone) {
        prompt += `Adopt a ${memory.personality.tone} tone when responding. `;
      }
      
      if (memory.personality?.style) {
        prompt += `Use a ${memory.personality.style} communication style. `;
      }
      
      if (memory.personality?.interests) {
        prompt += `The user is interested in: ${memory.personality.interests}. `;
      }
      
      if (memory.customInstructions) {
        prompt += `${memory.customInstructions} `;
      }
      
      if (memory.systemNotes) {
        prompt += `Additional notes: ${memory.systemNotes}`;
      }
      
      return prompt.trim();
    }
    
    return '';
  };

  const buildSystemPrompt = () => {
    const profilePrompt = currentProfile?.systemPrompt || 'You are a helpful AI assistant.';
    const memoryPrompt = getMemoryPrompt();
    
    if (memoryPrompt) {
      return `${profilePrompt}\n\nUser Context: ${memoryPrompt}`;
    }
    
    return profilePrompt;
  };

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    setSidebarOpen(false);
    toast.success("New conversation started!");
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversation || !content.trim() || !currentProfile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      profileId: currentProfile.id,
    };

    const updatedConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      lastMessage: content.trim(),
      timestamp: new Date(),
      title: currentConversation.messages.length === 0 ? 
        content.trim().substring(0, 30) + (content.trim().length > 30 ? '...' : '') : 
        currentConversation.title,
    };

    setCurrentConversation(updatedConversation);
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversation.id ? updatedConversation : conv
    ));

    setIsTyping(true);

    const apiKey = localStorage.getItem('openrouter-api-key');
    if (!apiKey) {
      toast.error('Please set your OpenRouter API key in Settings.');
      setIsTyping(false);
      return;
    }

    const systemPrompt = buildSystemPrompt();
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...updatedConversation.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const chatService = new ChatService(apiKey);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      profileId: currentProfile.id,
    };

    const streamingConversation = {
      ...updatedConversation,
      messages: [...updatedConversation.messages, assistantMessage],
      lastMessage: '',
      timestamp: new Date(),
    };

    setCurrentConversation(streamingConversation);
    setConversations(prev => prev.map(conv =>
      conv.id === currentConversation.id ? streamingConversation : conv
    ));

    try {
      const response = await chatService.sendMessage({
        model: currentProfile.model,
        messages: chatMessages,
        temperature: currentProfile.temperature,
        max_tokens: currentProfile.maxTokens,
        stream: true,
      });

      let fullContent = '';
      for await (const token of chatService.streamResponse(response)) {
        fullContent += token;
        setCurrentConversation(prev => {
          if (!prev) return prev;
          const msgs = prev.messages.map(msg =>
            msg.id === assistantMessage.id ? { ...msg, content: fullContent } : msg
          );
          return { ...prev, messages: msgs, lastMessage: fullContent };
        });
        setConversations(prev => prev.map(conv => {
          if (conv.id !== currentConversation.id) return conv;
          const msgs = conv.messages.map(msg =>
            msg.id === assistantMessage.id ? { ...msg, content: fullContent } : msg
          );
          return { ...conv, messages: msgs, lastMessage: fullContent, timestamp: new Date() };
        }));

        chatBodyRef.current?.scrollTo({
          top: chatBodyRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch (error) {
      const failedMessage: Message = {
        id: assistantMessage.id,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        failed: true,
        profileId: currentProfile.id,
      };

      const errorConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, failedMessage],
        lastMessage: 'Error occurred',
        timestamp: new Date(),
      };

      setCurrentConversation(errorConversation);
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversation.id ? errorConversation : conv
      ));

      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetryMessage = (messageId: string) => {
    if (!currentConversation) return;
    
    const messageIndex = currentConversation.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const userMessage = currentConversation.messages[messageIndex - 1];
      if (userMessage.role === 'user') {
        const updatedMessages = currentConversation.messages.slice(0, messageIndex);
        const updatedConversation = {
          ...currentConversation,
          messages: updatedMessages
        };
        setCurrentConversation(updatedConversation);
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversation.id ? updatedConversation : conv
        ));
        
        handleSendMessage(userMessage.content);
      }
    }
  };

  const handleQuickAction = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleVoiceToggle = () => {
    setIsVoiceMode(!isVoiceMode);
    if (!isVoiceMode) {
      setShowVoiceAnimation(true);
      toast.success("Voice mode activated");
    } else {
      setShowVoiceAnimation(false);
      toast.success("Voice mode deactivated");
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (conversationId: string) => {
    const newConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(newConversations);
    
    if (currentConversation?.id === conversationId) {
      if (newConversations.length > 0) {
        setCurrentConversation(newConversations[0]);
      } else {
        handleNewChat();
      }
    }
    
    toast.success("Conversation deleted");
  };

  const handleRenameConversation = (conversationId: string, newTitle: string) => {
    const updatedConversations = conversations.map(conv => 
      conv.id === conversationId ? { ...conv, title: newTitle } : conv
    );
    setConversations(updatedConversations);
    
    if (currentConversation?.id === conversationId) {
      setCurrentConversation({ ...currentConversation, title: newTitle });
    }
    
    toast.success("Conversation renamed");
  };

  console.log("Index component state:", {
    sidebarOpen,
    currentConversation: currentConversation?.id,
    currentProfile: currentProfile?.name,
    conversations: conversations.length
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfiles={() => setShowProfiles(true)}
        onOpenMemory={() => setShowMemory(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          onMenuToggle={() => setSidebarOpen(true)}
          currentTitle={currentConversation?.title || "Vivica"}
          currentProfile={currentProfile}
          onProfileChange={handleProfileChange}
          onOpenProfiles={() => setShowProfiles(true)}
        />
        
        <ChatBody
          ref={chatBodyRef}
          conversation={currentConversation}
          isTyping={isTyping}
          onQuickAction={handleQuickAction}
          onRetryMessage={handleRetryMessage}
        />
        
        <ChatFooter
          onSendMessage={handleSendMessage}
          onVoiceToggle={handleVoiceToggle}
          isVoiceMode={isVoiceMode}
        />
      </div>

      {showVoiceAnimation && (
        <VoiceAnimation
          isVisible={showVoiceAnimation}
          onClose={() => {
            setShowVoiceAnimation(false);
            setIsVoiceMode(false);
          }}
          currentProfile={currentProfile}
          getMemoryPrompt={getMemoryPrompt}
          buildSystemPrompt={buildSystemPrompt}
        />
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ProfilesModal
        isOpen={showProfiles}
        onClose={() => setShowProfiles(false)}
      />

      <MemoryModal
        isOpen={showMemory}
        onClose={() => setShowMemory(false)}
      />
    </div>
  );
};

export default Index;
