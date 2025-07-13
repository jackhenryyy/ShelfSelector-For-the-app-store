import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Album } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAlbumGenre() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateGenreMutation = useMutation({
    mutationFn: async ({ albumId, genre }: { albumId: number; genre: string | null }) => {
      console.log('Updating genre for album', albumId, 'to:', genre);
      const res = await apiRequest("PATCH", `/api/albums/${albumId}/genre`, { genre });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Genre update failed:', res.status, errorText);
        throw new Error(`Failed to update genre: ${res.status} ${errorText}`);
      }
      return await res.json() as Album;
    },
    onSuccess: (album) => {
      console.log('Genre update successful:', album);
      // Invalidate queries that might contain this album
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips/top-four"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      
      toast({
        title: "Success",
        description: `Genre updated to "${album.genre || 'none'}" for "${album.name}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update genre",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    updateGenre: (albumId: number, genre: string | null) => 
      updateGenreMutation.mutate({ albumId, genre }),
    isUpdating: updateGenreMutation.isPending
  };
}