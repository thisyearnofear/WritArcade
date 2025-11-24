# Migration Cleanup Plan

## Files to Archive/Move from Old Structure

### Keep for Reference:
- `data/prompts/` → Move to `writarcade-next/lib/prompts/` (AI prompts)
- `public/images/` → Move to `writarcade-next/public/images/` (assets)
- `.env.template` → Reference for environment variables
- `ROADMAP.md` → Keep in root

### Archive (can be deleted after Phase 1):
- `src/` entire folder (replaced by domains/ structure)
- `package.json` (old one, replaced by writarcade-next version)
- `rollup.config.js` (replaced by Next.js build)
- `tailwind.config.js` (replaced by .ts version)
- Old deployment files

### Clean Root Structure:
```
/ (root)
├── ROADMAP.md
├── LICENSE.md  
├── writarcade-next/ (main project)
└── archived-infinity-arcade/ (old project backup)
```