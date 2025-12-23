
import { useAuth } from "@/hooks/use-auth";
import { useMusicConfig } from "@/hooks/use-spotify";
import { AppleMusicConnect } from "@/components/ui/apple-music-connect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, LogOut } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: config } = useMusicConfig();

  const handleSpotifyConnect = () => {
    window.location.href = '/api/spotify/auth';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-mono mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-sm text-gray-500">Username</Label>
              <p className="font-mono">{user?.username}</p>
            </div>
            {user?.email && (
              <div>
                <Label className="text-sm text-gray-500">Email</Label>
                <p className="font-mono">{user.email}</p>
              </div>
            )}
            <Button
              onClick={logout}
              variant="outline"
              className="mt-4"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Music Services */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Music Services</CardTitle>
            <CardDescription>Connect your music streaming accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-mono mb-2 block">Current Service</Label>
              <p className="text-sm text-gray-600 mb-4">
                {config?.musicService === 'spotify' ? 'Spotify' : 'Apple Music'}
              </p>
            </div>

            {/* Spotify Connection */}
            <div>
              <h3 className="text-sm font-mono mb-2">Spotify</h3>
              {config?.spotifyConnected ? (
                <div className="p-4 border border-green-500 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-mono text-green-800">Connected</span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleSpotifyConnect}
                  className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Connect Spotify
                </Button>
              )}
            </div>

            {/* Apple Music Connection */}
            <div>
              <h3 className="text-sm font-mono mb-2">Apple Music</h3>
              <AppleMusicConnect />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
