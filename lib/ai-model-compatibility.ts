import { google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service';
import type { LanguageModel } from 'ai';

// Define a consistent interface for all AI models
export type CompatibleLanguageModel = LanguageModel;

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

// Check if OpenAI is likely to work (has API key configured)
export function hasOpenAIConfiguration(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Consolidate AI model providers with compatibility
// Priority: Venice (if configured) -> Gemini (if enabled) -> OpenAI
// IMPORTANT: Always prefer Venice when available to avoid OpenAI quota issues
export function getModel(modelName: string, userPreferences?: UserAIPreferences): CompatibleLanguageModel {
  // If no model specified, use default priority: Venice -> Gemini -> OpenAI
  if (!modelName) {
    if (hasVeniceConfiguration()) {
      return getCompatibleVeniceModel(VENICE_DEFAULT_MODEL);
    }
    if (hasGeminiConfiguration(userPreferences)) {
      const apiKey = userPreferences?.googleApiKey || process.env.GOOGLE_API_KEY;
      if (apiKey) {
        return getCompatibleGoogleModel('gemini-2.0-flash', apiKey);
      }
    }
    return getCompatibleOpenAIModel('gpt-4o-mini');
  }

  // Route Venice/Llama models to Venice
  if (modelName.startsWith('venice') || modelName.startsWith('llama')) {
    return getCompatibleVeniceModel(modelName);
  }

  // Check if user has Gemini enabled and provided API key
  if (modelName.startsWith('gemini')) {
    if (hasGeminiConfiguration(userPreferences)) {
      const apiKey = userPreferences?.googleApiKey || process.env.GOOGLE_API_KEY;
      if (apiKey) {
        return getCompatibleGoogleModel(modelName, apiKey);
      }
    }
    // Gemini requested but not configured - fall back to Venice if available
    if (hasVeniceConfiguration()) {
      console.log(`Gemini not configured, falling back to Venice for model: ${modelName}`);
      return getCompatibleVeniceModel(VENICE_DEFAULT_MODEL);
    }
  }

  // GPT models - but prefer Venice if configured to avoid quota issues
  if (modelName.startsWith('gpt')) {
    // If Venice is available, use it instead of OpenAI to avoid quota issues
    if (hasVeniceConfiguration()) {
      console.log(`Using Venice instead of OpenAI (${modelName}) to avoid quota issues`);
      return getCompatibleVeniceModel(VENICE_DEFAULT_MODEL);
    }
    return getCompatibleOpenAIModel(modelName);
  }

  if (modelName.startsWith('claude')) {
    return getCompatibleAnthropicModel(modelName);
  }

  // Default fallback - try Venice first if configured
  if (hasVeniceConfiguration()) {
    return getCompatibleVeniceModel(VENICE_DEFAULT_MODEL);
  }
  return getCompatibleOpenAIModel('gpt-4o-mini');
}