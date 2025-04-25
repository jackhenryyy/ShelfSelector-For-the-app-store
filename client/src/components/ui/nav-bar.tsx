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
    <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-4 py-2 bg-white">
      {navItems.map((item) => {
        const isActive = location === item.path;
        
        return (
          <Link key={item.path} href={item.path}>
            <span className={`font-mono text-sm ${isActive ? 'text-black' : 'text-black/60'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
