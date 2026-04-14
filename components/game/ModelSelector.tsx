import React from 'react';
import { useVisualConfig } from '@/contexts/visual-config.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings2, Zap, Sparkles } from 'lucide-react';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';

export const ModelSelector: React.FC = () => {
  const { preferences, updatePreferences, loading } = useVisualConfig();
  const { getTouchClasses } = useMobileOptimizations();

  if (loading || !preferences) return null;

  const currentQuality = preferences.imageQuality || 'fast';

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={currentQuality} 
        onValueChange={(value: 'fast' | 'quality') => updatePreferences({ imageQuality: value })}
      >
        <SelectTrigger className={getTouchClasses(
          "w-32 bg-background/95 backdrop-blur-sm border-border hover:bg-accent shadow-lg gap-1",
          "min-h-[48px]"
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fast">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Fast (Turbo)</span>
            </div>
          </SelectItem>
          <SelectItem value="quality">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>High Quality</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
