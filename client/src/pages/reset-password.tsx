import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetSchema } from "@shared/schema";
import { z } from "zod";
import { useForgotPassword } from "@/hooks/use-forgot-password";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { RotatingBackground } from "@/components/ui/rotating-background";
import { albumCovers } from "@/lib/album-covers";

type ResetPasswordFormData = z.infer<typeof passwordResetSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { resetPasswordMutation } = useForgotPassword();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data, {
      onSuccess: () => {
        // Redirect to login page after successful reset
        setTimeout(() => {
          setLocation("/auth");
        }, 2000);
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-0">
      <RotatingBackground 
        images={albumCovers}
        interval={5000}
      />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-mono mb-2">the shelf</h1>
          <p className="text-xs sm:text-sm font-mono text-black/60">
            reset your password
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-3 sm:space-y-4 border border-black p-4 sm:p-6 bg-white/90"
        >
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-mono">
              reset token
            </label>
            <input
              {...form.register("token")}
              placeholder="paste your reset token here"
              className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
            />
            {form.formState.errors.token && (
              <p className="text-xs text-red-500">
                {form.formState.errors.token.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-mono">
              new password
            </label>
            <input
              {...form.register("newPassword")}
              type="password"
              className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
            />
            {form.formState.errors.newPassword && (
              <p className="text-xs text-red-500">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-mono">
              confirm new password
            </label>
            <input
              {...form.register("confirmPassword")}
              type="password"
              className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-red-500">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={resetPasswordMutation.isPending}
            className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base bg-[#a6ff96] hover:bg-[#95e588] transition-colors"
          >
            {resetPasswordMutation.isPending ? "resetting..." : "reset password"}
          </button>

          <p className="text-xs text-center text-black/60 font-mono">
            remember your password?{" "}
            <button
              type="button"
              onClick={() => setLocation("/auth")}
              className="underline hover:no-underline"
            >
              back to login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}