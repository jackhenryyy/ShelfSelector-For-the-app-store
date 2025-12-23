
import { useEffect } from "react";
import { useAppleMusic } from "@/hooks/use-spotify";
import { useMusicConfig } from "@/hooks/use-spotify";
import { Button } from "./button";
import { Music } from "lucide-react";

export function AppleMusicConnect() {
  const { data: config } = useMusicConfig();
  const { isAuthorized, isInitialized, initialize, authorize, unauthorize } = useAppleMusic();
  
  useEffect(() => {
    if (config?.musicService === 'apple_music' && config?.appleMusicAvailable && !isInitialized) {
      // Wait for MusicKit to load
      const checkMusicKit = setInterval(() => {
        if (window.MusicKit) {
          clearInterval(checkMusicKit);
          initialize();
        }
      }, 100);
      
      return () => clearInterval(checkMusicKit);
    }
  }, [config, isInitialized, initialize]);
  
  if (config?.musicService !== 'apple_music') {
    return null;
  }
  
  if (!config?.appleMusicAvailable) {
    return (
      <div className="p-4 border border-yellow-500 bg-yellow-50 rounded">
        <p className="text-sm text-yellow-800">
          Apple Music is not configured on this server. Contact the administrator.
        </p>
      </div>
    );
  }
  
  if (!isInitialized) {
    return (
      <div className="p-4 border border-gray-300 rounded">
        <p className="text-sm text-gray-600">Loading Apple Music...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 border border-black rounded">
      {isAuthorized ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-red-500" />
            <span className="text-sm font-mono">Apple Music Connected</span>
          </div>
          <Button
            onClick={unauthorize}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-mono">Connect your Apple Music account to access your library</p>
          <Button
            onClick={authorize}
            className="w-full bg-gradient-to-r from-[#FC3C44] to-[#FA2D55] text-white hover:opacity-90"
          >
            <Music className="w-4 h-4 mr-2" />
            Connect Apple Music
          </Button>
        </div>
      )}
    </div>
  );
}

// Add TypeScript declaration for MusicKit
declare global {
  interface Window {
    MusicKit: any;
  }
}
