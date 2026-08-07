'use client';

import { useState, useEffect } from 'react';
import { AISettingsPanel } from '@/components/settings/AISettingsPanel';

interface UserAIPreferences {
  geminiEnabled: boolean;
  googleApiKey?: string;
  preferGemini: boolean;
}

export function AISettingsWrapper() {
  const [mounted, setMounted] = useState(false);
  const [initialPreferences, setInitialPreferences] = useState<UserAIPreferences | null>(null);

   
   
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mount gate + client-only preference load
    setMounted(true);

    // Load preferences client-side
    const loadPreferences = async () => {
      if (typeof window !== 'undefined') {
        // Try to get from localStorage first
        const saved = localStorage.getItem('aiPreferences');
        if (saved) {
          setInitialPreferences(JSON.parse(saved));
          return;
        }
      }

      // Fallback to default
      setInitialPreferences({ geminiEnabled: false, preferGemini: false });
    };

    loadPreferences();
  }, []);

  if (!mounted || !initialPreferences) {
    // Render a placeholder during SSR
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">AI Provider Settings</h2>
        <div className="animate-pulse h-24 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">AI Provider Settings</h2>
      <AISettingsPanel initialPreferences={initialPreferences} />
    </div>
  );
}