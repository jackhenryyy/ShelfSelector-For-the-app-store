import { useState } from "react";
import { useListShare } from "@/hooks/use-list-share";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, RefreshCw, Trash2, Code, Link } from "lucide-react";

export function ListShareDialog() {
  const { toast } = useToast();
  const {
    shareToken,
    isLoading,
    createShareToken,
    deleteShareToken,
    isCreating,
    isDeleting,
    getShareUrl,
    getEmbedCode,
  } = useListShare();

  const [showEmbed, setShowEmbed] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCopyUrl = () => {
    const url = getShareUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({ description: "Link copied to clipboard" });
    }
  };

  const handleCopyEmbed = () => {
    const code = getEmbedCode();
    if (code) {
      navigator.clipboard.writeText(code);
      toast({ description: "Embed code copied to clipboard" });
    }
  };

  const handleCreate = () => {
    createShareToken();
  };

  const handleRegenerate = () => {
    createShareToken();
    toast({ description: "Share link regenerated" });
  };

  const handleDelete = () => {
    deleteShareToken();
    toast({ description: "Share link revoked" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
          data-testid="button-share-list"
        >
          <Share2 className="h-4 w-4" />
          share
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">share your list</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-center font-mono text-sm">Loading...</div>
        ) : shareToken ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmbed(false)}
                className={`flex-1 py-2 px-3 font-mono text-sm flex items-center justify-center gap-2 ${
                  !showEmbed ? "bg-black text-white" : "bg-gray-100"
                }`}
                data-testid="button-show-link"
              >
                <Link className="h-4 w-4" />
                link
              </button>
              <button
                onClick={() => setShowEmbed(true)}
                className={`flex-1 py-2 px-3 font-mono text-sm flex items-center justify-center gap-2 ${
                  showEmbed ? "bg-black text-white" : "bg-gray-100"
                }`}
                data-testid="button-show-embed"
              >
                <Code className="h-4 w-4" />
                embed
              </button>
            </div>

            {!showEmbed ? (
              <div className="space-y-2">
                <p className="font-mono text-xs text-black/60">
                  Share this link so others can view your list:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl() || ""}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm bg-gray-50"
                    data-testid="input-share-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                    data-testid="button-copy-url"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-mono text-xs text-black/60">
                  Add this code to your website to embed your list:
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={getEmbedCode() || ""}
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded font-mono text-xs bg-gray-50 resize-none"
                    data-testid="textarea-embed-code"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleCopyEmbed}
                    data-testid="button-copy-embed"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={handleRegenerate}
                disabled={isCreating}
                className="flex-1 py-2 px-3 border border-black font-mono text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="button-regenerate"
              >
                <RefreshCw className="h-4 w-4" />
                regenerate
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 border border-red-600 text-red-600 font-mono text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="button-revoke"
              >
                <Trash2 className="h-4 w-4" />
                revoke
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-mono text-sm text-black/60">
              Create a shareable link so others can view your album reviews.
            </p>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full py-2 px-4 bg-black text-white font-mono text-sm disabled:opacity-50"
              data-testid="button-create-share"
            >
              {isCreating ? "creating..." : "create share link"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
