export interface UserAIPreferences {
  geminiEnabled: boolean;
  googleApiKey?: string;
  preferGemini: boolean;
  // Visual Generation Preferences
  imageQuality: 'fast' | 'quality'; // High-level toggle
  preferredModel?: string;         // Fine-grained control
}

export class UserAIPreferenceService {
  private static readonly PREFERENCE_COOKIE_NAME = 'ai_preferences';

  static async getUserPreferences(): Promise<UserAIPreferences> {
    try {
      if (typeof window !== 'undefined') {
        const prefs = localStorage.getItem('aiPreferences');
        if (prefs) {
          return JSON.parse(prefs);
        }
      }
    } catch (error) {
      console.warn('Failed to load AI preferences:', error);
    }

    return {
      geminiEnabled: false,
      preferGemini: false,
      imageQuality: 'fast'
    };
  }

  static async saveUserPreferences(preferences: UserAIPreferences) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aiPreferences', JSON.stringify(preferences));
      }
    } catch (error) {
      console.error('Failed to save AI preferences:', error);
    }
  }

  static async clearUserPreferences() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('aiPreferences');
      }
    } catch (error) {
      console.error('Failed to clear AI preferences:', error);
    }
  }
}