import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { passwordResetSchema } from "@shared/schema";
import { z } from "zod";

type PasswordResetData = z.infer<typeof passwordResetSchema>;

export function usePasswordReset() {
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: PasswordResetData) => {
      const res = await apiRequest("/api/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated successfully",
        description: "Your password has been changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update password",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return { resetPasswordMutation };
}