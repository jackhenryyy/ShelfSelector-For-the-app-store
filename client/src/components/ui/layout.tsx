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
        <BlurredBackground imageUrl={backgroundImage} />
      )}
      
      <div className="absolute top-0 right-0 p-1 sm:p-2 z-10">
        {user && (
          <button 
            onClick={() => logoutMutation.mutate()}
            className="text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 text-black/80 hover:text-black"
          >
            <span>logout</span>
            <LogOut className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>
        )}
      </div>
      
      {(title || subtitle) && (
        <div className="p-2 sm:p-4 pb-0">
          {title && <h1 className="text-base sm:text-lg font-medium mb-1 text-black">{title}</h1>}
          {subtitle && <p className="text-[10px] sm:text-xs text-black/60 mb-2 sm:mb-4">{subtitle}</p>}
        </div>
      )}
      
      <div className={`pb-12 ${className}`}>
        {children}
      </div>
      
      {!hideNav && <NavBar />}
    </div>
  );
}
