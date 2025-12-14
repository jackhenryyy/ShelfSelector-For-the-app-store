# The Shelf

A minimalistic music curation app that helps you decide what to listen to on Spotify.

## Repository Structure

```
the-shelf/
├── client/                    # Web app frontend (React)
├── server/                    # Web app backend (Express)
├── shared/                    # Shared types and schemas
├── mobile-app-migration/      # Everything needed for App Store migration
│   ├── START_HERE.md          # Quick-start guide (read this first!)
│   ├── SUPABASE_SCHEMA.sql    # Database setup for Supabase
│   ├── MIGRATION_GUIDE.md     # Detailed migration instructions
│   └── react-native-starter/  # Mobile app starter code
└── README.md                  # This file
```

## Current Web App

The web app runs on Replit and includes:
- User authentication (signup/login)
- Spotify album search
- Album queue for shuffling
- "No Skips" favorites with Top 4 feature
- Album reviews diary ("The List")
- CSV import/export

## App Store Migration

To move this app to the Apple App Store, see the `mobile-app-migration/` folder.

**Start with:** `mobile-app-migration/START_HERE.md`

## Tech Stack

**Web App:**
- React + TypeScript
- Express.js backend
- PostgreSQL database
- Spotify API

**Mobile App (migration):**
- React Native + Expo
- Supabase (database + auth)
- Spotify API
