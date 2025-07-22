
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileSelectionModal } from "./ProfileSelectionModal";

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
  const [showModal, setShowModal] = useState(false);

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

  const handleProfileSelect = (profile: Profile) => {
    onProfileChange(profile);
    setShowModal(false);
  };

  return (
    <>
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-accent/10 transition-colors px-3 py-1.5 gap-2 bg-card border-border text-foreground"
        onClick={() => setShowModal(true)}
      >
        <User className="w-3 h-3" />
        <span className="text-sm font-medium">
          {currentProfile?.name || 'No Profile'}
        </span>
      </Badge>

      <ProfileSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        profiles={profiles}
        currentProfile={currentProfile}
        onProfileSelect={handleProfileSelect}
        onOpenProfiles={onOpenProfiles}
      />
    </>
  );
};
