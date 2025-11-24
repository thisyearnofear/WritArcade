# WritArcade Architecture

## Farcaster-Native Architecture

### ✅ What Changed

#### **Removed Database-Stored Social Profiles**
We've eliminated all social profile fields from the database:
- ❌ `username` field removed from user preferences
- ❌ `farcasterFid` removed from user preferences  
- ❌ `farcasterId` removed from user preferences

### **New Approach: Fetch from Farcaster at Runtime**

**Database (Minimal)**
```prisma
model User {
  id            String  @id
  walletAddress String  @unique

  // ONLY preferences
  preferredModel String  @default("gpt-4o-mini")
  private        Boolean @default(false)

  // Relations
  games Game[]
  ...
}
```

**Social Data (Farcaster)**
```typescript
// lib/farcaster.ts
getFarcasterProfile(walletAddress) → {
  username, displayName, bio, pfpUrl, fid
}
```

## 🎯 Why This Is Better

### 1. **Single Source of Truth**
- Farcaster owns social identity
- No data duplication
- Always up-to-date profiles

### 2. **Privacy by Design**
- We don't store PII
- Users control their data via Farcaster
- GDPR-friendly

### 3. **Simpler Architecture**
```
Before:
Wallet → DB (cache username) → Display

After:
Wallet → Farcaster API → Display
```

### 4. **Better UX**
- Profile updates instant (no cache invalidation)
- Users manage one profile (Farcaster)
- Consistent identity across apps

## 📋 What Users Can Configure

### **In WritArcade (Preferences)**
- ✅ Preferred AI model
- ✅ Game privacy (public/private)

### **In Farcaster (Social Profile)**
- ✅ Username
- ✅ Display name
- ✅ Avatar/PFP
- ✅ Bio
- ✅ Verified addresses

## 🔧 Implementation

### **Server-Side (Profile Page)**
```typescript
// app/profile/page.tsx
const user = await getCurrentUser() // Only preferences
const displayName = await getDisplayName(user.walletAddress)
const avatarUrl = await getAvatarUrl(user.walletAddress)
```

### **Client-Side (User Menu)**
```typescript
// domains/users/components/user-menu.tsx
const { address } = useAccount()
// TODO: const { profile } = useFarcasterProfile(address)
const displayName = profile?.username || `${address.slice(0,6)}...`
```

### **API Routes**
```typescript
// app/api/user/preferences/route.ts
PATCH /api/user/preferences
{
  model: "gpt-4o-mini",
  private: false
}
```

## 🚀 Next Steps

### **Farcaster Integration**
```typescript
// Add to .env
NEYNAR_API_KEY="your-key"

// Implement in lib/farcaster.ts
export async function getFarcasterProfile(address: string) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/by-verification?address=${address}`,
    { headers: { 'api_key': process.env.NEYNAR_API_KEY } }
  )
  return res.json()
}
```

### **Client-Side Hook**
```typescript
// hooks/useFarcasterProfile.ts
export function useFarcasterProfile(address?: string) {
  const [profile, setProfile] = useState<FarcasterProfile | null>(null)

  useEffect(() => {
    if (!address) return
    fetch(`/api/farcaster/profile?address=${address}`)
      .then(r => r.json())
      .then(setProfile)
  }, [address])

  return { profile, loading: !profile }
}
```

## 📊 Comparison

| Feature | Before (DB-Stored) | After (Farcaster-Native) |
|---------|-------------------|-------------------------|
| Username | Stored in DB | Fetched from Farcaster |
| Avatar | Not implemented | Farcaster PFP |
| Bio | Not implemented | Farcaster bio |
| Data freshness | Stale (cached) | Always fresh |
| Privacy | We store PII | No PII stored |
| User control | Limited | Full (via Farcaster) |
| Complexity | High (sync logic) | Low (fetch on demand) |

## 🎨 User Experience

### **Profile Page**
```
┌─────────────────────────────────────┐
│ [Avatar] @username                  │
│          0x1234...5678              │
│                                     │
│ Game Preferences                    │
│ ├─ AI Model: GPT-4o Mini           │
│ └─ Private Games: OFF              │
│                                     │
│ Your username and profile are       │
│ managed by Farcaster                │
└─────────────────────────────────────┘
```

### **User Menu**
```
┌─────────────────────┐
│ @username           │
│ 0x1234...5678       │
├─────────────────────┤
│ ⚙️  Preferences      │
│ 🎮 My Games         │
├─────────────────────┤
│ 🚪 Disconnect       │
└─────────────────────┘
```

## ✨ Benefits

1. **For Users**
   - One profile to manage (Farcaster)
   - Instant updates across all apps
   - Full control over identity

2. **For Us**
   - Less data to manage
   - No sync issues
   - Better privacy compliance
   - Simpler codebase

3. **For the Ecosystem**
   - Interoperable identity
   - Network effects
   - Farcaster-native from day one

---

## Database Purpose

### Why We Need a Database (It's Not for User Profiles!)

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

## Example User Flow

1. **Anonymous User**: Generate games, play immediately (stored in session)
2. **Connect Wallet**: Link session to wallet address
3. **Farcaster Lookup**: Fetch profile from Farcaster API
4. **Enhanced Features**: Save games, track payments, mint NFTs
5. **Social Features**: Share via Farcaster, not internal system

This keeps WritArcade focused on its core value: **turning articles into games**, while leveraging existing platforms for identity and social features.