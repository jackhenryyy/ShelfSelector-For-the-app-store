# The Shelf - App Store Migration

## Quick Start (4 Steps)

### Step 1: Create Your Accounts (15 minutes)
- [ ] **Supabase** (free) - https://supabase.com → Sign up
- [ ] **Expo** (free) - https://expo.dev → Sign up  
- [ ] **Apple Developer** ($99/year) - https://developer.apple.com → Enroll

### Step 2: Set Up Your Database (10 minutes)
1. In Supabase, click "New Project" and create one
2. Go to **SQL Editor** (left sidebar)
3. Open `SUPABASE_SCHEMA.sql` from this folder
4. Copy everything, paste into Supabase, click "Run"
5. Save your **Project URL** and **anon key** from Settings → API

### Step 3: Create Your Mobile App (20 minutes)
On your computer with Node.js installed:
```bash
npx create-expo-app the-shelf-mobile --template blank-typescript
cd the-shelf-mobile
```

Then copy the `react-native-starter` folder contents into your new project.

### Step 4: Build & Submit (1-2 hours)
Follow the detailed guide in `MIGRATION_GUIDE.md` for building and App Store submission.

---

## What's In This Folder

| File | What It Does |
|------|-------------|
| `START_HERE.md` | This quick-start guide |
| `SUPABASE_SCHEMA.sql` | Database setup - run this in Supabase |
| `MIGRATION_GUIDE.md` | Detailed step-by-step instructions |
| `react-native-starter/` | Code to copy into your new mobile app |

---

## Need More Detail?

See `MIGRATION_GUIDE.md` for the complete walkthrough with screenshots and troubleshooting.
