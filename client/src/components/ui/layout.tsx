import { ReactNode } from "react";
import { NavBar } from "./nav-bar";
import { StatusBar } from "./status-bar";
import { BlurredBackground } from "./blurred-background";

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
  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {backgroundImage && (
        <BlurredBackground imageUrl={backgroundImage} />
      )}
      
      <StatusBar />
      
      {(title || subtitle) && (
        <div className="p-4 pb-0">
          {title && <h1 className="text-lg font-medium mb-1 text-black">{title}</h1>}
          {subtitle && <p className="text-xs text-black/60 mb-4">{subtitle}</p>}
        </div>
      )}
      
      <div className={`pb-16 ${className}`}>
        {children}
      </div>
      
      {!hideNav && <NavBar />}
    </div>
  );
}
