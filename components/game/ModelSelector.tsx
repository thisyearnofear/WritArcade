import React from 'react';
import { useVisualConfig } from '@/contexts/visual-config.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const ModelSelector: React.FC = () => {
  const { preferences, updatePreferences, loading } = useVisualConfig();

  if (loading || !preferences) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 size={16} />
          Advanced Visuals
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Image Generation Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-sm font-medium col-span-1">Quality</label>
            <Select 
              value={preferences.imageQuality} 
              onValueChange={(value: 'fast' | 'quality') => updatePreferences({ imageQuality: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast (Turbo)</SelectItem>
                <SelectItem value="quality">High Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            "Fast" is optimized for narrative flow. "Quality" uses higher-end models.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
