import { Link, useLocation } from "wouter";
import { BookIcon, GridIcon, HeartIcon, LayoutListIcon } from "lucide-react";

const navItems = [
  {
    path: "/",
    label: "the shelf",
    icon: BookIcon,
  },
  {
    path: "/queue",
    label: "the queue",
    icon: GridIcon,
  },
  {
    path: "/no-skips",
    label: "no skips",
    icon: HeartIcon,
  },
  {
    path: "/list",
    label: "the list",
    icon: LayoutListIcon,
  },
];

export function NavBar() {
  const [location] = useLocation();

  return (
    <div className="nav-bar">
      {navItems.map((item) => {
        const isActive = location === item.path;
        const statusClass = isActive ? "active" : "inactive";

        return (
          <Link key={item.path} href={item.path}>
            <a className={`nav-item ${statusClass}`}>
              <div className="h-6 flex justify-center items-center">
                <item.icon className="w-5 h-5" />
              </div>
              <span>{item.label}</span>
            </a>
          </Link>
        );
      })}
    </div>
  );
}
