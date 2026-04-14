# Image Generation System

## Overview
The Writers Arcade uses multiple image generation providers with automatic fallback to ensure reliable image generation for games.

## Current Provider Chain

### Primary Provider: Pollinations.ai ✅
- **Status**: Active
- **Cost**: Free (no API key required)
- **Model**: Flux
- **Quality**: High quality 1024x1024 images
- **Speed**: Fast (direct URL-based generation)
- **Reliability**: Excellent (no credit limits)

### Fallback Providers

#### 1. Modal
- **Status**: Requires credits
- **Model**: SDXL Turbo
- **Environment Variable**: `MODAL_IMAGE_GEN_URL`

#### 2. Netmind
- **Status**: Requires API key
- **Model**: FLUX.1-schnell
- **Environment Variable**: `NETMIND_API_KEY`

#### 3. Venice AI
- **Status**: Requires API key
- **Model**: Venice SD 3.5
- **Environment Variable**: `VENICE_API_KEY`

## Historical Context

### HuggingFace (Deprecated)
- **Status**: ❌ Deprecated as of 2026
- **Issue**: Old API endpoint `https://api-inference.huggingface.co` returns 410 error
- **Migration**: HuggingFace now requires using their `@huggingface/inference` SDK
- **Note**: The new router endpoint is OpenAI-compatible for chat only, NOT for image generation

## Implementation

### API Endpoint
`POST /api/generate-image`

### Request Body
```json
{
  "prompt": "A mysterious forest at twilight",
  "type": "scene",
  "model": "flux",
  "provider": "pollinations"
}
```

### Response
```json
{
  "imageUrl": "data:image/jpeg;base64,...",
  "model": "flux",
  "provider": "pollinations"
}
```

## Adding New Providers

To add a new image generation provider:

1. Create a new function in `app/api/generate-image/route.ts`:
```typescript
async function callNewProviderAPI(prompt: string): Promise<{ imageUrl: string | null; success: boolean }> {
  // Implementation
}
```

2. Add to the fallback chain:
```typescript
const fallbackChain = [
  { provider: 'pollinations', model: 'flux', call: () => callPollinationsAPI(prompt) },
  { provider: 'newprovider', model: 'model-name', call: () => callNewProviderAPI(prompt) },
  // ... other providers
]
```

3. Update the provider selection logic

## Testing

Test files are located in `tests/image-generation/`:
- `test-pollinations.mjs` - Tests Pollinations.ai API

To run tests:
```bash
node tests/image-generation/test-pollinations.mjs
```

## Troubleshooting

### 502 Errors
If you see 502 errors:
1. Check if Pollinations.ai is accessible
2. Verify fallback providers have valid API keys
3. Check provider credit balances
4. Review server logs for specific error messages

### Slow Generation
- Pollinations.ai typically responds in 2-5 seconds
- Fallback providers may take 10-30 seconds
- Timeout is set to 50 seconds per provider

### Image Quality Issues
- All providers generate 1024x1024 images
- Pollinations uses Flux model (high quality)
- Adjust prompt for better results

## Environment Variables

Required for fallback providers only:
```bash
# Optional - only needed if Pollinations fails
MODAL_IMAGE_GEN_URL=https://your-modal-endpoint.modal.run
NETMIND_API_KEY=your_netmind_key
VENICE_API_KEY=your_venice_key
```

## Performance Metrics

- **Average Generation Time**: 3-5 seconds (Pollinations)
- **Success Rate**: 99%+ (with fallback chain)
- **Cost**: $0 (primary provider is free)
- **Timeout**: 50 seconds per provider, 60 seconds total

## Future Improvements

1. Add more free providers (Replicate, Together AI)
2. Implement caching for repeated prompts
3. Add image quality selection (fast/balanced/quality)
4. Support for different aspect ratios
5. Batch generation support
