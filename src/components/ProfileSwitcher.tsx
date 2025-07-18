
import { useState, useEffect } from "react";
import { ChevronDown, User, Settings, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

interface ProfileSwitcherProps {
  currentProfile: Profile | null;
  onProfileChange: (profile: Profile) => void;
  onOpenProfiles: () => void;
}

export const ProfileSwitcher = ({ 
  currentProfile, 
  onProfileChange, 
  onOpenProfiles 
}: ProfileSwitcherProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadProfiles = () => {
    const savedProfiles = localStorage.getItem('vivica-profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch {
        setProfiles([]);
      }
    } else {
      setProfiles([]);
    }
  };

  useEffect(() => {
    loadProfiles();
    const handler = () => loadProfiles();
    window.addEventListener('profilesUpdated', handler);
    return () => window.removeEventListener('profilesUpdated', handler);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-card border-border hover:bg-muted/50 text-left justify-between min-w-[180px]"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <span className="truncate">{currentProfile?.name || 'No Profile'}</span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] bg-card border-border">
        <div className="px-3 py-2 text-sm text-muted-foreground">
          Active Profile
        </div>
        
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => onProfileChange(profile)}
            className={`cursor-pointer ${
              currentProfile?.id === profile.id ? 'bg-accent/10 text-accent' : ''
            }`}
          >
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center justify-between">
                <span className="font-medium">{profile.name}</span>
                {currentProfile?.id === profile.id && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">Active</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile.model} • Temp: {profile.temperature}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {profile.systemPrompt}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        {profiles.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground text-center">
            No profiles created yet
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onOpenProfiles} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Manage Profiles
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onOpenProfiles} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Create New Profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
