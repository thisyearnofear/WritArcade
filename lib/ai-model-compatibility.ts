import { google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service';
import type { LanguageModelV1 } from 'ai';

// Define a consistent interface for all AI models
export type CompatibleLanguageModel = LanguageModelV1;

// Create a compatibility wrapper for Google models to match other providers
export function getCompatibleGoogleModel(modelName: string, apiKey?: string): CompatibleLanguageModel {
  const resolvedApiKey = apiKey || process.env.GOOGLE_API_KEY;

  if (!resolvedApiKey) {
    throw new Error('Google API key is required');
  }

  // In @ai-sdk/google v3.x, API key is set via environment variable
  // Set it temporarily for this model creation
  const originalApiKey = process.env.GOOGLE_API_KEY;
  if (apiKey && apiKey !== originalApiKey) {
    process.env.GOOGLE_API_KEY = apiKey;
  }

  const model = google(modelName) as unknown as CompatibleLanguageModel;

  // Restore original API key if we changed it
  if (originalApiKey && apiKey !== originalApiKey) {
    process.env.GOOGLE_API_KEY = originalApiKey;
  }

  return model;
}

export function getCompatibleOpenAIModel(modelName: string): CompatibleLanguageModel {
  return openai(modelName) as unknown as CompatibleLanguageModel;
}

export function hasVeniceConfiguration(): boolean {
  return !!process.env.VENICE_API_KEY;
}

export function hasGeminiConfiguration(userPreferences?: UserAIPreferences): boolean {
  return !!(
    userPreferences?.geminiEnabled &&
    (process.env.GOOGLE_API_KEY || userPreferences?.googleApiKey)
  );
}

// Venice model that supports function calling / tools for generateObject
export const VENICE_DEFAULT_MODEL = 'llama-3.3-70b';

export function getCompatibleVeniceModel(modelName?: string): CompatibleLanguageModel {
  const veniceApiKey = process.env.VENICE_API_KEY;

  if (!veniceApiKey) {
    throw new Error('Venice API key is required');
  }

  const veniceProvider = createOpenAI({
    apiKey: veniceApiKey,
    baseURL: 'https://api.venice.ai/api/v1',
  });

  // Use a model that supports tools/function calling (required for generateObject)
  const effectiveModel = modelName || VENICE_DEFAULT_MODEL;
  return veniceProvider.chat(effectiveModel) as unknown as CompatibleLanguageModel;
}

export function getCompatibleAnthropicModel(modelName: string): CompatibleLanguageModel {
  return anthropic(modelName) as unknown as CompatibleLanguageModel;
}

// Consolidate AI model providers with compatibility
export function getModel(modelName: string, userPreferences?: UserAIPreferences): CompatibleLanguageModel {
  const normalizedModelName = modelName || 'gpt-4o-mini';

  // Check if user has Gemini enabled and provided API key
  if (hasGeminiConfiguration(userPreferences)) {
    if (normalizedModelName.startsWith('gemini') || userPreferences?.preferGemini) {
      const apiKey = userPreferences?.googleApiKey || process.env.GOOGLE_API_KEY;
      if (apiKey) {
        const geminiModelName = normalizedModelName.startsWith('gemini')
          ? normalizedModelName
          : 'gemini-2.0-flash';
        return getCompatibleGoogleModel(geminiModelName, apiKey);
      }
    }
  }

  if (normalizedModelName.startsWith('gpt')) {
    return getCompatibleOpenAIModel(normalizedModelName);
  } else if (normalizedModelName.startsWith('claude')) {
    return getCompatibleAnthropicModel(normalizedModelName);
  } else if (normalizedModelName.startsWith('venice')) {
    return getCompatibleVeniceModel(normalizedModelName);
  }

  // Default fallback
  return getCompatibleOpenAIModel('gpt-4o-mini');
}