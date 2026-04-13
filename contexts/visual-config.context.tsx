'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAIPreferenceService, UserAIPreferences } from '@/lib/user-ai-preferences.service';

interface VisualConfigContextType {
  preferences: UserAIPreferences | null;
  updatePreferences: (newPrefs: Partial<UserAIPreferences>) => Promise<void>;
  loading: boolean;
}

const VisualConfigContext = createContext<VisualConfigContextType | undefined>(undefined);

export const VisualConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserAIPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UserAIPreferenceService.getUserPreferences().then(prefs => {
      setPreferences(prefs);
      setLoading(false);
    });
  }, []);

  const updatePreferences = async (newPrefs: Partial<UserAIPreferences>) => {
    if (!preferences) return;
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    await UserAIPreferenceService.saveUserPreferences(updated);
  };

  return (
    <VisualConfigContext.Provider value={{ preferences, updatePreferences, loading }}>
      {children}
    </VisualConfigContext.Provider>
  );
};

export const useVisualConfig = () => {
  const context = useContext(VisualConfigContext);
  if (!context) throw new Error('useVisualConfig must be used within VisualConfigProvider');
  return context;
};
