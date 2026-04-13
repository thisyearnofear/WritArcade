import { cookies } from 'next/headers';

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
      // Get from cookies for server components or localStorage for client components
      if (typeof window === 'undefined') {
        // Server-side
        const cookieStore = await cookies();
        const prefsCookie = cookieStore.get(this.PREFERENCE_COOKIE_NAME)?.value;

        if (prefsCookie) {
          return JSON.parse(decodeURIComponent(prefsCookie));
        }
      } else {
        // Client-side
        const prefs = localStorage.getItem('aiPreferences');
        if (prefs) {
          return JSON.parse(prefs);
        }
      }
    } catch (error) {
      console.warn('Failed to load AI preferences:', error);
    }

    // Default preferences
    return {
      geminiEnabled: false,
      preferGemini: false,
      imageQuality: 'fast'
    };
  }

  static async saveUserPreferences(preferences: UserAIPreferences) {
    try {
      if (typeof window === 'undefined') {
        // Server-side
        const cookieStore = await cookies();
        cookieStore.set(
          this.PREFERENCE_COOKIE_NAME,
          encodeURIComponent(JSON.stringify(preferences)),
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
          }
        );
      } else {
        // Client-side
        localStorage.setItem('aiPreferences', JSON.stringify(preferences));
      }
    } catch (error) {
      console.error('Failed to save AI preferences:', error);
    }
  }

  static async clearUserPreferences() {
    try {
      if (typeof window === 'undefined') {
        // Server-side
        const cookieStore = await cookies();
        cookieStore.delete(this.PREFERENCE_COOKIE_NAME);
      } else {
        // Client-side
        localStorage.removeItem('aiPreferences');
      }
    } catch (error) {
      console.error('Failed to clear AI preferences:', error);
    }
  }
}