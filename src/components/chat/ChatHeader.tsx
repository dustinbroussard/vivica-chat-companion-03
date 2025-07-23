import { useState } from "react";
import { Moon, Sun, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useChatStore } from "@/stores/chatStore";
import { toast } from "sonner";
import { saveConversationMemory } from "@/utils/memoryUtils";

export function ChatHeader() {
  const { theme, toggleTheme } = useTheme();
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const { messages, model } = useChatStore();
  const apiKey = localStorage.getItem('vivica-settings')?.apiKey1;

  const handleSaveAndSummarize = async () => {
    if (!messages?.length) {
      toast.warning("No conversation to save");
      return;
    }

    setIsSavingMemory(true);
    try {
      await saveConversationMemory(messages, model, apiKey);
    } finally {
      setIsSavingMemory(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSaveAndSummarize}
          disabled={isSavingMemory}
          aria-label="Save and summarize conversation"
        >
          <Bookmark className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Save and summarize</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </div>
  );
}
