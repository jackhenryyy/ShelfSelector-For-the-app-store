import { ReactNode, useState, useEffect, useRef } from "react";
import { NavBar } from "./nav-bar";
import { BlurredBackground } from "./blurred-background";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, LogOut, Trash2, RotateCcw, Ticket } from "lucide-react";
import { TutorialOverlay } from "./tutorial-overlay";
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Auto-start tutorial for new users
  const tutorialCheckedRef = useRef(false);
  useEffect(() => {
    if (user && !user.hasSeenTutorial && !tutorialCheckedRef.current) {
      tutorialCheckedRef.current = true;
      // Delay so the home page renders its elements first
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, [user]);

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
                data-tutorial="account-btn"
                className="text-[10px] sm:text-xs flex items-center gap-1 text-black/70 hover:text-black"
              >
                <span>Account</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={async () => {
                  await fetch("/api/user/tutorial-reset", { method: "PATCH", credentials: "include" });
                  queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                  setShowTutorial(true);
                }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart tutorial</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setInviteDialogOpen(true)}
              >
                <Ticket className="w-4 h-4" />
                <span>Enter invite code</span>
              </DropdownMenuItem>
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

      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) { setInviteCode(""); setInviteStatus(null); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter invite code</DialogTitle>
            <DialogDescription>
              Enter an invite code to unlock additional features.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite code"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {inviteStatus && (
            <p className={`text-sm font-mono ${inviteStatus.includes("unlocked") || inviteStatus.includes("already") ? "text-green-600" : "text-red-600"}`}>
              {inviteStatus}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setInviteDialogOpen(false); setInviteCode(""); setInviteStatus(null); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!inviteCode.trim() || inviteSubmitting}
              onClick={async () => {
                setInviteSubmitting(true);
                setInviteStatus(null);
                try {
                  const res = await fetch("/api/user/redeem-invite-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ code: inviteCode.trim() }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setInviteStatus(data.message);
                    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                  } else {
                    setInviteStatus(data.message || "Invalid code");
                  }
                } catch {
                  setInviteStatus("Something went wrong");
                } finally {
                  setInviteSubmitting(false);
                }
              }}
            >
              {inviteSubmitting ? "Checking..." : "Redeem"}
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

      {showTutorial && (
        <TutorialOverlay
          onComplete={async () => {
            setShowTutorial(false);
            await fetch("/api/user/tutorial-complete", { method: "PATCH", credentials: "include" });
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          }}
        />
      )}
    </div>
  );
}
