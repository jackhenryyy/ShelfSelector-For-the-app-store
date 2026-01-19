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
    // FIXED ROOT: prevents the entire document/body from scrolling
    <div className="fixed inset-0 w-full overflow-hidden bg-white">
      {/* Background: must NOT intercept taps */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <BlurredBackground imageUrl={backgroundImage} />
        </div>
      )}

      {/* Logout: fixed, always tappable */}
      {user && (
        <div
          className="fixed z-[1000]"
          style={{
            top: "calc(env(safe-area-inset-top) + 8px)",
            right: "12px"
          }}
        >
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="text-[10px] sm:text-xs flex items-center gap-1 text-black/70 hover:text-black"
          >
            <span>logout</span>
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Optional header (only if provided) */}
      {(title || subtitle) && (
        <div
          className="relative z-10 px-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
        >
          {title && (
            <h1 className="text-base sm:text-lg font-medium text-black">
              {title}
            </h1>
          )}
          {subtitle && <p className="text-[10px] sm:text-xs text-black/60">{subtitle}</p>}
        </div>
      )}

      {/* Content: fill viewport; keep nav space at bottom */}
      <div className={`relative z-10 h-full pb-14 overflow-hidden ${className}`}>
        {children}
      </div>

      {!hideNav && <NavBar />}
    </div>
  );
}
