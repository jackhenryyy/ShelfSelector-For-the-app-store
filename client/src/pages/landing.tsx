import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSpotifyAuth } from "@/hooks/use-spotify";

export default function LandingPage() {
  const { isAuthenticated, login, isLoading } = useSpotifyAuth();
  const [, setLocation] = useLocation();

  // Redirect to homepage if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      <div 
        className="blurred-bg"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1473&q=80')"
        }}
      />
      
      <div className="status-bar">
        <div className="text-sm">9:41</div>
        <div className="flex gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center h-screen px-10">
        <h1 className="text-4xl font-medium tracking-widest mb-32 text-black">t h e &nbsp; s h e l f</h1>
        <button 
          className="bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium py-3 px-6 rounded-full flex items-center mt-auto mb-32 shadow-lg w-full justify-center transition duration-200"
          onClick={login}
          disabled={isLoading}
        >
          <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          {isLoading ? "Connecting..." : "Sign in with Spotify"}
        </button>
      </div>
    </div>
  );
}
