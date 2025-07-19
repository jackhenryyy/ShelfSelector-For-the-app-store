# The Shelf - Music Curation App

## Overview

The Shelf is a minimalistic music curation app that helps users decide what to listen to on Spotify. It connects to the Spotify API and allows users to shuffle through saved albums, log personal reviews, and organize their music collection into curated lists.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the client application
- **Vite** as the build tool and development server
- **TailwindCSS** for styling with a minimalistic design approach
- **Radix UI** components for accessible UI primitives
- **Wouter** for client-side routing
- **TanStack Query** for server state management and caching
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Express.js** server with TypeScript
- **Passport.js** for authentication with local strategy using scrypt for password hashing
- **Express Session** with PostgreSQL session store for session management
- **RESTful API** design for client-server communication

### Database Design
- **PostgreSQL** database with Drizzle ORM
- **Schema includes**:
  - Users table with native authentication and optional Spotify integration
  - Albums table for storing Spotify album metadata
  - Queue albums for user's "shuffle" collection
  - No Skips albums for user's favorites with top 4 feature
  - Album reviews for user's diary-style reviews with ratings

## Key Components

### Authentication System
- Native username/password authentication
- Optional Spotify API integration for album data
- Session-based authentication with secure cookie storage
- Password hashing using Node.js crypto scrypt

### Music Data Management
- Spotify API integration for album search and metadata
- Local album storage to reduce API calls
- Genre editing and categorization system
- Album cover caching and background image rotation

### User Collections
- **The Queue**: Albums for shuffling with sorting and filtering
- **No Skips**: Favorite albums with shareable "Top 4" feature
- **The List**: Personal album reviews with ratings and notes

### UI/UX Features
- Progressive Web App (PWA) capabilities
- Mobile-first responsive design
- Dynamic blurred album art backgrounds
- Grid scaling for different screen sizes
- CSV import/export functionality

## Data Flow

1. **User Authentication**: Users log in with username/password or register new accounts
2. **Album Discovery**: Search Spotify API for albums or import via CSV
3. **Collection Management**: Add albums to Queue, No Skips, or review in The List
4. **Shuffling**: Random album selection from either Queue or No Skips
5. **Review System**: Rate and review albums with diary-style entries
6. **Social Sharing**: Share No Skips collection via public links

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components
- **react-hook-form**: Form handling
- **@hookform/resolvers**: Form validation with Zod
- **wouter**: Lightweight routing
- **date-fns**: Date manipulation

### Development Tools
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **tailwindcss**: Utility-first CSS
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
- Frontend built with Vite to static assets
- Backend bundled with esbuild for Node.js production
- Environment-specific configuration for database and Spotify API

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `SPOTIFY_CLIENT_ID`: Spotify API client ID (optional)
- `SPOTIFY_CLIENT_SECRET`: Spotify API client secret (optional)
- `NODE_ENV`: Environment setting

### PWA Features
- Service worker for offline capability
- Web app manifest for installability
- Icon assets for different platforms

## Changelog
- July 18, 2025. Implemented complete custom drag-and-drop sorting system:
  - Added custom order option to sort dropdown with three sorting modes: date added, a-z, and custom order
  - Created SortableAlbumCard component using @dnd-kit libraries for seamless drag-and-drop functionality
  - Built API endpoint (/api/no-skips/custom-order) for updating album positions with proper database integration
  - Added customOrder field to noSkipsAlbums database table for storing user-defined sort positions
  - Conditional rendering shows draggable grid when "custom order" selected, regular grid for other sorts
  - Maintains identical visual format (album titles, artists, genres) while enabling drag-and-drop reordering
  - Real-time database updates with automatic cache invalidation for immediate UI reflection
  - Simplified sort dropdown to flat, square design with only essential three sorting options
- July 18, 2025. Fixed Spotify widget "Add to Queue" functionality:
  - Corrected API call in CompactNowPlayingWidget to pass albumId directly instead of as object
  - Add to Queue button now works properly on deployed version
  - Fixed parameter mismatch between widget implementation and useQueueAlbums hook
- July 18, 2025. Enhanced shared page functionality and improved review indicators:
  - Added read-only review popups to shared no-skips pages with same functionality as main page
  - Updated review indicators from 📝 emoji to black square with white notebook icon for consistent design
  - Albums with reviews show visual indicator that matches app's black square design language
  - Shared pages include Spotify button hover overlay for opening albums in Spotify
  - Server API now includes no-skips reviews in shared collection data
