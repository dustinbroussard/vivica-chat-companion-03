
import { Menu, Sun, Moon, Bookmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { useTheme } from "@/hooks/useTheme";

interface Profile {
  id: string;
  name: string;
  model: string;
  codeModel?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isVivica?: boolean;
}

interface ChatHeaderProps {
  onMenuToggle: () => void;
  currentTitle: string;
  currentProfile: Profile | null;
  onProfileChange: (profile: Profile) => void;
  onOpenProfiles: () => void;
  onSaveSummary: () => void;
  /** Manually regenerate the conversation title */
  onGenerateTitle: () => void;
}

export const ChatHeader = ({
  onMenuToggle,
  currentProfile,
  onProfileChange,
  onOpenProfiles,
  onSaveSummary,
  onGenerateTitle
}: ChatHeaderProps) => {
  const { variant, setVariant } = useTheme();

  const toggleVariant = () => {
    setVariant(variant === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <ProfileSwitcher
            currentProfile={currentProfile}
            onProfileChange={onProfileChange}
            onOpenProfiles={onOpenProfiles}
          />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Bookmark triggers the Save & Summarize flow */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSaveSummary}
          title="Save & Summarize conversation"
        >
          <Bookmark className="w-4 h-4" />
        </Button>
        {/* Generate a witty title for this chat */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onGenerateTitle}
          title="Regenerate title"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleVariant}>
          {variant === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
