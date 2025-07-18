
import { useState, useMemo } from "react";
import { Check, ChevronDown, Search, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOpenRouterModels, OpenRouterModel } from "@/hooks/useOpenRouterModels";

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const ModelSelector = ({ value, onValueChange, placeholder = "Select a model..." }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { models, loading, error } = useOpenRouterModels();

  const selectedModel = useMemo(() => {
    return models.find((model) => model.id === value);
  }, [models, value]);

  // Group models by provider for better organization
  const groupedModels = useMemo(() => {
    const groups: Record<string, OpenRouterModel[]> = {};
    
    models.forEach(model => {
      const provider = model.id.split('/')[0] || 'Other';
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(model);
    });

    // Sort groups by popularity
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      const priority = ['openai', 'anthropic', 'google', 'meta-llama', 'mistralai'];
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedGroups.map(provider => ({
      provider,
      models: groups[provider].sort((a, b) => {
        // Sort by name within provider
        if (a.name && b.name) {
          return a.name.localeCompare(b.name);
        }
        return a.id.localeCompare(b.id);
      })
    }));
  }, [models]);

  if (loading) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading models...
        </div>
      </Button>
    );
  }

  if (error) {
    return (
      <Button variant="outline" disabled className="w-full justify-between text-destructive">
        Error loading models
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left"
        >
          <span className="truncate">
            {selectedModel ? selectedModel.name || selectedModel.id : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 max-w-sm" align="start">
        <Command>
          <CommandInput placeholder="Search models..." className="h-9" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No models found.</CommandEmpty>
            {groupedModels.map(({ provider, models: providerModels }) => (
              <CommandGroup key={provider} heading={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                {providerModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={`${model.name || model.id} ${model.id}`}
                    onSelect={() => {
                      onValueChange(model.id);
                      setOpen(false);
                    }}
                    className="py-3"
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {model.name || model.id}
                        </span>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 shrink-0",
                            value === model.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                      {model.description && (
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {model.description}
                        </span>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {model.context_length && (
                          <span>Ctx: {(model.context_length / 1000).toFixed(0)}K</span>
                        )}
                        {model.pricing && (
                          <span>
                            ${parseFloat(model.pricing.prompt).toFixed(4)}/1K
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
