import { ReactNode } from "react";
import { NavBar } from "./nav-bar";
import { BlurredBackground } from "./blurred-background";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  backgroundImage?: string;
  title?: string;
  subtitle?: string;
  hideNav?: boolean;
  className?: string;
}

export function Layout({
  children,
  backgroundImage,
  title,
  subtitle,
  hideNav = false,
  className = ""
}: LayoutProps) {
  const { logoutMutation, user } = useAuth();

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {backgroundImage && (
        <BlurredBackground imageUrl={backgroundImage} intensity="medium" />
      )}
      
      <div className="flex justify-end p-2 relative z-10">
        {user && (
          <button 
            onClick={() => logoutMutation.mutate()}
            className="text-xs flex items-center gap-1 text-black/70 hover:text-black"
          >
            <span>logout</span>
            <LogOut className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {(title || subtitle) && (
        <div className="p-4 pb-0 relative z-10">
          {title && <h1 className="text-lg font-medium mb-1 text-black">{title}</h1>}
          {subtitle && <p className="text-xs text-black/60 mb-4">{subtitle}</p>}
        </div>
      )}
      
      <div className={`pb-16 ${className} relative z-10`}>
        {children}
      </div>
      
      {!hideNav && <NavBar />}
    </div>
  );
}
