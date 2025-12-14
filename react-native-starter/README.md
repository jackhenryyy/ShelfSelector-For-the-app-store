# The Shelf - React Native Starter Code

This folder contains starter code for your React Native + Expo mobile app.

## IMPORTANT: These files are NOT meant to run in Replit

These files should be copied into a new Expo project on your computer. The LSP errors you see are expected because React Native packages aren't installed in the Replit environment.

## How to Use This Code

1. On your computer, create a new Expo project:
   ```bash
   npx create-expo-app the-shelf-mobile --template blank-typescript
   cd the-shelf-mobile
   ```

2. Install dependencies listed in `package.json`:
   ```bash
   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context expo-auth-session expo-crypto expo-web-browser expo-linking expo-image expo-secure-store
   ```

3. Copy these folders into your new project:
   - `lib/` → `lib/`
   - `hooks/` → `hooks/`
   - `components/` → `components/`
   - `screens/` → `screens/`
   - `App.tsx` → Replace your `App.tsx`

4. Update `lib/supabase.ts` with your Supabase credentials

5. Update `lib/spotify.ts` with your Spotify Client ID

6. Update `app.json` with your bundle identifier

7. Run the app:
   ```bash
   npx expo start
   ```

## What's Included

- `lib/supabase.ts` - Supabase client configuration
- `lib/types.ts` - TypeScript type definitions
- `lib/spotify.ts` - Spotify API helper functions
- `hooks/useAuth.ts` - Authentication hook
- `hooks/useAlbums.ts` - Hooks for queue, no-skips, and reviews
- `components/AlbumCard.tsx` - Album card component
- `components/StarRating.tsx` - Star rating component
- `screens/LoginScreen.tsx` - Login/signup screen
- `screens/HomeScreen.tsx` - Home shuffle screen
- `App.tsx` - Main app with navigation

## What You Still Need to Build

- Queue screen (list/add/remove albums)
- No Skips screen (favorites + top 4)
- List screen (reviews/diary)
- Album search functionality
- Review dialogs
- Genre editing
- CSV import/export (optional for mobile)

See the MIGRATION_GUIDE.md in the root folder for complete instructions.
