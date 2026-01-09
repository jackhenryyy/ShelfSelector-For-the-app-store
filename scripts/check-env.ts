#!/usr/bin/env tsx
import 'dotenv/config';

interface EnvCheck {
  name: string;
  required: boolean;
  present: boolean;
  category: string;
}

const checks: EnvCheck[] = [];

function check(name: string, required: boolean, category: string) {
  checks.push({
    name,
    required,
    present: !!process.env[name],
    category
  });
}

// Core required
check('DATABASE_URL', true, 'Core');
check('SESSION_SECRET', true, 'Core');

// Core optional
check('APP_BASE_URL', false, 'Core');
check('PORT', false, 'Core');
check('NODE_ENV', false, 'Core');

// Spotify (optional provider)
check('SPOTIFY_CLIENT_ID', false, 'Spotify');
check('SPOTIFY_CLIENT_SECRET', false, 'Spotify');

// Apple Music (optional provider)
check('APPLE_TEAM_ID', false, 'Apple Music');
check('APPLE_MUSICKIT_KEY_ID', false, 'Apple Music');
check('APPLE_MUSICKIT_PRIVATE_KEY_BASE64', false, 'Apple Music');
check('APPLE_STOREFRONT', false, 'Apple Music');

// Group by category
const categories = [...new Set(checks.map(c => c.category))];

console.log('\n🔍 Environment Check\n');
console.log('='.repeat(50));

let hasErrors = false;
const missing: string[] = [];

for (const category of categories) {
  const categoryChecks = checks.filter(c => c.category === category);
  console.log(`\n${category}:`);
  
  for (const c of categoryChecks) {
    const status = c.present ? '✓' : (c.required ? '✗' : '○');
    const label = c.required ? '(required)' : '(optional)';
    console.log(`  ${status} ${c.name} ${label}`);
    
    if (c.required && !c.present) {
      hasErrors = true;
      missing.push(c.name);
    }
  }
}

console.log('\n' + '='.repeat(50));

// Provider status
const spotifyConfigured = checks.filter(c => c.category === 'Spotify').every(c => c.present);
const appleMusicConfigured = checks.filter(c => c.category === 'Apple Music' && c.name !== 'APPLE_STOREFRONT').every(c => c.present);

console.log('\nProvider Status:');
console.log(`  Spotify:     ${spotifyConfigured ? '✓ Configured' : '○ Not configured'}`);
console.log(`  Apple Music: ${appleMusicConfigured ? '✓ Configured' : '○ Not configured'}`);

if (hasErrors) {
  console.log('\n❌ Missing required environment variables:');
  for (const name of missing) {
    console.log(`   - ${name}`);
  }
  console.log('\nCopy .env.example to .env and fill in the required values.\n');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set.\n');
  process.exit(0);
}
