# Local Development Setup

This guide helps you run The Shelf locally on your machine.

## Prerequisites

- **Node.js** 20.x or later (check with `node --version`)
- **npm** 9.x or later
- **PostgreSQL** 14+ running locally or a cloud PostgreSQL instance

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your actual values (see Configuration section below).

### 3. Set Up Database

Ensure PostgreSQL is running, then push the schema:

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

---

## Configuration Details

### Database (Required)

Set `DATABASE_URL` to your PostgreSQL connection string:

```
DATABASE_URL=postgresql://username:password@localhost:5432/theshelf
```

For local PostgreSQL:
1. Create a database: `createdb theshelf`
2. Use: `DATABASE_URL=postgresql://localhost:5432/theshelf`

### Session Secret (Required for Production)

Generate a secure random string for `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Spotify API (Optional)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Add redirect URI: `http://localhost:5000/api/auth/callback`
4. Copy Client ID and Client Secret to `.env`

**Important**: The redirect URI in Spotify Dashboard must exactly match your `APP_BASE_URL` + `/api/auth/callback`

### Apple Music API (Optional)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Create a MusicKit key
3. Download the `.p8` file
4. Set in `.env`:
   - `APPLE_TEAM_ID`: Your 10-character Team ID
   - `APPLE_KEY_ID`: The Key ID shown in the portal
   - `APPLE_MUSIC_PRIVATE_KEY`: Contents of the `.p8` file

**Key Format Tips**:
- You can paste the key with escaped newlines: `-----BEGIN PRIVATE KEY-----\nMIGT....\n-----END PRIVATE KEY-----`
- Or use the raw multi-line format (works in most shells)

---

## Production Build

Build and run the production version:

```bash
npm run build
npm run start
```

For production, set:
- `NODE_ENV=production`
- `APP_BASE_URL=https://yourdomain.com`

---

## Troubleshooting

### Spotify "Invalid redirect URI" Error

1. Check that `APP_BASE_URL` matches your Spotify Dashboard redirect URI exactly
2. For local dev: `http://localhost:5000/api/auth/callback`
3. For production: `https://yourdomain.com/api/auth/callback`

### Apple Music Token Errors

1. Verify `APPLE_TEAM_ID` is your 10-character Team ID (not the Key ID)
2. Ensure the private key includes the `-----BEGIN/END PRIVATE KEY-----` headers
3. If using escaped newlines (`\n`), make sure they're not double-escaped

### Database Connection Errors

1. Verify PostgreSQL is running: `pg_isready`
2. Check connection string format: `postgresql://user:pass@host:port/dbname`
3. Ensure the database exists: `createdb theshelf`

### Port Already in Use

Change the port in `.env`:
```
PORT=3000
APP_BASE_URL=http://localhost:3000
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run db:push` | Push database schema changes |
| `npm run check` | Run TypeScript type checking |
