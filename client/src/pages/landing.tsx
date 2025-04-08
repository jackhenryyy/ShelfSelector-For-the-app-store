import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSpotifyAuth } from "@/hooks/use-spotify";
import { AlbumCollageBackground } from "@/components/ui/album-collage-background";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to homepage if already authenticated
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Dynamic album background */}
      <AlbumCollageBackground refreshInterval={7000} />
      
      {/* Semi-transparent overlay for readability */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-[1]"></div>
      
      <div className="flex flex-col items-center justify-center h-screen px-10 relative z-10">
        <h1 className="text-4xl font-mono tracking-wide mb-32 text-black">the shelf</h1>
        
        <div className="max-w-md w-full bg-white/80 p-8 border border-black/20 shadow-sm">
          <h2 className="text-2xl font-mono mb-6 text-center">welcome</h2>
          
          <div className="space-y-4">
            <a 
              href="/auth"
              className="block w-full py-2 px-4 bg-white border border-black font-mono text-black text-center hover:bg-black/5 transition-colors"
            >
              sign in
            </a>
            
            <a 
              href="/auth?register=true"
              className="block w-full py-2 px-4 bg-white border border-black font-mono text-black text-center hover:bg-black/5 transition-colors"
            >
              register
            </a>
          </div>
          
          <p className="text-xs font-mono mt-6 text-black/70 text-center">
            organize your music with simplicity
          </p>
        </div>
      </div>
    </div>
  );
}
