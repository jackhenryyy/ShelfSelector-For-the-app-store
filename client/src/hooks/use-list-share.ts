import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ListShareToken {
  id: number;
  userId: number;
  token: string;
  createdAt: string;
}

export function useListShare() {
  const { data: shareToken, isLoading } = useQuery<ListShareToken>({
    queryKey: ["/api/list/share"],
    retry: false,
  });

  const createShareToken = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/list/share", { method: "POST" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/list/share"] });
    },
  });

  const deleteShareToken = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/list/share", { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/list/share"] });
    },
  });

  const getShareUrl = () => {
    if (!shareToken) return null;
    return `${window.location.origin}/embed/list/${shareToken.token}`;
  };

  const getEmbedCode = () => {
    const url = getShareUrl();
    if (!url) return null;
    return `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border: 1px solid #e5e5e5; border-radius: 4px;"></iframe>`;
  };

  return {
    shareToken,
    isLoading,
    createShareToken: createShareToken.mutate,
    deleteShareToken: deleteShareToken.mutate,
    isCreating: createShareToken.isPending,
    isDeleting: deleteShareToken.isPending,
    getShareUrl,
    getEmbedCode,
  };
}
