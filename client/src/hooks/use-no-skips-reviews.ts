import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NoSkipsReview, InsertNoSkipsReview } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Type for review with album data
export type NoSkipsReviewWithAlbum = NoSkipsReview & {
  album: {
    id: number;
    name: string;
    artist: string;
    imageUrl: string;
    spotifyId: string;
    genre?: string;
    releaseYear?: number;
  };
};

// Get all no skips reviews for the current user
export function useNoSkipsReviews() {
  return useQuery<NoSkipsReviewWithAlbum[]>({
    queryKey: ["/api/no-skips-reviews"],
  });
}

// Get a specific no skips review by album ID
export function useNoSkipsReview(albumId: number) {
  return useQuery<NoSkipsReviewWithAlbum>({
    queryKey: ["/api/no-skips-reviews", albumId],
    enabled: !!albumId,
  });
}

// Create a new no skips review
export function useCreateNoSkipsReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertNoSkipsReview) => {
      return apiRequest(`/api/no-skips-reviews`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips-reviews"] });
    },
  });
}

// Update an existing no skips review
export function useUpdateNoSkipsReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, review }: { id: number; review: string }) => {
      return apiRequest(`/api/no-skips-reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify({ review }),
      });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips-reviews", id] });
    },
  });
}

// Delete a no skips review
export function useDeleteNoSkipsReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/no-skips-reviews/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips-reviews"] });
    },
  });
}