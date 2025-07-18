import { Link, useLocation } from "wouter";
import { CompactNowPlayingWidget } from "./compact-now-playing-widget";

// Simple nav items without icons, matching the minimal design
const navItems = [
  {
    path: "/",
    label: "the shelf",
  },
  {
    path: "/queue",
    label: "the queue",
  },
  {
    path: "/no-skips",
    label: "no skips",
  },
  {
    path: "/list",
    label: "the list",
  },
];

export function NavBar() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/20 z-50">
      {/* Show compact Spotify widget only on the home page */}
      {location === "/" && (
        <div className="w-1/2 mx-auto">
          <CompactNowPlayingWidget />
        </div>
      )}
      
      <div className="flex justify-between items-center px-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path} className="flex-1 text-center">
              <span className={`font-mono text-xs ${isActive ? 'text-black' : 'text-black/50'} block py-3`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
