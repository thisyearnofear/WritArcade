# WritArcade Database Purpose

## Why We Need a Database (It's Not for User Profiles!)

The database serves these core purposes for WritArcade:

### 🎮 **Game Data Storage**
- **Generated Games**: AI-generated game metadata (title, description, prompts)
- **Game Sessions**: Persistent gameplay across visits
- **Chat History**: Full conversation threads for each game
- **Game Assets**: Generated images, music, custom prompts

### 📄 **Content Processing Cache**
- **Processed Articles**: Scraped/processed newsletter content
- **Content Sources**: Newsletter/blog metadata and settings
- **Generation History**: Track which articles generated which games

### 💰 **Onchain Integration Data**
- **Payment Records**: Memecoin transactions for game generation
- **NFT Metadata**: Game minting information
- **Revenue Tracking**: Creator royalty distribution

### 🔗 **Session Management**
- **Anonymous Sessions**: Games work without wallet connection
- **Wallet Sessions**: Link sessions to wallet addresses when connected
- **Cross-Device Continuity**: Resume games on different devices

## What We DON'T Store

### ❌ **User Profiles** 
- Farcaster handles identity (username, avatar, bio, social graph)
- Wallet addresses are the only user identifier we need

### ❌ **Authentication Data**
- No passwords, emails, signup flows
- Wallet signatures handle authentication
- Farcaster API provides profile data

### ❌ **Social Features**
- Following, likes, comments handled by Farcaster
- Social features come from Farcaster's social graph

## Architecture Benefits

### 🚀 **Simplified Onboarding**
```typescript
// User connects wallet -> Immediately can use WritArcade
const user = await connectWallet()
const games = await generateGame(article, { walletAddress: user.address })
```

### 🔄 **Farcaster Integration**
```typescript
// Get user data from Farcaster API, not our database
const profile = await getFarcasterProfile(walletAddress)
const username = profile.username
const avatar = profile.pfp
```

### 💾 **Minimal Storage**
- Only store what's necessary for core functionality
- User preferences tied to wallet address
- Content and game data for performance

## Example User Flow

1. **Anonymous User**: Generate games, play immediately (stored in session)
2. **Connect Wallet**: Link session to wallet address
3. **Farcaster Lookup**: Fetch profile from Farcaster API
4. **Enhanced Features**: Save games, track payments, mint NFTs
5. **Social Features**: Share via Farcaster, not internal system

This keeps WritArcade focused on its core value: **turning articles into games**, while leveraging existing platforms for identity and social features.