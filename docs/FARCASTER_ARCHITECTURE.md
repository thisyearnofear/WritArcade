# Farcaster-Native Architecture

## ✅ What Changed

### **Removed Database-Stored Social Profiles**
We've eliminated all social profile fields from the database:
- ❌ `username` field removed
- ❌ `farcasterFid` removed  
- ❌ `farcasterId` removed

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

### **Immediate (Week 3)**
1. ✅ Database schema updated
2. ✅ Preferences-only form created
3. ✅ Farcaster utility functions added
4. ⏳ Implement Farcaster API integration

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

**Status**: Architecture complete, Farcaster API integration pending
**Next**: Implement Neynar API calls in `lib/farcaster.ts`
