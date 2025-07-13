// Quick script to check what redirect URI we're generating
const redirectUri = 'https://shelf-selector-thejackattack.replit.app/api/auth/callback';
console.log('Expected Spotify redirect URI:', redirectUri);
console.log('Make sure this EXACT URL is in your Spotify app settings as a redirect URI');
console.log('In Spotify Developer Dashboard:');
console.log('1. Go to https://developer.spotify.com/dashboard');
console.log('2. Find "The Shelf" app');
console.log('3. Click "Settings"');
console.log('4. Check "Redirect URIs" section');
console.log('5. Should contain:', redirectUri);