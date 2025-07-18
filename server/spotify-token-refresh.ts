import { refreshAccessToken } from './spotify';
import { storage } from './storage';
import { User } from '@shared/schema';

/**
 * Checks if a Spotify access token is expired or close to expiring,
 * and refreshes it if needed.
 * @param user - The user with Spotify tokens
 * @returns Updated user with fresh tokens or null if refresh failed
 */
export async function ensureValidSpotifyToken(user: User): Promise<User | null> {
  // Check if user has tokens
  if (!user.accessToken || !user.refreshToken) {
    console.log('User missing Spotify tokens');
    return null;
  }

  // Check if token is expired or expires within next 5 minutes
  const now = new Date();
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  if (!user.tokenExpiry || (user.tokenExpiry.getTime() - now.getTime()) < expiryBuffer) {
    console.log('Spotify token expired or expiring soon, refreshing...');
    
    try {
      // Refresh the token
      const tokenData = await refreshAccessToken(user.refreshToken);
      
      // Calculate new expiry time
      const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
      
      // Update user in storage
      const updatedUser = await storage.updateUserTokens(
        user.id,
        tokenData.access_token,
        tokenData.refresh_token || user.refreshToken, // Keep old refresh token if not provided
        newExpiry
      );
      
      if (updatedUser) {
        console.log('Spotify token refreshed successfully');
        return updatedUser;
      } else {
        console.error('Failed to update user tokens in storage');
        return null;
      }
    } catch (error) {
      console.error('Failed to refresh Spotify token:', error);
      
      // If refresh fails, the user needs to re-authenticate
      return null;
    }
  }
  
  // Token is still valid
  return user;
}

/**
 * Wrapper for making Spotify API calls with automatic token refresh
 * @param user - The user making the request
 * @param apiCall - Function that makes the Spotify API call with access token
 * @returns Result of the API call or null if authentication failed
 */
export async function makeSpotifyAPICall<T>(
  user: User,
  apiCall: (accessToken: string) => Promise<T>
): Promise<T | null> {
  // Ensure we have a valid token
  const validUser = await ensureValidSpotifyToken(user);
  
  if (!validUser || !validUser.accessToken) {
    console.log('No valid Spotify token available');
    return null;
  }
  
  try {
    // Make the API call
    return await apiCall(validUser.accessToken);
  } catch (error) {
    // If we get an auth error, try refreshing one more time
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      console.log('API call failed with auth error, attempting token refresh...');
      
      try {
        const tokenData = await refreshAccessToken(validUser.refreshToken!);
        const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const refreshedUser = await storage.updateUserTokens(
          validUser.id,
          tokenData.access_token,
          tokenData.refresh_token || validUser.refreshToken!,
          newExpiry
        );
        
        if (refreshedUser && refreshedUser.accessToken) {
          console.log('Token refreshed after auth error, retrying API call...');
          return await apiCall(refreshedUser.accessToken);
        }
      } catch (refreshError) {
        console.error('Failed to refresh token after auth error:', refreshError);
      }
    }
    
    // Re-throw the original error
    throw error;
  }
}