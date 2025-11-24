# Farcaster Mini App SDK Migration

## Overview
Migrated WritArcade from the deprecated `@farcaster/frame-sdk` (Frames v2) to the current `@farcaster/miniapp-sdk` (Mini Apps) as of November 2025.

## Changes Made

### 1. Package Updates
- **Removed**: `@farcaster/frame-sdk` v0.0.64
- **Added**: `@farcaster/miniapp-sdk` v0.2.1
- **Rationale**: Frames v2 deprecated in March 2025; Mini Apps is the current standard

### 2. Core Integration (lib/farcaster.ts)
Updated imports and API calls:
```typescript
// Before
import sdk from '@farcaster/frame-sdk'
await initializeFarcasterSDK() // Returns boolean

// After  
import { sdk } from '@farcaster/miniapp-sdk'
await sdk.actions.ready() // Signals Mini App is ready
await getFarcasterContext() // Gets user/client context
```

**New Functions**:
- `getFarcasterContext()` - Get Mini App context (user, client, location info)
- `readyMiniApp()` - Call when UI is fully loaded
- `composeCast()` - Create a new cast (via Mini App SDK)
- `openUrl()` - Open external URLs in Mini App context

**Removed Functions**:
- `initializeFarcasterSDK()` - Replaced by getFarcasterContext + readyMiniApp
- `shareToFarcaster()` - Replaced by composeCast

### 3. Mini App Page (app/mini-app/page.tsx)
Updated initialization flow:
```typescript
// Before: async init checking SDK initialization
const initialized = await initializeFarcasterSDK()

// After: Get context, signal ready (critical for splash screen)
const context = await getFarcasterContext()
await readyMiniApp() // MUST call this or users see loading screen
```

### 4. Manifest File (public/.well-known/farcaster.json)
Created required Mini App manifest with:
- `accountAssociation`: Domain ownership verification
- `miniapp`: App metadata (name, URLs, icons, webhooks)
- Supports notifications, discovery, and app store listing

**Key fields**:
- `homeUrl`: App entry point
- `iconUrl`, `splashImageUrl`: UI assets
- `webhookUrl`: For handling Mini App events (optional for MVP)

### 5. Layout Metadata (app/mini-app/layout.tsx)
Added proper Meta tags for feed discovery:
```typescript
// fc:miniapp meta tag for embeds in Farcaster feeds
<meta name="fc:miniapp" content={JSON.stringify({
  version: '1',
  imageUrl: '...',
  button: {
    title: 'Play WritArcade',
    action: {
      type: 'launch_miniapp',
      name: 'WritArcade',
      url: 'https://writarcade.vercel.app/mini-app'
    }
  }
})} />
```

### 6. GameCustomizer Component
Created new `app/mini-app/components/GameCustomizer.tsx` that was referenced but missing.

## Key Differences: Frame SDK vs Mini App SDK

| Aspect | Frame SDK | Mini App SDK |
|--------|-----------|--------------|
| Package | `@farcaster/frame-sdk` | `@farcaster/miniapp-sdk` |
| Import | `import sdk from ...` | `import { sdk } from ...` |
| Init | `sdk.context` (async) | `sdk.context` (async) + `sdk.actions.ready()` |
| Compose | Manual URL building | `sdk.actions.composeCast()` |
| UI | Embedded cards (3:2 ratio) | Full-screen modal (424x695px web) |
| Notifications | Not native | Built-in via webhooks |
| Manifest | Not required | Required (`/.well-known/farcaster.json`) |
| App Store | No | Yes, with discovery |

## Critical Implementation Details

### The `ready()` Call
**MUST call `sdk.actions.ready()` after UI loads**, otherwise:
- Splash screen shows indefinitely
- Users see loading state
- App appears broken

### Context Structure
Mini App context now includes location info:
```typescript
{
  user: { fid, username, displayName, pfpUrl },
  client: { platformType, clientFid, added, notificationDetails },
  location: { type: 'cast_embed' | 'cast_share' | 'launcher' | etc }
}
```

Use `location.type` to understand how app was launched.

### Manifest Requirements
- Domain ownership signature required (base64 JFS format)
- Placeholder signature generated; update with real signature before prod
- Webhook URL needed only if using notifications

## Next Steps for Production

1. **Sign Manifest Properly**
   - Use Farcaster developer tools to generate real signature
   - Update `accountAssociation` in manifest with your custody address

2. **Configure Webhook** (if using notifications)
   - Implement `/api/farcaster/webhook` endpoint
   - Add `@farcaster/miniapp-node` for webhook verification
   - Handle `miniapp_added`, `miniapp_removed`, `notifications_enabled/disabled` events

3. **Test in Developer Mode**
   - Enable Developer Mode on Farcaster (settings/developer-tools)
   - Test in Warpcast or Base App
   - Verify manifest loads at `/.well-known/farcaster.json`

4. **Deploy and Submit**
   - Publish to production domain
   - Submit to Mini App Store
   - Track analytics and user engagement

## Documentation Links

- **Mini Apps Spec**: https://miniapps.farcaster.xyz/
- **SDK Reference**: https://miniapps.farcaster.xyz/docs/specification
- **Context API**: https://miniapps.farcaster.xyz/docs/sdk/context
- **Publishing Guide**: https://miniapps.farcaster.xyz/docs/guides/publishing
- **Notifications**: https://miniapps.farcaster.xyz/docs/guides/notifications

## Files Modified

- `package.json` - Updated dependencies
- `lib/farcaster.ts` - New SDK integration
- `app/mini-app/page.tsx` - Updated initialization
- `app/mini-app/layout.tsx` - Added (new file)
- `app/mini-app/components/GameCustomizer.tsx` - Added (new file)
- `public/.well-known/farcaster.json` - Added (manifest)

## Migration Complete

All SDK-level changes are complete. The app is now aligned with November 2025 Mini App standards.
