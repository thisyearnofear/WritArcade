import React from 'react';
import { useVisualConfig } from '@/contexts/visual-config.context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';

export const ModelSelector: React.FC = () => {
  const { preferences, updatePreferences, loading } = useVisualConfig();
  const { getTouchClasses } = useMobileOptimizations();

  if (loading || !preferences) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={getTouchClasses(
            "gap-2 bg-background/95 backdrop-blur-sm border-border hover:bg-accent shadow-lg",
            "min-h-[48px] px-4"
          )}
        >
          <Settings2 size={18} />
          <span className="hidden sm:inline">Advanced Visuals</span>
          <span className="sm:hidden">Visuals</span>
        </Button>
      </DialogTrigger>
// ... (rest of component)
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
