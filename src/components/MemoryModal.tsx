
import { useState, useEffect } from "react";
import { Brain, Save, RotateCcw, FileDown, FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface MemoryData {
  identity: {
    name: string;
    pronouns: string;
    occupation: string;
    location: string;
  };
  personality: {
    tone: string;
    style: string;
    interests: string;
  };
  customInstructions: string;
  systemNotes: string;
  tags: string;
}

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryModal = ({ isOpen, onClose }: MemoryModalProps) => {
  const [memory, setMemory] = useState<MemoryData>({
    identity: {
      name: '',
      pronouns: '',
      occupation: '',
      location: '',
    },
    personality: {
      tone: '',
      style: '',
      interests: '',
    },
    customInstructions: '',
    systemNotes: '',
    tags: '',
  });

  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const savedMemory = localStorage.getItem('vivica-memory');
    const memoryActive = localStorage.getItem('vivica-memory-active');
    
    if (savedMemory) {
      setMemory(JSON.parse(savedMemory));
    }
    
    if (memoryActive !== null) {
      setIsActive(JSON.parse(memoryActive));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('vivica-memory', JSON.stringify(memory));
    localStorage.setItem('vivica-memory-active', JSON.stringify(isActive));
    toast.success("Memory settings saved!");
    onClose();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all memory data? This action cannot be undone.")) {
      const emptyMemory: MemoryData = {
        identity: { name: '', pronouns: '', occupation: '', location: '' },
        personality: { tone: '', style: '', interests: '' },
        customInstructions: '',
        systemNotes: '',
        tags: '',
      };
      setMemory(emptyMemory);
      toast.success("Memory data reset");
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(memory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vivica-memory.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Memory exported successfully");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          setMemory(importedData);
          toast.success("Memory imported successfully");
        } catch (error) {
          toast.error("Invalid file format");
        }
      };
      reader.readAsText(file);
    }
  };

  const generateSystemPrompt = () => {
    let prompt = "";
    
    if (memory.identity.name) {
      prompt += `The user's name is ${memory.identity.name}. `;
    }
    
    if (memory.identity.pronouns) {
      prompt += `Use ${memory.identity.pronouns} pronouns when referring to the user. `;
    }
    
    if (memory.identity.occupation) {
      prompt += `The user works as ${memory.identity.occupation}. `;
    }
    
    if (memory.identity.location) {
      prompt += `The user is located in ${memory.identity.location}. `;
    }
    
    if (memory.personality.tone) {
      prompt += `Adopt a ${memory.personality.tone} tone when responding. `;
    }
    
    if (memory.personality.style) {
      prompt += `Use a ${memory.personality.style} communication style. `;
    }
    
    if (memory.personality.interests) {
      prompt += `The user is interested in: ${memory.personality.interests}. `;
    }
    
    if (memory.customInstructions) {
      prompt += `${memory.customInstructions} `;
    }
    
    if (memory.systemNotes) {
      prompt += `Additional notes: ${memory.systemNotes}`;
    }
    
    return prompt.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Memory Settings
            <div className={`ml-auto text-xs px-2 py-1 rounded ${isActive ? 'bg-green-500/20 text-green-500' : 'bg-accent/20 text-accent'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Memory Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Enable Memory</Label>
            <Button
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsActive(!isActive)}
              className={isActive ? "bg-accent hover:bg-accent/90" : ""}
            >
              {isActive ? "Active" : "Inactive"}
            </Button>
          </div>

          <Separator />

          {/* Identity Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Identity</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={memory.identity.name}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    identity: { ...prev.identity, name: e.target.value }
                  }))}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="pronouns">Pronouns</Label>
                <Input
                  id="pronouns"
                  value={memory.identity.pronouns}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    identity: { ...prev.identity, pronouns: e.target.value }
                  }))}
                  placeholder="they/them, she/her, he/him"
                />
              </div>
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={memory.identity.occupation}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    identity: { ...prev.identity, occupation: e.target.value }
                  }))}
                  placeholder="Software Developer"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={memory.identity.location}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    identity: { ...prev.identity, location: e.target.value }
                  }))}
                  placeholder="New York, USA"
                />
              </div>
            </div>
          </div>

          {/* Personality Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Personality & Tone</Label>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="tone">Preferred Tone</Label>
                <Input
                  id="tone"
                  value={memory.personality.tone}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    personality: { ...prev.personality, tone: e.target.value }
                  }))}
                  placeholder="friendly, professional, casual, formal"
                />
              </div>
              <div>
                <Label htmlFor="style">Communication Style</Label>
                <Input
                  id="style"
                  value={memory.personality.style}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    personality: { ...prev.personality, style: e.target.value }
                  }))}
                  placeholder="concise, detailed, creative, analytical"
                />
              </div>
              <div>
                <Label htmlFor="interests">Interests & Hobbies</Label>
                <Textarea
                  id="interests"
                  value={memory.personality.interests}
                  onChange={(e) => setMemory(prev => ({
                    ...prev,
                    personality: { ...prev.personality, interests: e.target.value }
                  }))}
                  placeholder="programming, music, cooking, travel..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Custom Instructions</Label>
            <Textarea
              value={memory.customInstructions}
              onChange={(e) => setMemory(prev => ({ ...prev, customInstructions: e.target.value }))}
              placeholder="Specific instructions for how the AI should behave..."
              rows={3}
            />
          </div>

          {/* System Notes */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">System Notes</Label>
            <Textarea
              value={memory.systemNotes}
              onChange={(e) => setMemory(prev => ({ ...prev, systemNotes: e.target.value }))}
              placeholder="Additional context or notes for the AI..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tags</Label>
            <Input
              value={memory.tags}
              onChange={(e) => setMemory(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="work, personal, creative, technical"
            />
            <p className="text-sm text-muted-foreground">Comma-separated tags for organization</p>
          </div>

          {/* Generated Prompt Preview */}
          {generateSystemPrompt() && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Generated System Prompt Preview</Label>
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                {generateSystemPrompt()}
              </div>
            </div>
          )}

          {/* Import/Export */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} size="sm">
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <FileUp className="w-4 h-4 mr-2" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleReset} className="text-destructive hover:text-destructive">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-accent hover:bg-accent/90">
            <Save className="w-4 h-4 mr-2" />
            Save Memory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
