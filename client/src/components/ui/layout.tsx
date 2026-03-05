import { ReactNode, useState } from "react";
import { NavBar } from "./nav-bar";
import { BlurredBackground } from "./blurred-background";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, LogOut, Trash2, Unplug, Music } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

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
  const { logoutMutation, deleteAccountMutation, user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  const hasSpotify = !!user?.accessToken;

  const canDelete = deleteConfirmText === "DELETE";

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-[10px] sm:text-xs flex items-center gap-1 text-black/70 hover:text-black"
              >
                <span>Account</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasSpotify ? (
                <DropdownMenuItem
                  disabled={disconnecting}
                  onSelect={async () => {
                    setDisconnecting(true);
                    try {
                      await fetch("/api/spotify/disconnect", { method: "DELETE", credentials: "include" });
                      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/spotify/playlists"] });
                    } finally {
                      setDisconnecting(false);
                    }
                  }}
                >
                  <Unplug className="w-4 h-4" />
                  <span>{disconnecting ? "Disconnecting..." : "Disconnect Spotify"}</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => {
                    window.location.href = "/api/spotify/auth";
                  }}
                >
                  <Music className="w-4 h-4" />
                  <span>Connect Spotify</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => {
                  logoutMutation.mutate(undefined, {
                    onSuccess: () => setLocation("/auth"),
                  });
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all saved data. Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder="Type DELETE"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || deleteAccountMutation.isPending}
              onClick={() => {
                deleteAccountMutation.mutate(undefined, {
                  onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setDeleteConfirmText("");
                    setLocation("/auth");
                  },
                });
              }}
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <div
        className={`relative z-10 h-full pb-14 overflow-hidden ${className}`}
        style={!(title || subtitle) ? { paddingTop: "calc(env(safe-area-inset-top) + 8px)" } : undefined}
      >
        {children}
      </div>

      {!hideNav && <NavBar />}
    </div>
  );
}