- July 18, 2025. Updated top 4 widget design and share page layout:
  - Moved compact top 4 widget from nav bar to top of no-skips page per user preference
  - Increased album cover size to 10x10px with improved spacing and centering
  - Updated shared no-skips page to match new compact top 4 widget layout
  - Share page now reflects current page design with horizontal top 4 bar
  - Maintained clean minimal design with centered positioning and integrated edit button
- July 18, 2025. Completed separation of No Skips reviews from The List:
  - Created dedicated noSkipsReviews database table separate from albumReviews
  - Built complete API system for no skips reviews (/api/no-skips-reviews endpoints)
  - Added client-side hooks specifically for no skips review management
  - Updated No Skips page to use separate review system with proper handlers
  - Fixed deleteReview error by implementing handleDeleteReview function
  - No Skips reviews now completely isolated from The List reviews
  - Users can add reviews to No Skips albums without affecting The List page
- July 18, 2025. Implemented comprehensive WYSIWYG rich text editing system:
  - Replaced all text input areas with visual rich text editors
  - Users can now bold, italicize, and hyperlink text with immediate visual feedback
  - No more markdown syntax - formatting appears directly in the text box
  - Toolbar buttons for Bold, Italic, and Link functionality
  - Keyboard shortcuts: Ctrl+B for bold, Ctrl+I for italic
  - Link dialog for easy hyperlink creation with custom text and URLs
  - Rich text content properly displayed in all review views
  - Updated placeholders to guide users on formatting options
  - Eliminated preview boxes for cleaner, more intuitive interface
- July 18, 2025. Enhanced "The List" review popup functionality:
  - Added star rating display and editing capability in review popup
  - Added "Listened On" date display and editing with calendar picker
  - Restored delete button functionality in both view and edit modes of popup
  - Updated popup to show comprehensive review information (rating, date, review text)
  - Maintained existing genre editing and album information display
  - Date and day boxes on main list page now reflect "listened to date" when available
- July 18, 2025. Enhanced shelf page UI and Spotify integration:
  - Fixed logout button layering issue on shelf page by increasing z-index to z-50
  - Added compact Spotify widget to bottom navigation bar on shelf page only
  - Compact widget is 50% smaller with condensed layout and smaller album art
  - Widget includes same "Add to Queue" and "Add to List" functionality as home page
  - "Add to List" uses identical AlbumDetailsDialog for consistent review interface
  - Real-time updates with 1-second refresh rate maintained in compact format
- July 18, 2025. Enhanced Spotify player functionality and token management:
  - Updated now playing widget to refresh every 1 second for real-time updates
  - Implemented automatic Spotify token refresh to prevent daily re-authentication
  - Added navigation to queue page when "Add to Queue" button is clicked
  - Created comprehensive token refresh system that handles expired tokens automatically
  - Users no longer need to reconnect Spotify every few days
  - Enhanced error handling for token expiration with automatic refresh attempts
  - Improved user experience with seamless token management in background
- July 15, 2025. Fixed Spotify authentication and API route issues:
  - Resolved authentication setup ordering issues that prevented req.isAuthenticated from working
  - Fixed route registration order to ensure API routes work before Vite catch-all
  - Simplified Spotify authentication system with environment-based URL detection
  - Configured proper redirect URIs for both development and production environments
  - Development: http://localhost:5000/api/spotify/callback
  - Production: https://shelf-selector-thejackattack.replit.app/api/spotify/callback
  - Added debug endpoint to verify Spotify configuration
  - Authentication flow now works correctly with proper token storage
  - All API routes verified working with proper authentication middleware
- July 13, 2025. Completed major UI improvements and Spotify integration:
  - Moved edit button away from close button in review popup
  - Made genre editing popup-only (removed from main page display)
  - Changed album removal X button to square overlay instead of circle
  - Removed 200 character limit for reviews
  - Added Spotify now playing widget to home page
  - Real-time display of currently playing track with progress bar
  - "Add to Queue" and "Add to List" buttons for quick album management
  - Spotify login button for users without connected accounts
  - "Add to List" button opens review popup immediately for full editing experience
  - Fixed Spotify authentication flow issue (popup vs same-window redirect)
  - Ready for deployment with working Spotify authentication
- July 12, 2025. Completed review system fixes:
  - Fixed decimal rating validation to support 0.5-5.0 star ratings
  - Resolved date persistence issues in review popup
  - Fixed database type conversion for ratings (decimal to number)
  - Enhanced review popup with dual view/edit modes
  - Improved queue and list page layouts
- July 05, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.