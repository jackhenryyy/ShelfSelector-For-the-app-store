# The Shelf - App Store Migration Guide

## Overview

This guide will walk you through migrating "The Shelf" from Replit to the Apple App Store using **React Native + Expo** with **Supabase** as your backend.

**What you'll end up with:**
- A native iOS app on the App Store
- Supabase handling all your user accounts and data
- Your Spotify integration working on mobile

**Time estimate:** 2-4 weeks for a working app

---

## Prerequisites (What You Need First)

### 1. Accounts to Create

| Account | Cost | Purpose | Link |
|---------|------|---------|------|
| Apple Developer Account | $99/year | Required to publish to App Store | https://developer.apple.com/programs/enroll/ |
| Supabase Account | Free | Database and authentication | https://supabase.com |
| Expo Account | Free | Build and deploy your app | https://expo.dev/signup |

### 2. Software to Install on Your Computer

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org
   
2. **Xcode** (Mac only - required for iOS)
   - Download from Mac App Store (it's free but ~12GB)
   - After installing, open it once and accept the license
   
3. **Expo CLI**
   ```bash
   npm install -g @expo/cli eas-cli
   ```

4. **Git** (for version control)
   - Download from: https://git-scm.com/downloads

---

## Phase 1: Set Up Supabase (Your New Backend)

### Step 1.1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Organization:** Create or select one
   - **Name:** `the-shelf` (or whatever you want)
   - **Database Password:** Make it strong and SAVE IT somewhere safe!
   - **Region:** Choose closest to your users
4. Click "Create new project" and wait ~2 minutes

### Step 1.2: Get Your Supabase Credentials

After your project is created:
1. Go to **Settings** (gear icon) → **API**
2. Copy and save these somewhere safe:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)
   - **service_role key** (keep this SECRET - only for backend/admin use)

### Step 1.3: Set Up Your Database Tables

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of the file `SUPABASE_SCHEMA.sql` (created below) and paste it
4. Click "Run" (or press Ctrl/Cmd + Enter)
5. You should see "Success" messages

### Step 1.4: Enable Row Level Security (RLS)

Row Level Security ensures users can only see their own data. The SQL file already includes these policies, but verify they're active:

1. Go to **Table Editor** (left sidebar)
2. Click on each table (users, albums, etc.)
3. Verify "RLS Enabled" badge appears

### Step 1.5: Set Up Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** (should be on by default)
3. For Spotify login (optional for now):
   - Go to **Authentication** → **Providers** → **Spotify**
   - You'll add credentials later

---

## Phase 2: Export Your Current Data (Optional)

If you have existing user data you want to keep:

### Step 2.1: Export from Replit Database

In your Replit project, run this in the shell:
```bash
# This creates a SQL dump of your data
pg_dump $DATABASE_URL > backup.sql
```

### Step 2.2: Import to Supabase

1. Download the `backup.sql` file from Replit
2. In Supabase SQL Editor, paste and run the INSERT statements
   (Be careful - you may need to adjust the format)

**Note:** If you're starting fresh, skip this phase entirely.

---

## Phase 3: Create Your React Native App

### Step 3.1: Initialize the Project

Open your terminal and run:

```bash
# Create a new Expo project
npx create-expo-app the-shelf-mobile --template blank-typescript
cd the-shelf-mobile

# Install required dependencies
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-secure-store

# Install navigation
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Install UI components
npx expo install expo-image expo-linear-gradient expo-linking

# Install for Spotify authentication
npx expo install expo-auth-session expo-crypto expo-web-browser
```

### Step 3.2: Project Structure

Create this folder structure inside your new project:

```
the-shelf-mobile/
├── app/                    # Your screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── home.tsx       # Shuffle screen
│   │   ├── queue.tsx      # Queue screen
│   │   ├── no-skips.tsx   # No Skips screen
│   │   └── list.tsx       # The List screen
│   ├── auth/
│   │   └── login.tsx      # Login/Register screen
│   └── _layout.tsx        # Navigation setup
├── lib/
│   ├── supabase.ts        # Supabase client setup
│   ├── spotify.ts         # Spotify API helpers
│   └── types.ts           # TypeScript types
├── components/
│   ├── AlbumCard.tsx
│   ├── StarRating.tsx
│   └── ...
└── hooks/
    ├── useAuth.ts
    └── useAlbums.ts
```

### Step 3.3: Set Up Supabase Client

Create `lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'YOUR_SUPABASE_URL' // Replace with your URL
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY' // Replace with your key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile!
  },
})
```

### Step 3.4: Set Up Types

Create `lib/types.ts`:

```typescript
export interface Album {
  id: number
  spotify_id: string
  name: string
  artist: string
  image_url: string
  release_year: number | null
  genre: string | null
}

export interface QueueAlbum {
  id: number
  user_id: string
  album_id: number
  added_at: string
  album?: Album
}

export interface NoSkipsAlbum {
  id: number
  user_id: string
  album_id: number
  added_at: string
  is_top_four: boolean
  top_four_position: number | null
  custom_order: number | null
  album?: Album
}

export interface AlbumReview {
  id: number
  user_id: string
  album_id: number
  rating: number
  review: string | null
  reviewed_at: string
  listened_at: string | null
  album?: Album
}
```

---

## Phase 4: Build Your Screens

