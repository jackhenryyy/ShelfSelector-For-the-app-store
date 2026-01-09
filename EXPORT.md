# Exporting The Shelf for Local/External Use

This guide explains how to create a clean, portable copy of the project.

## Pre-Export Checklist

1. **Verify the build works:**
   ```bash
   npm run build
   ```

2. **Run the environment check:**
   ```bash
   tsx scripts/check-env.ts
   ```

3. **Test the app locally:**
   ```bash
   npm run dev
   # Visit http://localhost:5000/api/health
   ```

## Creating a Clean Export

### Option 1: Git Archive (Recommended)

If the repo is git-initialized with a clean .gitignore:

```bash
git archive --format=zip --output=theshelf-export.zip HEAD
```

This automatically excludes everything in .gitignore.

### Option 2: Manual Zip

Create a zip excluding build artifacts and secrets:

```bash
zip -r theshelf-export.zip . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x ".env" \
  -x ".env.local" \
  -x ".replit" \
  -x "replit.nix" \
  -x "replit.md" \
  -x ".cache/*" \
  -x ".config/*" \
  -x ".local/*" \
  -x ".upm/*" \
  -x ".replit-agent/*" \
  -x "attached_assets/*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "*.zip" \
  -x "*.tar.gz"
```

## Files NOT Included (by design)

| File/Folder | Reason |
|-------------|--------|
| `.env` | Contains secrets - copy from `.env.example` |
| `node_modules/` | Reinstall with `npm install` |
| `dist/` | Rebuild with `npm run build` |
| `.replit`, `replit.nix`, `replit.md` | Replit-specific, not needed locally |
| `attached_assets/` | Replit uploads, not needed for core functionality |

## Files That ARE Included

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `LOCAL_SETUP.md` | Setup instructions |
| `scripts/check-env.ts` | Environment verification |
| All source code | `client/`, `server/`, `shared/` |

## After Import

On a new machine:

```bash
# 1. Extract
unzip theshelf-export.zip -d theshelf
cd theshelf

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Push database schema
npm run db:push

# 5. Start development
npm run dev
```

## Verifying Export Completeness

A valid export should:
- [ ] Start with `npm run dev` after setup
- [ ] Pass `tsx scripts/check-env.ts` (with proper .env)
- [ ] Show healthy status at `/api/health`
- [ ] NOT contain any `.env` file with real secrets
- [ ] NOT require any Replit-specific files
