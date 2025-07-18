
import { Menu, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { useTheme } from "@/hooks/useTheme";

interface Profile {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

interface ChatHeaderProps {
  onMenuToggle: () => void;
  currentTitle: string;
  currentProfile: Profile | null;
  onProfileChange: (profile: Profile) => void;
  onOpenProfiles: () => void;
}

export const ChatHeader = ({
  onMenuToggle,
  currentProfile,
  onProfileChange,
  onOpenProfiles
}: ChatHeaderProps) => {
  const { theme, updateTheme } = useTheme();

  const toggleVariant = () => {
    updateTheme({ ...theme, variant: theme.variant === 'dark' ? 'light' : 'dark' });
  };

  const logoSrc = `/logo-${theme.color}${theme.variant}.png`;
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

        <img src={logoSrc} alt="Vivica" className="h-8 w-8" />

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
        <Button variant="ghost" size="icon" onClick={toggleVariant}>
          {theme.variant === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