I've created starter code files for you. See the `react-native-starter/` folder that will be created alongside this guide.

The main screens you need to recreate:
1. **Login/Register** - User authentication
2. **Home (Shuffle)** - Random album picker
3. **Queue** - Your album queue
4. **No Skips** - Favorite albums with Top 4
5. **The List** - Album reviews/diary

---

## Phase 5: Set Up Spotify Integration

### Step 5.1: Update Spotify Developer Dashboard

1. Go to https://developer.spotify.com/dashboard
2. Select your existing app (or create new one)
3. Go to **Settings** → **Edit Settings**
4. Add these Redirect URIs:
   ```
   exp://localhost:8081/--/spotify-callback
   yourappname://spotify-callback
   ```
5. Save changes

### Step 5.2: Add Spotify to Supabase (Optional)

If you want "Login with Spotify":
1. In Supabase → **Authentication** → **Providers** → **Spotify**
2. Add your Spotify Client ID and Secret
3. Copy the Supabase callback URL back to Spotify Dashboard

---

## Phase 6: Test Your App

### Step 6.1: Run on Simulator

```bash
cd the-shelf-mobile
npx expo start
```

Press `i` to open iOS Simulator (Mac only) or use Expo Go app on your phone.

### Step 6.2: Test Key Features

- [ ] Can create account and login
- [ ] Can search for albums
- [ ] Can add albums to Queue
- [ ] Can add albums to No Skips
- [ ] Can write reviews
- [ ] Can shuffle albums
- [ ] Top 4 feature works

---

## Phase 7: Prepare for App Store

### Step 7.1: Configure app.json

Update your `app.json`:

```json
{
  "expo": {
    "name": "The Shelf",
    "slug": "the-shelf",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "theshelf",
    "ios": {
      "bundleIdentifier": "com.yourname.theshelf",
      "buildNumber": "1",
      "supportsTablet": false,
      "infoPlist": {
        "NSAppleMusicUsageDescription": "We need access to play music in Spotify"
      }
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### Step 7.2: Create App Icons

You need these icon sizes:
- 1024x1024 px (App Store)
- 180x180 px (iPhone)
- 120x120 px (iPhone)
- 167x167 px (iPad Pro)
- 152x152 px (iPad)

Use a tool like https://appicon.co to generate all sizes from one image.

### Step 7.3: Take Screenshots

App Store requires screenshots for each device size:
- 6.7" (iPhone 14 Pro Max): 1290 x 2796 px
- 6.5" (iPhone 14 Plus): 1284 x 2778 px  
- 5.5" (iPhone 8 Plus): 1242 x 2208 px

---

## Phase 8: Build and Submit

### Step 8.1: Configure EAS Build

```bash
# Login to Expo
npx eas login

# Configure your project
npx eas build:configure
```

### Step 8.2: Create Production Build

```bash
# Build for iOS (this takes 15-30 minutes)
npx eas build --platform ios --profile production
```

You'll need to:
1. Have your Apple Developer account connected
2. Create necessary certificates (EAS can do this automatically)

### Step 8.3: Submit to App Store

```bash
npx eas submit --platform ios
```

Or manually:
1. Download the `.ipa` file from Expo
2. Open **Transporter** app on your Mac
3. Upload the `.ipa` file
4. Go to App Store Connect to complete the submission

### Step 8.4: App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Create a new app
3. Fill in:
   - App name: "The Shelf"
   - Primary language
   - Bundle ID (must match app.json)
   - SKU (any unique string)
4. Add:
   - Description
   - Keywords
   - Screenshots
   - Privacy Policy URL (required!)
   - Support URL

---

## Phase 9: After Submission

### Review Process

- Apple typically reviews apps in 24-48 hours
- You might get rejected the first time (it's normal!)
- Common rejection reasons:
  - Missing privacy policy
  - Bugs or crashes
  - Login issues (they test with a demo account)
  - Metadata issues

### Provide Demo Account

Apple needs to test your app. In App Store Connect:
1. Go to your app → **App Review Information**
2. Provide a demo username and password
3. Include any special instructions

---

## Troubleshooting

### Common Issues

**"Supabase connection failed"**
- Check your URL and anon key are correct
- Make sure you're using `react-native-url-polyfill`

**"Spotify login not working"**
- Verify redirect URIs match exactly
- Check your scheme in app.json

**"Build failed"**
- Check EAS build logs for specific errors
- Make sure all native dependencies are compatible

**"App rejected by Apple"**
- Read the rejection reason carefully
- Fix the issue and resubmit
- Reply to the reviewer if you disagree

---

## Cost Summary

| Item | Cost |
|------|------|
| Apple Developer Account | $99/year |
| Supabase (Free tier) | $0 (up to 500MB database) |
| Expo/EAS (Free tier) | $0 (limited builds) |
| Spotify API | Free |
| **Total to start** | **$99** |

---

## Need Help?

- **Expo Documentation:** https://docs.expo.dev
- **Supabase Documentation:** https://supabase.com/docs
- **React Native:** https://reactnative.dev
- **Apple Developer:** https://developer.apple.com/documentation/

---

## Files Included

1. `MIGRATION_GUIDE.md` - This guide
2. `SUPABASE_SCHEMA.sql` - Database setup for Supabase
3. `react-native-starter/` - Starter code for your mobile app
