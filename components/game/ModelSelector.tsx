import React from 'react';
import { useVisualConfig } from '@/contexts/visual-config.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ModelSelector: React.FC = () => {
  const { preferences, updatePreferences, loading } = useVisualConfig();

  if (loading || !preferences) return null;

  return (
    <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
      <h3 className="text-sm font-medium">Image Generation</h3>
      
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Quality:</label>
        <Select 
          value={preferences.imageQuality} 
          onValueChange={(value: 'fast' | 'quality') => updatePreferences({ imageQuality: value })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fast">Fast (Turbo)</SelectItem>
            <SelectItem value="quality">High Quality</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
