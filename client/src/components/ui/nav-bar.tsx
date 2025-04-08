import { Link, useLocation } from "wouter";

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
    <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-6 py-3 bg-white/90 backdrop-blur-sm">
      {navItems.map((item) => {
        const isActive = location === item.path;
        
        return (
          <Link key={item.path} href={item.path}>
            <a className={`font-mono text-base ${isActive ? 'text-black' : 'text-black/50'}`}>
              {item.label}
            </a>
          </Link>
        );
      })}
    </div>
  );
}
